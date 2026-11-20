import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ErrorBanner, Screen } from '@/components/ui';
import { useMe } from '@/hooks/queries';
import { api } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatFeetInches } from '@/lib/height';
import { colors, radius, space, type } from '@/theme';

export default function AccountTab() {
  const me = useMe();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = me.data;

  if (!user) return <ActivityIndicator style={{ flex: 1 }} color={colors.accent} />;

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Your profile';
  const photos = user.body_photos.front && user.body_photos.back ? 'Front and back added' : 'Missing';

  const deleteAccount = () =>
    Alert.alert('Delete your account?', 'Your body photos and all try-ons are deleted permanently. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.deleteAccount();
            await signOut();
          } catch (e) {
            setError(errorMessage(e));
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text style={type.title} accessibilityRole="header">
          {name}
        </Text>
        <Text style={type.body}>{user.email}</Text>
      </View>
      <ErrorBanner message={error} />

      <View style={styles.card}>
        <Row
          icon="body-outline"
          title="Details and height"
          detail={user.height_cm ? `${Math.round(user.height_cm)} cm · ${formatFeetInches(user.height_cm)}` : 'Not set'}
          onPress={() => router.push('/setup/profile?mode=edit')}
        />
        <View style={styles.divider} />
        <Row icon="camera-outline" title="Body photos" detail={photos} onPress={() => router.push('/setup/body-photos?mode=edit')} />
      </View>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Button variant="secondary" label="Log out" onPress={() => void signOut()} disabled={busy} />
        <Pressable accessibilityRole="button" onPress={deleteAccount} disabled={busy} style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.danger, fontWeight: '600', fontSize: 15 }}>{busy ? 'Deleting…' : 'Delete account'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Row({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}: ${detail}`} onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.ink} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={type.label}>{title}</Text>
        <Text style={type.small}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.divider, borderRadius: radius.xl, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64 },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 54 },
});
