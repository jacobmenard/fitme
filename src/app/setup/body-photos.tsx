import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthImage, BackButton, Button, ErrorBanner, Screen, StepHeader } from '@/components/ui';
import { useMe, useUserMutation } from '@/hooks/queries';
import { api } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { choosePhotoSource } from '@/lib/choosePhotoSource';
import { photoErrorMessage, pickPhoto } from '@/lib/image';
import { colors, radius, space, type } from '@/theme';

type Side = 'front' | 'back';

export default function BodyPhotosScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit';
  const me = useMe();
  const user = me.data;

  const [consentTicked, setConsentTicked] = useState(false);
  const [busySide, setBusySide] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useUserMutation((v: { side: Side; photo: Parameters<typeof api.uploadBodyPhoto>[1]; consent: boolean }) =>
    api.uploadBodyPhoto(v.side, v.photo, v.consent),
  );

  if (!user) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  const consented = user.photo_consent_at !== null || consentTicked;
  const hasFront = user.body_photos.front !== null;
  const hasBack = user.body_photos.back !== null;

  const addPhoto = async (side: Side) => {
    setError(null);
    if (!consented) {
      setError('Please tick the consent box below before adding photos.');
      return;
    }
    const source = await choosePhotoSource(side === 'front' ? 'Front photo' : 'Back photo');
    if (!source) return;

    try {
      const photo = await pickPhoto(source, side);
      if (!photo) return;
      setBusySide(side);
      await upload.mutateAsync({ side, photo, consent: user.photo_consent_at === null });
    } catch (e) {
      setError(photoErrorMessage(e));
    } finally {
      setBusySide(null);
    }
  };

  const deletePhotos = () =>
    Alert.alert('Delete body photos?', 'Try-on will be locked until you add new photos.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteBodyPhotos();
            await me.refetch();
          } catch (e) {
            setError(errorMessage(e));
          }
        },
      },
    ]);

  const ready = hasFront && hasBack && consented;
  const blockedLabel = !hasFront || !hasBack ? 'Add both photos to continue' : 'Accept photo consent to continue';

  return (
    <Screen
      footer={
        <Button
          label={ready ? (editing ? 'Done' : 'Finish setup') : blockedLabel}
          disabled={!ready || busySide !== null}
          onPress={() => (editing ? router.back() : router.replace('/'))}
        />
      }
    >
      {editing ? <BackButton /> : <StepHeader step={2} total={2} />}

      <View style={{ gap: space.xs }}>
        <Text style={type.title} accessibilityRole="header">
          {editing ? 'Your body photos' : 'Add your body photos'}
        </Text>
        <Text style={type.body}>We need both sides so the try-on matches your shape. They're reused for every try-on.</Text>
      </View>

      <ErrorBanner message={error} />

      <View style={{ flexDirection: 'row', gap: space.md }}>
        {(['front', 'back'] as const).map((side) => {
          const photo = user.body_photos[side];
          const label = side === 'front' ? 'Front' : 'Back';
          return (
            <View key={side} style={{ flex: 1, gap: space.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={photo ? `Retake ${label.toLowerCase()} photo` : `Add ${label.toLowerCase()} photo`}
                onPress={() => addPhoto(side)}
                disabled={busySide !== null}
                style={[styles.slot, photo ? styles.slotFilled : styles.slotEmpty]}
              >
                {busySide === side ? (
                  <ActivityIndicator color={colors.accent} />
                ) : photo ? (
                  <>
                    <AuthImage uri={photo.url} style={StyleSheet.absoluteFill} label={`${label} body photo`} />
                    <View style={styles.badge}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                      <Text style={styles.badgeText}>Added</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.cameraIcon}>
                      <Ionicons name="camera-outline" size={22} color={colors.white} />
                    </View>
                    <Text style={type.label}>Add {label.toLowerCase()} photo</Text>
                    <Text style={type.small}>Camera or gallery</Text>
                  </>
                )}
              </Pressable>
              <Text style={type.label}>{label}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.tips}>
        {['Full body, head to feet, standing straight', 'Fitted clothing, arms slightly away from body', 'Plain background and good light'].map(
          (tip, i) => (
            <View key={tip} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ color: colors.accentText, fontWeight: '700' }}>{i + 1}</Text>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.text }}>{tip}</Text>
            </View>
          ),
        )}
      </View>

      {user.photo_consent_at === null ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consentTicked }}
          onPress={() => setConsentTicked((v) => !v)}
          style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 44 }}
        >
          <View style={[styles.checkbox, consentTicked && styles.checkboxOn]}>
            {consentTicked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.text }}>
            I agree my photos are stored privately and used only to create my try-ons. I can delete them anytime.
          </Text>
        </Pressable>
      ) : null}

      {editing && (hasFront || hasBack) ? (
        <Pressable accessibilityRole="button" onPress={deletePhotos} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 15 }}>Delete my body photos</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  slot: { height: 236, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10, overflow: 'hidden' },
  slotFilled: { backgroundColor: colors.accentTint },
  slotEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#B9B9C4', backgroundColor: colors.field },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  cameraIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  tips: { padding: space.lg, gap: space.sm, backgroundColor: colors.field, borderWidth: 1, borderColor: colors.divider, borderRadius: radius.lg },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
