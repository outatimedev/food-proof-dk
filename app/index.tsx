import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '@/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.hero}>
        <Text style={styles.flag}>🇩🇰</Text>
        <Text style={styles.title}>FoodProof DK</Text>
        <Text style={styles.subtitle}>
          Scan en stregkode eller en etiket og se hvordan produktet passer
          med Sundhedsstyrelsens officielle kostråd.
        </Text>
      </View>

      <View style={styles.actions}>
        <Link href="/scan" asChild>
          <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
            <Text style={styles.primaryBtnText}>Scan et produkt</Text>
          </Pressable>
        </Link>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sådan virker det</Text>
          <Text style={styles.infoLine}>
            1. Scan stregkoden — vi slår produktet op i Open Food Facts.
          </Text>
          <Text style={styles.infoLine}>
            2. Vi sammenholder næringsindholdet med Sundhedsstyrelsens grænser
            for salt, sukker og mættet fedt.
          </Text>
          <Text style={styles.infoLine}>
            3. Hvis stregkoden ikke er kendt, fotografér bagsiden i stedet.
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Vejledende. Erstatter ikke individuelle kostråd fra sundhedsfaglige
          personer.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: {
    paddingTop: 48,
    alignItems: 'flex-start',
  },
  flag: { fontSize: 40, marginBottom: 8 },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
  },
  actions: { paddingBottom: 24, gap: 16 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 18,
    alignItems: 'center',
  },
  pressed: { opacity: 0.85 },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 18,
    gap: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  infoLine: { fontSize: 14, color: colors.text, lineHeight: 20 },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
