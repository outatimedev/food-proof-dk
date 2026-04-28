import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ScoreResult } from './types';

const STORAGE_KEY = 'foodproof.history.v1';
// Hard cap on stored items so AsyncStorage doesn't grow unbounded. Free tier
// will have a smaller visible window applied in the UI; this is the absolute
// ceiling.
const MAX_ITEMS = 500;

export interface HistoryEntry {
  id: string;
  scannedAtISO: string;
  product: Product;
  score: ScoreResult;
}

function newId(): string {
  // Date prefix sorts lexicographically by recency; suffix avoids collisions
  // when the user fires multiple scans within the same millisecond (rare but
  // possible during testing / restored state).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function listHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendHistory(
  product: Product,
  score: ScoreResult,
): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: newId(),
    scannedAtISO: new Date().toISOString(),
    product,
    score,
  };
  const current = await listHistory();
  const next = [entry, ...current].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return entry;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function getEntry(id: string): Promise<HistoryEntry | null> {
  const all = await listHistory();
  return all.find((e) => e.id === id) ?? null;
}

// Idempotency: if the same barcode appears within `dedupWindowMinutes`,
// skip writing a new entry. Keeps history readable when the user re-scans
// while comparing.
export async function appendHistoryDeduped(
  product: Product,
  score: ScoreResult,
  dedupWindowMinutes = 5,
): Promise<HistoryEntry> {
  const current = await listHistory();
  const cutoff = Date.now() - dedupWindowMinutes * 60_000;

  const dupKey = product.source.kind === 'open_food_facts' ? product.source.barcode : null;
  if (dupKey) {
    const recent = current.find(
      (e) =>
        e.product.source.kind === 'open_food_facts' &&
        e.product.source.barcode === dupKey &&
        new Date(e.scannedAtISO).getTime() > cutoff,
    );
    if (recent) return recent;
  }

  return appendHistory(product, score);
}
