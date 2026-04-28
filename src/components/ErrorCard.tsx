import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ClassifiedError } from '@/lib/errors';
import { colors, radius } from '@/theme';

interface Props {
  error: ClassifiedError;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function ErrorCard({ error, onPrimary, onSecondary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{error.titleDa}</Text>
      <Text style={styles.body}>{error.bodyDa}</Text>
      <View style={styles.row}>
        {error.cta.primary && onPrimary && (
          <Pressable style={styles.primary} onPress={onPrimary}>
            <Text style={styles.primaryText}>{error.cta.primary}</Text>
          </Pressable>
        )}
        {error.cta.secondary && onSecondary && (
          <Pressable style={styles.secondary} onPress={onSecondary}>
            <Text style={styles.secondaryText}>{error.cta.secondary}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.redBg,
    borderRadius: radius.md,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.red },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 8, marginTop: 6 },
  primary: {
    backgroundColor: colors.red,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondary: {
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryText: { color: colors.red, fontWeight: '700', fontSize: 14 },
});
