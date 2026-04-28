import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Band } from '@/lib/guidelines';
import { ExtractedLabel, ScoreResult, Verdict } from '@/lib/scoring';
import { colors, radius } from '@/theme';

export default function ResultScreen() {
  const { extracted, score } = useLocalSearchParams<{
    extracted: string;
    score: string;
  }>();

  if (!extracted || !score) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Intet resultat at vise.</Text>
      </SafeAreaView>
    );
  }

  const label = JSON.parse(extracted) as ExtractedLabel;
  const result = JSON.parse(score) as ScoreResult;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <VerdictCard verdict={result.verdict} headline={result.headlineDa} subhead={result.subheadDa} />

        {(label.productName || label.brand) && (
          <View style={styles.productCard}>
            {label.productName && (
              <Text style={styles.productName}>{label.productName}</Text>
            )}
            {label.brand && <Text style={styles.brand}>{label.brand}</Text>}
          </View>
        )}

        <Text style={styles.sectionTitle}>Pr. 100 g</Text>
        <View style={styles.findings}>
          {result.findings.map((f) => (
            <FindingRow key={f.nutrient} band={f.band} title={f.labelDa} value={f.valuePer100g} rationale={f.rationaleDa} />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Reference</Text>
        <View style={styles.refCard}>
          <Text style={styles.refLine}>
            Tærskler følger Sundhedsstyrelsens "De Officielle Kostråd" og Nøglehullets kriterier.
          </Text>
          <Text style={styles.refLine}>
            Salt: lavt &lt; 0,3 g · højt &gt; 1,5 g pr. 100 g.
          </Text>
          <Text style={styles.refLine}>
            Sukker: lavt &lt; 5 g · højt &gt; 22,5 g pr. 100 g.
          </Text>
          <Text style={styles.refLine}>
            Mættet fedt: lavt &lt; 1,5 g · højt &gt; 5 g pr. 100 g.
          </Text>
          <Text style={styles.refLine}>
            Kostfibre: ≥ 6 g pr. 100 g opfylder Nøglehullets fuldkornskriterium.
          </Text>
        </View>

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

function FindingRow({
  band,
  title,
  value,
  rationale,
}: {
  band: Band;
  title: string;
  value: number | null;
  rationale: string;
}) {
  const palette = bandPalette(band);
  return (
    <View style={[styles.finding, { backgroundColor: palette.bg }]}>
      <View style={[styles.bandDot, { backgroundColor: palette.fg }]} />
      <View style={styles.findingBody}>
        <View style={styles.findingHeader}>
          <Text style={styles.findingTitle}>{title}</Text>
          <Text style={[styles.findingValue, { color: palette.fg }]}>
            {value === null ? '–' : `${value.toFixed(2)} g`}
          </Text>
        </View>
        <Text style={styles.findingRationale}>{rationale}</Text>
      </View>
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
  },
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
  bandDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
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
  refLine: { fontSize: 13, color: colors.text, lineHeight: 19 },
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
