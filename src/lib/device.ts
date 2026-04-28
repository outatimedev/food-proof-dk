import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'foodproof.deviceId.v1';

let cached: string | null = null;

// Stable per-install identifier used as the quota key when calling the
// vision proxy. Not a user ID — we deliberately don't tie it to an account
// and don't share it with third parties.
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(KEY, fresh);
  cached = fresh;
  return fresh;
}
