import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthImage, BackButton, Button, ErrorBanner, Screen, Segmented } from '@/components/ui';
import { useTryOn, useTryOnAction } from '@/hooks/queries';
import { api } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { TryOn } from '@/lib/api/schemas';
import { colors, radius, space, type } from '@/theme';

export default function TryOnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useTryOn(id);

  if (query.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;
  if (query.isError || !query.data) {
    return (
      <Screen>
        <BackButton />
        <ErrorBanner message={errorMessage(query.error)} />
        <Button label="Try again" variant="secondary" onPress={() => query.refetch()} />
      </Screen>
    );
  }

  const tryOn = query.data;
  if (tryOn.status === 'pending' || tryOn.status === 'processing') return <Generating tryOn={tryOn} />;
  if (tryOn.status === 'failed') return <Failed tryOn={tryOn} />;
  return <Result tryOn={tryOn} />;
}

/** Screen 5. Polling (useTryOn) moves to the result automatically when the server finishes. */
function Generating({ tryOn }: { tryOn: TryOn }) {
  const steps = [
    'Checking your photos',
    'Reading the garment',
    `Fitting it to your height (${Math.round(tryOn.height_cm)} cm)`,
    'Rendering your try-on',
  ];
  return (
    <Screen dark>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Text style={{ color: colors.darkMuted, fontSize: 15, fontWeight: '500' }}>Close</Text>
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <ActivityIndicator size="large" color="#8B73FF" />
        <View accessibilityRole="summary" accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: space.sm }}>
          <Text style={{ color: colors.white, fontSize: 26, fontWeight: '700' }}>Creating your try-on</Text>
          <Text style={{ color: colors.darkMuted, fontSize: 15, textAlign: 'center', lineHeight: 21 }}>
            This can take a minute. You can close this screen; it'll be in History when it's ready.
          </Text>
        </View>
        <View style={styles.steps}>
          {steps.map((s) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B73FF' }} />
              <Text style={{ color: colors.white, fontSize: 15 }}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function Failed({ tryOn }: { tryOn: TryOn }) {
  const regenerate = useTryOnAction(api.regenerateTryOn);
  const photoProblem = tryOn.error_message?.toLowerCase().includes('photo') ?? false;

  return (
    <Screen
      footer={
        <>
          {tryOn.can_regenerate ? (
            <Button label="Try again" onPress={() => regenerate.mutate(tryOn.id)} loading={regenerate.isPending} />
          ) : null}
          {photoProblem ? (
            <Button variant="secondary" label="Update body photos" onPress={() => router.push('/setup/body-photos?mode=edit')} />
          ) : null}
          <Button variant="secondary" label="Upload a different garment" onPress={() => router.replace('/')} />
        </>
      }
    >
      <BackButton />
      <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xl }}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
        <Text style={type.title}>Couldn't create this try-on</Text>
        <Text style={[type.body, { textAlign: 'center' }]}>{tryOn.error_message ?? 'Please try again.'}</Text>
      </View>
      <ErrorBanner message={regenerate.error ? errorMessage(regenerate.error) : null} />
    </Screen>
  );
}

/** Screen 6. */
function Result({ tryOn }: { tryOn: TryOn }) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const save = useTryOnAction(api.saveTryOn);
  const regenerate = useTryOnAction(api.regenerateTryOn);
  const hasBack = tryOn.images.back !== null;
  const uri = view === 'back' && tryOn.images.back ? tryOn.images.back : tryOn.images.front;

  const confirmDelete = () =>
    Alert.alert('Delete this try-on?', 'The picture will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTryOn(tryOn.id);
            router.back();
          } catch (e) {
            Alert.alert('Could not delete', errorMessage(e));
          }
        },
      },
    ]);

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button style={{ flex: 1 }} variant="secondary" label="Try another" onPress={() => router.replace('/')} />
          <Button
            style={{ flex: 1 }}
            label={tryOn.saved ? 'Saved' : 'Save to history'}
            disabled={tryOn.saved}
            loading={save.isPending}
            onPress={() => save.mutate(tryOn.id)}
          />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton />
        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink }} accessibilityRole="header">
          Your try-on
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete try-on" onPress={confirmDelete} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <View style={styles.imageBox}>
        {uri ? (
          <AuthImage
            uri={uri}
            style={StyleSheet.absoluteFill}
            label={`AI preview of you wearing the ${tryOn.garment_type}, ${view} view`}
          />
        ) : null}
        {hasBack ? (
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <Segmented
              label="View"
              options={[
                { value: 'front', label: 'Front' },
                { value: 'back', label: 'Back' },
              ]}
              value={view}
              onChange={setView}
            />
          </View>
        ) : null}
        <View style={styles.aiTag}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>AI preview</Text>
        </View>
      </View>

      <View style={styles.fitCard}>
        <Text style={[type.label, { fontSize: 15 }]}>How it falls on you</Text>
        <View style={{ flexDirection: 'row' }}>
          <Fact label="Your height" value={`${Math.round(tryOn.height_cm)} cm`} />
          <Fact label="Garment" value={tryOn.garment_length_cm ? `${Math.round(tryOn.garment_length_cm)} cm` : '—'} />
          <Fact label="Hem lands" value={tryOn.hem_position ?? '—'} accent />
        </View>
      </View>
      <Text style={{ fontSize: 12, lineHeight: 17, color: colors.muted }}>
        Fit and length are estimates from your height and the garment length
        {tryOn.garment_length_cm ? '' : ' (estimated from the photo)'}.
      </Text>

      {tryOn.can_regenerate ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => regenerate.mutate(tryOn.id)}
          disabled={regenerate.isPending}
          style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'center' }}
        >
          <Text style={{ color: colors.accentText, fontWeight: '600', fontSize: 15 }}>
            {regenerate.isPending ? 'Starting…' : 'Not right? Generate again'}
          </Text>
        </Pressable>
      ) : null}
      <ErrorBanner message={save.error ? errorMessage(save.error) : regenerate.error ? errorMessage(regenerate.error) : null} />
    </Screen>
  );
}

function Fact({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, gap: 2, paddingRight: space.sm }}>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: accent ? colors.accentText : colors.ink }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { width: '100%', padding: 18, gap: 14, backgroundColor: colors.darkRaised, borderRadius: 18 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  imageBox: { aspectRatio: 2 / 3, borderRadius: 22, backgroundColor: colors.accentTint, overflow: 'hidden' },
  aiTag: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fitCard: { borderWidth: 1, borderColor: colors.divider, borderRadius: 18, padding: space.lg, gap: 10 },
});
