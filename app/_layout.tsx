import { Stack, router, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { init as initEntitlement } from '@/lib/entitlement';
import { isOnboardingCompleted } from '@/lib/onboarding';
import { colors } from '@/theme';

export default function RootLayout() {
  const navState = useRootNavigationState();
  const checkedOnboardingRef = useRef(false);

  useEffect(() => {
    initEntitlement().catch(() => {
      // Best-effort; the rest of the app works without IAP.
    });
  }, []);

  useEffect(() => {
    if (!navState?.key || checkedOnboardingRef.current) return;
    checkedOnboardingRef.current = true;
    isOnboardingCompleted().then((done) => {
      if (!done) router.replace('/onboarding');
    });
  }, [navState?.key]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text, fontWeight: '600' },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'FoodProof DK' }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen name="scan" options={{ title: 'Scan' }} />
        <Stack.Screen name="manual" options={{ title: 'Manuel indtastning' }} />
        <Stack.Screen name="result" options={{ title: 'Resultat' }} />
        <Stack.Screen name="history" options={{ title: 'Historik' }} />
        <Stack.Screen name="settings" options={{ title: 'Indstillinger' }} />
        <Stack.Screen
          name="paywall"
          options={{ title: 'FoodProof Pro', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
