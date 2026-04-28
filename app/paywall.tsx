import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  isPro,
  listOfferings,
  Offering,
  Plan,
  purchase,
  restore,
  __iapEnabled,
} from '@/lib/entitlement';
import { colors, radius } from '@/theme';

const FEATURES = [
  'Ubegrænset etiket-scanning med AI',
  'Fuld scan-historik (op til 500 produkter)',
  'Allergen- og tilsætningsstof-advarsler',
  'Daglig oversigt over salt, sukker og mættet fedt',
  'Sammenlign to produkter side om side',
  'Eksportér historik som CSV',
];

export default function PaywallScreen() {
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [busy, setBusy] = useState<Plan | 'restore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listOfferings()
      .then((o) => {
        if (active) setOfferings(o);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      active = false;
    };
  }, []);

  const onPurchase = async (plan: Plan) => {
    setBusy(plan);
    setError(null);
    try {
      const ok = await purchase(plan);
      if (ok) router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    setBusy('restore');
    setError(null);
    try {
      const ok = await restore();
      if (ok) router.back();
      else setError('Vi fandt ingen aktive abonnementer på denne konto.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (isPro()) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.alreadyPro}>
          <Text style={styles.proBadge}>FoodProof Pro</Text>
          <Text style={styles.headline}>Du har allerede Pro</Text>
          <Pressable style={styles.cta} onPress={() => router.back()}>
            <Text style={styles.ctaText}>Tilbage</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.proBadge}>FoodProof Pro</Text>
        <Text style={styles.headline}>Ubegrænset adgang til alle funktioner</Text>
        <Text style={styles.sub}>
          Stregkode-scanninger er altid gratis. Pro lader dig fotografere
          enhver etiket og låser op for længere historik og tracking.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.feature}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {!offerings && !error && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {offerings?.map((o) => (
          <Pressable
            key={o.id}
            disabled={!!busy}
            style={({ pressed }) => [
              styles.planCard,
              o.plan === 'annual' && styles.planCardHighlight,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => onPurchase(o.plan)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>
                {o.plan === 'annual' ? 'Årsabonnement' : 'Månedsabonnement'}
              </Text>
              <Text style={styles.planPrice}>{o.priceLabel}</Text>
              {o.plan === 'annual' && (
                <Text style={styles.planNote}>Bedste værdi — spar ca. 43 %</Text>
              )}
            </View>
            {busy === o.plan ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.planArrow}>›</Text>
            )}
          </Pressable>
        ))}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          onPress={onRestore}
          disabled={!!busy}
          style={styles.restore}
        >
          {busy === 'restore' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.restoreText}>Gendan tidligere køb</Text>
          )}
        </Pressable>

        <Text style={styles.legal}>
          Abonnementet fornys automatisk indtil du opsiger det. Du kan opsige
          når som helst i App Store / Play Store.
        </Text>

        {!__iapEnabled && (
          <Text style={styles.devBanner}>
            Dev mode: køb simuleres lokalt. Konfigurér RevenueCat-nøgler i
            app.json for at aktivere rigtige IAP.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, gap: 16, paddingBottom: 32 },
  alreadyPro: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  proBadge: {
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  features: { gap: 8, marginTop: 8 },
  feature: { flexDirection: 'row', gap: 10 },
  check: { color: colors.green, fontSize: 16, fontWeight: '800' },
  featureText: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 21 },
  loading: { padding: 24, alignItems: 'center' },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardHighlight: { borderColor: colors.primary },
  planName: { fontSize: 16, fontWeight: '700', color: colors.text },
  planPrice: { fontSize: 18, color: colors.text, marginTop: 2 },
  planNote: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: '600' },
  planArrow: { fontSize: 24, color: colors.textMuted },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginTop: 12,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.red, fontSize: 13, textAlign: 'center' },
  restore: { padding: 12, alignItems: 'center' },
  restoreText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  legal: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  devBanner: {
    fontSize: 11,
    color: colors.amber,
    backgroundColor: colors.amberBg,
    padding: 10,
    borderRadius: radius.sm,
    textAlign: 'center',
  },
});
