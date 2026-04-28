import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function RootLayout() {
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
      </Stack>
    </>
  );
}
