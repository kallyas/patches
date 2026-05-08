import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { GameColors } from '@/game/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const c = GameColors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.cellBorder,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
