import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  isPro,
  restore,
  setProDev,
  subscribe,
  __iapEnabled,
} from '@/lib/entitlement';
import { clearHistory } from '@/lib/history';
import { resetOnboarding } from '@/lib/onboarding';
import { FREE_DAILY_VISION_SCANS, getVisionUsage } from '@/lib/quota';
import { rules } from '@/lib/rules';
import { colors, radius } from '@/theme';

const APP_VERSION = '0.1.0';

export default function SettingsScreen() {
  const [pro, setPro] = useState(isPro());
  const [usage, setUsage] = useState<{ used: number; remaining: number } | null>(null);

  useEffect(() => subscribe(setPro), []);
  useEffect(() => {
    getVisionUsage().then(setUsage);
  }, [pro]);

  const onRestore = async () => {
    try {
      const ok = await restore();
      Alert.alert(ok ? 'Pro aktiveret' : 'Ingen aktive køb', ok ? 'Velkommen tilbage.' : 'Vi fandt intet at gendanne.');
    } catch (e) {
      Alert.alert('Fejl', e instanceof Error ? e.message : String(e));
    }
  };

  const onClearHistory = () => {
    Alert.alert('Slet historik?', 'Alle gemte scans bliver fjernet fra denne enhed.', [
      { text: 'Annullér', style: 'cancel' },
      {
        text: 'Slet',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          Alert.alert('Slettet', 'Historikken er ryddet.');
        },
      },
    ]);
  };

  const onResetOnboarding = async () => {
    await resetOnboarding();
    router.replace('/onboarding');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Abonnement">
          {pro ? (
            <Row title="FoodProof Pro" subtitle="Aktiv" />
          ) : (
            <Link href="/paywall" asChild>
              <Pressable style={styles.upgradeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradeTitle}>Få FoodProof Pro</Text>
                  <Text style={styles.upgradeSub}>Ubegrænset etiket-scanning og fuld historik</Text>
                </View>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            </Link>
          )}
          <PressableRow title="Gendan tidligere køb" onPress={onRestore} />
          {usage && !pro && (
            <Row
              title="Etiket-scanninger i dag"
              subtitle={`${usage.used} af ${FREE_DAILY_VISION_SCANS} brugt`}
            />
          )}
        </Section>

        <Section title="Data">
          <PressableRow title="Ryd scan-historik" destructive onPress={onClearHistory} />
        </Section>

        <Section title="Om vurderingen">
          <Row
            title="Regelversion"
            subtitle={`v${rules.version} (gælder fra ${rules.effectiveFrom})`}
          />
          {rules.sources.map((s) => (
            <PressableRow
              key={s.url}
              title={s.name}
              subtitle={s.url}
              onPress={() => Linking.openURL(s.url)}
            />
          ))}
        </Section>

        <Section title="Datakilder">
          <PressableRow
            title="Open Food Facts"
            subtitle="CC-BY-SA 3.0. Bidrag selv til databasen."
            onPress={() => Linking.openURL('https://world.openfoodfacts.org/')}
          />
          <PressableRow
            title="Anthropic"
            subtitle="Bruges kun ved foto-aflæsning af etiketter."
            onPress={() => Linking.openURL('https://www.anthropic.com/')}
          />
        </Section>

        <Section title="Privatliv">
          <Text style={styles.privacy}>
            Stregkoder slås anonymt op via Open Food Facts. Ved foto-aflæsning
            sendes billedet til Anthropic — slå Pro fra eller undgå
            etiket-scanning hvis du ikke ønsker det. Vi gemmer ingen scans
            på en server: din historik ligger kun på denne enhed.
          </Text>
        </Section>

        <Section title="Om appen">
          <Row title="Version" subtitle={APP_VERSION} />
          <PressableRow title="Vis introduktionen igen" onPress={onResetOnboarding} />
        </Section>

        {!__iapEnabled && (
          <Section title="Udvikler">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Simulér Pro</Text>
                <Text style={styles.rowSub}>Kun aktiv i dev-builds.</Text>
              </View>
              <Switch
                value={pro}
                onValueChange={(v) => setProDev(v)}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </Section>
        )}

        <Text style={styles.disclaimer}>
          Vejledende. Erstatter ikke individuelle kostråd fra sundhedsfaglige
          personer.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function PressableRow({
  title,
  subtitle,
  onPress,
  destructive,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, destructive && { color: colors.red }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {!destructive && <Text style={styles.chev}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 24, paddingBottom: 32 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  sectionBody: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 15, color: colors.text, fontWeight: '500' },
  rowSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chev: { color: colors.textMuted, fontSize: 22, marginLeft: 8 },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  upgradeTitle: { fontSize: 15, color: colors.primary, fontWeight: '700' },
  upgradeSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  privacy: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    padding: 16,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
