// Daily vision-OCR quota for the free tier. Vision is the only path that
// costs us per scan (Open Food Facts is free), so it's the only one we
// meter. The quota is local — it can be reset by reinstalling the app —
// but the real gate is RevenueCat: free users hit the cap, see the
// paywall, and only Pro unlocks unlimited.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'foodproof.quota.v1';

export const FREE_DAILY_VISION_SCANS = 3;
export const FREE_HISTORY_DAYS = 14;

interface QuotaState {
  // ISO date (YYYY-MM-DD), Europe/Copenhagen day boundary
  date: string;
  visionScans: number;
}

function copenhagenDate(d = new Date()): string {
  // Europe/Copenhagen is UTC+1 / UTC+2 with DST. We don't ship a TZ library
  // for one date string — Intl with a forced timeZone gives us the right
  // local-day boundary on every platform.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(d);
}

async function readState(): Promise<QuotaState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const today = copenhagenDate();
  if (!raw) return { date: today, visionScans: 0 };
  try {
    const parsed = JSON.parse(raw) as QuotaState;
    if (parsed.date !== today) return { date: today, visionScans: 0 };
    return parsed;
  } catch {
    return { date: today, visionScans: 0 };
  }
}

async function writeState(state: QuotaState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function getVisionUsage(): Promise<{ used: number; remaining: number }> {
  const s = await readState();
  return {
    used: s.visionScans,
    remaining: Math.max(0, FREE_DAILY_VISION_SCANS - s.visionScans),
  };
}

export async function canUseVision(isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  const { remaining } = await getVisionUsage();
  return remaining > 0;
}

// Called *after* a successful vision call. Charging on success keeps the
// metering honest — failed network calls don't burn the user's quota.
export async function chargeVision(isPro: boolean): Promise<void> {
  if (isPro) return;
  const s = await readState();
  s.visionScans += 1;
  await writeState(s);
}
