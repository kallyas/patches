import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { BrandedSplash } from '@/components/BrandedSplash';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep the native splash up until the JS layer is ready to take over.
// Failure here is non-fatal — the worst case is the splash auto-hides.
SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Hand off from the native splash to the in-app branded splash on the
    // next tick so the JS tree mounts first (avoids a white frame).
    const id = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="game"
            options={{
              title: 'Patches',
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="about"
            options={{
              title: 'About',
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="tutorial"
            options={{
              title: 'How to play',
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />
        </Stack>
        <StatusBar style="auto" />
        {!splashDone ? (
          <BrandedSplash
            scheme={(colorScheme ?? 'light') as 'light' | 'dark'}
            onDone={() => setSplashDone(true)}
          />
        ) : null}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
