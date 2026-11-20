import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.divider },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Try on', tabBarIcon: ({ color, size }) => <Ionicons name="shirt-outline" color={String(color)} size={size} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={String(color)} size={size} /> }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={String(color)} size={size} /> }}
      />
    </Tabs>
  );
}
