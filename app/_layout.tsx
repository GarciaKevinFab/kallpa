import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDatabase } from '../src/db/database';
import { useAppStore } from '../src/store/useAppStore';
import { colors } from '../src/theme/colors';

// ---------------------------------------------------------------------------
// Prevent splash screen from auto-hiding until we're ready
// ---------------------------------------------------------------------------
SplashScreen.preventAutoHideAsync();

// ---------------------------------------------------------------------------
// React Query client (stable reference outside component)
// ---------------------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  const isOnboardingComplete = useAppStore((s) => s.isOnboardingComplete);
  const loadFromDB = useAppStore((s) => s.loadFromDB);

  const router = useRouter();
  const segments = useSegments();

  // ── Bootstrap: fonts + database + persisted state ────────────────────
  useEffect(() => {
    async function bootstrap() {
      try {
        // Load custom fonts
        await Font.loadAsync({
          'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
          'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
          'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
          'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
          'PlayfairDisplay-Medium': require('../assets/fonts/PlayfairDisplay-Medium.ttf'),
        });

        // Initialize SQLite database (runs migrations on first launch)
        await getDatabase();

        // Load persisted configuration into Zustand stores
        await loadFromDB();
      } catch (error) {
        console.warn('[RootLayout] Bootstrap error:', error);
      } finally {
        setAppReady(true);
      }
    }

    bootstrap();
  }, [loadFromDB]);

  // ── Hide splash screen once everything is loaded ────────────────────
  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  // ── Redirect based on onboarding state ──────────────────────────────
  useEffect(() => {
    if (!appReady) return;

    const inOnboarding = segments[0] === 'onboarding';

    if (!isOnboardingComplete && !inOnboarding) {
      router.replace('/onboarding/welcome');
    } else if (isOnboardingComplete && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [appReady, isOnboardingComplete, segments, router]);

  // ── Render nothing until bootstrap is done ──────────────────────────
  if (!appReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.root} onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.app },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="onboarding/welcome"
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen name="onboarding/perfil" />
          <Stack.Screen name="onboarding/privacidad" />
          <Stack.Screen
            name="companion"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="timeline" />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.app,
  },
});
