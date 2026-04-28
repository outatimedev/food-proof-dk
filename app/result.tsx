import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rules } from '@/lib/rules';
import { Band, Product, ScoreResult, Verdict } from '@/lib/types';
import { colors, radius } from '@/theme';

export default function ResultScreen() {
  const params = useLocalSearchParams<{ product: string; score: string }>();

  const data = useMemo(() => {
    if (!params.product || !params.score) return null;
    try {
      return {
        product: JSON.parse(params.product) as Product,
        score: JSON.parse(params.score) as ScoreResult,
      };
    } catch {
      return null;
    }
  }, [params.product, params.score]);

  if (!data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Intet resultat at vise.</Text>
      </SafeAreaView>
    );
  }

  const { product, score } = data;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <VerdictCard verdict={score.verdict} headline={score.headlineDa} subhead={score.subheadDa} />

        <ProductCard product={product} />

        <Text style={styles.sectionTitle}>
          {score.basis === 'per_100ml' ? 'Pr. 100 ml' : 'Pr. 100 g'}
        </Text>
        <View style={styles.findings}>
          {score.findings.map((f) => (
            <FindingRow
              key={f.nutrient}
              band={f.band}
              title={f.labelDa}
              value={f.value}
              rationale={f.rationaleDa}
              basis={score.basis}
            />
          ))}
        </View>

        <SourceCard product={product} score={score} />

        <Link href="/scan" replace asChild>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Scan en til</Text>
          </Pressable>
        </Link>
        <Link href="/" replace asChild>
          <Pressable style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Til forsiden</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </SafeAreaView>
  );
}

function VerdictCard({
  verdict,
  headline,
  subhead,
}: {
  verdict: Verdict;
  headline: string;
  subhead: string;
}) {
  const palette = verdictPalette(verdict);
  return (
    <View style={[styles.verdictCard, { backgroundColor: palette.bg }]}>
      <Text style={[styles.verdictIcon, { color: palette.fg }]}>
        {verdict === 'proof' ? '✓' : verdict === 'warning' ? '!' : verdict === 'unknown' ? '?' : '·'}
      </Text>
      <Text style={[styles.verdictHeadline, { color: palette.fg }]}>{headline}</Text>
      <Text style={[styles.verdictSubhead, { color: palette.fg }]}>{subhead}</Text>
    </View>
  );
}

function ProductCard({ product }: { product: Product }) {
  const hasMeta = product.productName || product.brand || product.imageUrl;
  if (!hasMeta) return null;
  return (
    <View style={styles.productCard}>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
      ) : null}
      <View style={styles.productMeta}>
        {product.productName && <Text style={styles.productName}>{product.productName}</Text>}
        {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
      </View>
    </View>
  );
}

function FindingRow({
  band,
  title,
  value,
  rationale,
  basis,
}: {
  band: Band;
  title: string;
  value: number | null;
  rationale: string;
  basis: 'per_100g' | 'per_100ml';
}) {
  const palette = bandPalette(band);
  const unitLabel = basis === 'per_100ml' ? 'g/100ml' : 'g/100g';
  return (
    <View style={[styles.finding, { backgroundColor: palette.bg }]}>
      <View style={[styles.bandDot, { backgroundColor: palette.fg }]} />
      <View style={styles.findingBody}>
        <View style={styles.findingHeader}>
          <Text style={styles.findingTitle}>{title}</Text>
          <Text style={[styles.findingValue, { color: palette.fg }]}>
            {value === null ? '–' : `${value.toFixed(2)} ${unitLabel}`}
          </Text>
        </View>
        <Text style={styles.findingRationale}>{rationale}</Text>
      </View>
    </View>
  );
}

function SourceCard({ product, score }: { product: Product; score: ScoreResult }) {
  const dataLine = (() => {
    switch (product.source.kind) {
      case 'open_food_facts': {
        const date = new Date(product.source.lastModifiedISO).toLocaleDateString('da-DK');
        return `Næringsdata: Open Food Facts (sidst opdateret ${date}).`;
      }
      case 'vision_ocr':
        return `Næringsdata: aflæst fra dit billede med Claude (${product.source.model}). Dobbelttjek selv etiketten.`;
      case 'manual':
        return 'Næringsdata: indtastet manuelt.';
    }
  })();

  return (
    <View style={styles.refCard}>
      <Text style={styles.refTitle}>Hvor kommer vurderingen fra?</Text>
      <Text style={styles.refLine}>{dataLine}</Text>
      <Text style={styles.refLine}>
        Tærskler: regler v{score.appliedRulesVersion} ({score.appliedCategory === 'beverage' ? 'drikkevarer' : 'fødevarer'}, {score.basis === 'per_100ml' ? 'pr. 100 ml' : 'pr. 100 g'}).
      </Text>
      {rules.sources.map((s) => (
        <Text key={s.url} style={styles.refLine}>
          · {s.name}
        </Text>
      ))}
      <Text style={styles.disclaimer}>
        Vejledende. Erstatter ikke individuelle kostråd fra sundhedsfaglige personer.
      </Text>
    </View>
  );
}

function verdictPalette(v: Verdict): { fg: string; bg: string } {
  switch (v) {
    case 'proof':
      return { fg: colors.green, bg: colors.greenBg };
    case 'warning':
      return { fg: colors.red, bg: colors.redBg };
    case 'moderate':
      return { fg: colors.amber, bg: colors.amberBg };
    case 'unknown':
      return { fg: colors.textMuted, bg: colors.surface };
  }
}

function bandPalette(b: Band): { fg: string; bg: string } {
  switch (b) {
    case 'green':
      return { fg: colors.green, bg: colors.greenBg };
    case 'amber':
      return { fg: colors.amber, bg: colors.amberBg };
    case 'red':
      return { fg: colors.red, bg: colors.redBg };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  muted: { color: colors.textMuted },
  scroll: { padding: 20, paddingBottom: 32, gap: 16 },
  verdictCard: {
    borderRadius: radius.lg,
    padding: 24,
    gap: 6,
  },
  verdictIcon: { fontSize: 36, fontWeight: '800' },
  verdictHeadline: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  verdictSubhead: { fontSize: 15, lineHeight: 21 },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  productMeta: { flex: 1 },
  productName: { fontSize: 18, fontWeight: '700', color: colors.text },
  brand: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  findings: { gap: 8 },
  finding: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
  },
  bandDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
  findingBody: { flex: 1, gap: 4 },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  findingTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  findingValue: { fontSize: 16, fontWeight: '700' },
  findingRationale: { fontSize: 13, color: colors.text, lineHeight: 18 },
  refCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    gap: 6,
  },
  refTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  refLine: { fontSize: 12, color: colors.text, lineHeight: 17 },
  disclaimer: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
