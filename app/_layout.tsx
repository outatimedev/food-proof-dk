import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { init as initEntitlement } from '@/lib/entitlement';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    initEntitlement().catch(() => {
      // Best-effort; the rest of the app works without IAP.
    });
  }, []);

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
        <Stack.Screen name="scan" options={{ title: 'Scan' }} />
        <Stack.Screen name="manual" options={{ title: 'Manuel indtastning' }} />
        <Stack.Screen name="result" options={{ title: 'Resultat' }} />
        <Stack.Screen name="history" options={{ title: 'Historik' }} />
        <Stack.Screen
          name="paywall"
          options={{ title: 'FoodProof Pro', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
