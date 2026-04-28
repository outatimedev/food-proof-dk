import { Link, Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearHistory, HistoryEntry, listHistory } from '@/lib/history';
import { Verdict } from '@/lib/types';
import { colors, radius } from '@/theme';

export default function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listHistory().then((list) => {
        if (active) setEntries(list);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const onClear = () => {
    Alert.alert('Slet historik?', 'Alle gemte scans bliver fjernet fra denne enhed.', [
      { text: 'Annullér', style: 'cancel' },
      {
        text: 'Slet',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setEntries([]);
        },
      },
    ]);
  };

  if (entries === null) {
    return <SafeAreaView style={styles.center} />;
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={styles.empty} edges={['bottom']}>
        <Text style={styles.emptyTitle}>Ingen scans endnu</Text>
        <Text style={styles.emptyBody}>
          Når du scanner et produkt, dukker det op her så du kan finde det igen senere.
        </Text>
        <Link href="/scan" replace asChild>
          <Pressable style={styles.primary}>
            <Text style={styles.primaryText}>Scan dit første produkt</Text>
          </Pressable>
        </Link>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={onClear} hitSlop={10}>
              <Text style={styles.clearText}>Ryd</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <Row entry={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </SafeAreaView>
  );
}

function Row({ entry }: { entry: HistoryEntry }) {
  const { product, score, scannedAtISO } = entry;
  const date = new Date(scannedAtISO).toLocaleDateString('da-DK', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/result',
          params: {
            product: JSON.stringify(product),
            score: JSON.stringify(score),
          },
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <VerdictPill verdict={score.verdict} />
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Text style={styles.thumbInitial}>
            {(product.productName ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {product.productName ?? 'Ukendt produkt'}
        </Text>
        {product.brand ? (
          <Text style={styles.rowBrand} numberOfLines={1}>
            {product.brand}
          </Text>
        ) : null}
        <Text style={styles.rowDate}>{date}</Text>
      </View>
    </Pressable>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const palette = (() => {
    switch (verdict) {
      case 'proof':
        return { fg: colors.green, bg: colors.greenBg };
      case 'warning':
        return { fg: colors.red, bg: colors.redBg };
      case 'moderate':
        return { fg: colors.amber, bg: colors.amberBg };
      case 'unknown':
        return { fg: colors.textMuted, bg: colors.surface };
    }
  })();
  return (
    <View style={[styles.pill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.pillText, { color: palette.fg }]}>
        {verdict === 'proof'
          ? '✓'
          : verdict === 'warning'
            ? '!'
            : verdict === 'unknown'
              ? '?'
              : '·'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg },
  empty: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyBody: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clearText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  rowPressed: { opacity: 0.7 },
  pill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 18, fontWeight: '800' },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  thumbInitial: { color: colors.textMuted, fontSize: 18, fontWeight: '700' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowBrand: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  rowDate: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});
