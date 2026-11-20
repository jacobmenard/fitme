import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorBanner, Screen, TextField } from '@/components/ui';
import { useMe } from '@/hooks/queries';
import type { FileUpload } from '@/lib/api/client';
import { api } from '@/lib/api/endpoints';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { garmentTypes, type GarmentType, type User } from '@/lib/api/schemas';
import { choosePhotoSource } from '@/lib/choosePhotoSource';
import { photoErrorMessage, pickPhoto } from '@/lib/image';
import { queryKeys } from '@/lib/queryKeys';
import { colors, radius, space, type } from '@/theme';

const TYPE_LABELS: Record<GarmentType, string> = { dress: 'Dress', top: 'Top', skirt: 'Skirt', pants: 'Pants', jacket: 'Jacket' };

export default function TryOnTab() {
  const me = useMe();

  if (me.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;
  if (me.isError || !me.data) {
    return (
      <Screen>
        <Text style={type.title}>Try on</Text>
        <ErrorBanner message={errorMessage(me.error)} />
        <Button label="Try again" variant="secondary" onPress={() => me.refetch()} />
      </Screen>
    );
  }

  return me.data.setup.can_try_on ? <GarmentForm user={me.data} /> : <LockedState user={me.data} />;
}

/** Screen 4a: garment upload stays locked until height + both photos + consent exist. */
function LockedState({ user }: { user: User }) {
  const missing = user.setup.missing;
  const rows = [
    { label: 'Name, age and height', done: !missing.includes('profile') },
    { label: 'Front and back photos', done: !missing.includes('front_photo') && !missing.includes('back_photo') },
    { label: 'Photo consent', done: !missing.includes('photo_consent') },
  ];
  const nextHref = missing.includes('profile') ? '/setup/profile' : '/setup/body-photos';

  return (
    <Screen>
      <Text style={type.title} accessibilityRole="header">
        Try on
      </Text>
      <View style={styles.lockCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={styles.lockIcon}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.white} />
          </View>
          <Text style={{ flex: 1, color: colors.white, fontSize: 17, fontWeight: '600' }}>Finish setup to start trying on</Text>
        </View>
        {rows.map((r) => (
          <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={r.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={r.done ? colors.successBright : '#8C8C98'} />
            <Text style={{ flex: 1, color: colors.white, fontSize: 15 }}>{r.label}</Text>
            <Text style={{ fontSize: 13, color: r.done ? '#A9A9B4' : colors.warning, fontWeight: r.done ? '400' : '600' }}>
              {r.done ? 'Done' : 'Needed'}
            </Text>
          </View>
        ))}
        <Button variant="light" label="Continue setup" onPress={() => router.push(nextHref)} />
      </View>
      <View style={styles.lockedDrop} accessibilityState={{ disabled: true }}>
        <Ionicons name="shirt-outline" size={24} color="#6E6E78" />
        <Text style={[type.label, { color: colors.muted }]}>Upload a garment</Text>
        <Text style={[type.small, { textAlign: 'center', maxWidth: 240 }]}>Unlocks after your height and both body photos are saved.</Text>
      </View>
    </Screen>
  );
}

/** Screen 4b: a new garment every time (garments are not reused). */
function GarmentForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const [garment, setGarment] = useState<FileUpload | null>(null);
  const [garmentType, setGarmentType] = useState<GarmentType>('dress');
  const [length, setLength] = useState('');
  const [pickError, setPickError] = useState<string | null>(null);

  const lengthNum = length.trim() === '' ? null : Number(length);
  const lengthValid = lengthNum === null || (Number.isFinite(lengthNum) && lengthNum >= 10 && lengthNum <= 200);

  const create = useMutation({
    mutationFn: () => {
      if (!garment) throw new Error('Choose a garment photo first.');
      return api.createTryOn({ garment, garment_type: garmentType, garment_length_cm: lengthNum });
    },
    onSuccess: (tryOn) => {
      queryClient.setQueryData(queryKeys.tryOn(tryOn.id), tryOn);
      setGarment(null);
      setLength('');
      router.push({ pathname: '/try-on/[id]', params: { id: tryOn.id } });
    },
    onError: (e) => {
      // Server says setup is no longer complete (e.g. photos deleted on another device).
      if (e instanceof ApiError && e.code === 'setup_incomplete') void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });

  const choose = async () => {
    setPickError(null);
    const source = await choosePhotoSource('Garment photo');
    if (!source) return;
    try {
      const picked = await pickPhoto(source, 'garment');
      if (picked) setGarment(picked);
    } catch (e) {
      setPickError(photoErrorMessage(e));
    }
  };

  const fieldErrors = create.error instanceof ApiError ? create.error.fieldErrors : {};
  const lengthHint = garmentType === 'skirt' || garmentType === 'pants' ? 'Waist to hem' : 'Shoulder to hem';

  return (
    <Screen
      footer={
        <Button
          label="Generate"
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!garment || !lengthValid}
          accessibilityHint="Creates a picture of you wearing this garment"
        />
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={type.title} accessibilityRole="header">
          Try on
        </Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/setup/profile?mode=edit')} style={styles.chip}>
          <Text style={{ color: '#2B1FA3', fontSize: 13, fontWeight: '600' }}>{Math.round(user.height_cm ?? 0)} cm · photos ready</Text>
        </Pressable>
      </View>

      <ErrorBanner message={pickError ?? (create.error && !fieldErrors.garment_length_cm ? errorMessage(create.error) : null)} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={garment ? 'Replace garment photo' : 'Upload a garment photo'}
        onPress={choose}
        style={[styles.drop, garment ? { borderWidth: 0 } : null]}
      >
        {garment ? (
          <>
            <Image source={{ uri: garment.uri }} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel="Selected garment" />
            <View style={styles.replace}>
              <Ionicons name="refresh" size={18} color={colors.ink} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.uploadIcon}>
              <Ionicons name="shirt-outline" size={22} color={colors.white} />
            </View>
            <Text style={type.label}>Upload a garment</Text>
            <Text style={type.small}>Camera or gallery · one garment per try-on</Text>
          </>
        )}
      </Pressable>

      <View style={{ gap: space.sm }}>
        <Text style={type.label}>Garment type</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {garmentTypes.map((t) => {
            const on = t === garmentType;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setGarmentType(t)}
                style={[styles.typeChip, on && styles.typeChipOn]}
              >
                <Text style={{ fontSize: 14, fontWeight: on ? '600' : '500', color: on ? colors.white : colors.text }}>{TYPE_LABELS[t]}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: space.xs }}>
        <TextField
          label="Garment length"
          optional
          value={length}
          onChangeText={(t) => setLength(t.replace(/[^0-9.]/g, ''))}
          placeholder="e.g. 110"
          keyboardType="decimal-pad"
          suffix="cm"
          error={!lengthValid ? 'Enter a length between 10 and 200 cm.' : fieldErrors.garment_length_cm}
        />
        <Text style={type.small}>{lengthHint}, from the size chart. Helps place the hemline for your height.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lockCard: { borderRadius: radius.xl, backgroundColor: colors.dark, padding: 20, gap: space.lg },
  lockIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#2C2C33', alignItems: 'center', justifyContent: 'center' },
  lockedDrop: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.field,
  },
  chip: { minHeight: 36, justifyContent: 'center', paddingHorizontal: space.md, borderRadius: 999, backgroundColor: colors.accentSoft },
  drop: {
    height: 228,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  uploadIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  replace: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChip: { height: 40, paddingHorizontal: space.lg, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
  typeChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
});
