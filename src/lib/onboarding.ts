import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'foodproof.onboardingCompleted.v1';

export async function isOnboardingCompleted(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEY)) === '1';
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(KEY, '1');
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
