import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthImage, Button, ErrorBanner } from '@/components/ui';
import { useTryOnHistory } from '@/hooks/queries';
import { errorMessage } from '@/lib/api/errors';
import type { TryOn } from '@/lib/api/schemas';
import { colors, radius, space, type } from '@/theme';

export default function HistoryTab() {
  const history = useTryOnHistory(true);
  const items = history.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        numColumns={2}
        columnWrapperStyle={{ gap: space.md }}
        contentContainerStyle={{ padding: space.xl, gap: space.md, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Text style={type.title} accessibilityRole="header">
              History
            </Text>
            {history.isError ? <ErrorBanner message={errorMessage(history.error)} /> : null}
          </View>
        }
        renderItem={({ item }) => <HistoryCard tryOn={item} />}
        ListEmptyComponent={
          history.isPending ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', gap: space.md, marginTop: 60 }}>
              <Text style={[type.label, { fontSize: 16 }]}>No saved try-ons yet</Text>
              <Text style={[type.body, { textAlign: 'center' }]}>Tap "Save to history" on a result to keep it here.</Text>
              <Button label="Try something on" onPress={() => router.navigate('/')} style={{ alignSelf: 'stretch' }} />
            </View>
          )
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => history.hasNextPage && !history.isFetchingNextPage && history.fetchNextPage()}
        ListFooterComponent={history.isFetchingNextPage ? <ActivityIndicator color={colors.accent} /> : undefined}
        refreshControl={<RefreshControl refreshing={history.isRefetching} onRefresh={() => void history.refetch()} />}
      />
    </SafeAreaView>
  );
}

function HistoryCard({ tryOn }: { tryOn: TryOn }) {
  const date = tryOn.completed_at ? new Date(tryOn.completed_at).toLocaleDateString() : '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tryOn.garment_type} try-on${date ? `, ${date}` : ''}`}
      onPress={() => router.push({ pathname: '/try-on/[id]', params: { id: tryOn.id } })}
      style={{ flex: 1, gap: 6, maxWidth: '50%' }}
    >
      <View style={{ aspectRatio: 2 / 3, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.accentTint }}>
        {tryOn.images.front ? <AuthImage uri={tryOn.images.front} style={{ flex: 1 }} label="" /> : null}
      </View>
      <Text style={type.label}>{tryOn.garment_type.charAt(0).toUpperCase() + tryOn.garment_type.slice(1)}</Text>
      <Text style={type.small}>{tryOn.hem_position ?? date}</Text>
    </Pressable>
  );
}
