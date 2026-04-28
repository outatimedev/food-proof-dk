import { router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { markOnboardingCompleted } from '@/lib/onboarding';
import { colors, radius } from '@/theme';

interface Slide {
  emoji: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '📷',
    title: 'Scan stregkoden',
    body: 'Hold kameraet over stregkoden på bagsiden af produktet. Vi slår det op i Open Food Facts på et øjeblik.',
  },
  {
    emoji: '🇩🇰',
    title: 'Vurderet efter De Officielle Kostråd',
    body: 'Vi sammenholder næringsindholdet med Sundhedsstyrelsens grænser for salt, sukker og mættet fedt — med separate tærskler for mad og drikke.',
  },
  {
    emoji: '🟢',
    title: 'Klar besked',
    body: 'Du får et grønt, gult eller rødt signal pr. næringsstof, og en samlet vurdering du kan bruge i butikken.',
  },
  {
    emoji: '🔒',
    title: 'Dine data bliver',
    body: 'Stregkoder slås anonymt op i Open Food Facts. Foto-aflæsning sender billedet til Anthropic; brug kun denne fallback hvis du er tryg ved det.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const onScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== page) setPage(idx);
  };

  const onDone = async () => {
    await markOnboardingCompleted();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === page && styles.dotActive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          onPress={onDone}
        >
          <Text style={styles.ctaText}>
            {page === SLIDES.length - 1 ? 'Kom i gang' : 'Spring over'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide: { padding: 32, alignItems: 'flex-start', justifyContent: 'center', flex: 1 },
  emoji: { fontSize: 60, marginBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  body: { fontSize: 16, color: colors.textMuted, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary },
  footer: { padding: 24 },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
