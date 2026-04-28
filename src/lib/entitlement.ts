// Entitlement plumbing. The product surface is intentionally tiny:
//
//   isPro(): boolean   — synchronous read of cached state
//   refresh()          — re-syncs with RevenueCat, returns isPro
//   purchase(plan)     — runs IAP flow, returns isPro
//   restore()          — restores purchases, returns isPro
//   subscribe(cb)      — fires whenever entitlement changes
//
// In dev, where you typically don't have RevenueCat keys or sandbox
// accounts wired up, we transparently fall back to an in-memory toggle so
// the rest of the app can be built and tested. Flip via setProDev() — the
// settings screen exposes a debug switch.

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const REVENUECAT_IOS_KEY =
  (Constants.expoConfig?.extra?.revenueCatIosKey as string | undefined) ?? '';
const REVENUECAT_ANDROID_KEY =
  (Constants.expoConfig?.extra?.revenueCatAndroidKey as string | undefined) ?? '';

const KEY = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
const IAP_ENABLED = KEY.length > 0 && !__DEV__;

const PRO_ENTITLEMENT = 'pro';
const DEV_PRO_KEY = 'foodproof.dev_pro';

let cachedPro = false;
let cachedRcAppUserId: string | null = null;
const listeners = new Set<(pro: boolean) => void>();

function emit() {
  for (const l of listeners) l(cachedPro);
}

export function subscribe(cb: (pro: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isPro(): boolean {
  return cachedPro;
}

export function getRcAppUserId(): string | null {
  return cachedRcAppUserId;
}

// ---------- Real RevenueCat path ----------

async function realInit(): Promise<void> {
  const Purchases = (await import('react-native-purchases')).default;
  Purchases.configure({ apiKey: KEY });
  Purchases.addCustomerInfoUpdateListener((info) => {
    cachedPro = !!info.entitlements.active[PRO_ENTITLEMENT];
    cachedRcAppUserId = info.originalAppUserId ?? null;
    emit();
  });
  const info = await Purchases.getCustomerInfo();
  cachedPro = !!info.entitlements.active[PRO_ENTITLEMENT];
  cachedRcAppUserId = info.originalAppUserId ?? null;
  emit();
}

async function realRefresh(): Promise<boolean> {
  const Purchases = (await import('react-native-purchases')).default;
  const info = await Purchases.getCustomerInfo();
  cachedPro = !!info.entitlements.active[PRO_ENTITLEMENT];
  emit();
  return cachedPro;
}

async function realRestore(): Promise<boolean> {
  const Purchases = (await import('react-native-purchases')).default;
  const info = await Purchases.restorePurchases();
  cachedPro = !!info.entitlements.active[PRO_ENTITLEMENT];
  emit();
  return cachedPro;
}

export type Plan = 'monthly' | 'annual';

export interface Offering {
  id: string;
  plan: Plan;
  priceLabel: string;
  productId: string;
}

async function realOfferings(): Promise<Offering[]> {
  const Purchases = (await import('react-native-purchases')).default;
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const result: Offering[] = [];
  if (current.monthly) {
    result.push({
      id: current.monthly.identifier,
      plan: 'monthly',
      priceLabel: current.monthly.product.priceString,
      productId: current.monthly.product.identifier,
    });
  }
  if (current.annual) {
    result.push({
      id: current.annual.identifier,
      plan: 'annual',
      priceLabel: current.annual.product.priceString,
      productId: current.annual.product.identifier,
    });
  }
  return result;
}

async function realPurchase(plan: Plan): Promise<boolean> {
  const Purchases = (await import('react-native-purchases')).default;
  const offerings = await Purchases.getOfferings();
  const pkg = plan === 'annual' ? offerings.current?.annual : offerings.current?.monthly;
  if (!pkg) throw new Error('Tilbud ikke tilgængeligt.');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  cachedPro = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
  emit();
  return cachedPro;
}

// ---------- Dev/stub path ----------

async function devInit(): Promise<void> {
  const stored = await AsyncStorage.getItem(DEV_PRO_KEY);
  cachedPro = stored === '1';
  emit();
}

async function devSet(value: boolean): Promise<boolean> {
  cachedPro = value;
  await AsyncStorage.setItem(DEV_PRO_KEY, value ? '1' : '0');
  emit();
  return cachedPro;
}

const DEV_OFFERINGS: Offering[] = [
  { id: 'dev_monthly', plan: 'monthly', priceLabel: '29 DKK / måned', productId: 'foodproof_pro_monthly' },
  { id: 'dev_annual', plan: 'annual', priceLabel: '199 DKK / år', productId: 'foodproof_pro_annual' },
];

// ---------- Public API ----------

export async function init(): Promise<void> {
  if (IAP_ENABLED) await realInit();
  else await devInit();
}

export async function refresh(): Promise<boolean> {
  return IAP_ENABLED ? realRefresh() : cachedPro;
}

export async function restore(): Promise<boolean> {
  return IAP_ENABLED ? realRestore() : cachedPro;
}

export async function listOfferings(): Promise<Offering[]> {
  return IAP_ENABLED ? realOfferings() : DEV_OFFERINGS;
}

export async function purchase(plan: Plan): Promise<boolean> {
  return IAP_ENABLED ? realPurchase(plan) : devSet(true);
}

// Dev-only escape hatch surfaced by the settings screen.
export async function setProDev(value: boolean): Promise<boolean> {
  if (IAP_ENABLED) {
    throw new Error('Pro-status styres af butikkens IAP i denne build.');
  }
  return devSet(value);
}

export const __iapEnabled = IAP_ENABLED;
