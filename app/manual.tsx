import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorCard } from '@/components/ErrorCard';
import { classify, isValidGtin } from '@/lib/errors';
import {
  fetchByBarcode,
  hasScoreableNutrition,
} from '@/lib/openfoodfacts';
import { scoreProduct } from '@/lib/scoring';
import { colors, radius } from '@/theme';

export default function ManualEntryScreen() {
  const [barcode, setBarcode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorState, setErrorState] = useState<ReturnType<typeof classify> | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  const onLookup = async () => {
    setErrorState(null);
    setValidation(null);
    const trimmed = barcode.trim().replace(/\s+/g, '');
    if (!isValidGtin(trimmed)) {
      setValidation(
        'Det ser ikke ud til at være en gyldig stregkode (EAN-13, EAN-8, UPC-A eller GTIN-14).',
      );
      return;
    }
    setBusy(true);
    try {
      const product = await fetchByBarcode(trimmed);
      if (!hasScoreableNutrition(product)) {
        setErrorState(
          classify(
            new Error('Produktet findes men har ingen næringsdata. Prøv at fotografere bagsiden.'),
          ),
        );
        setBusy(false);
        return;
      }
      const score = scoreProduct(product);
      router.replace({
        pathname: '/result',
        params: {
          product: JSON.stringify(product),
          score: JSON.stringify(score),
        },
      });
    } catch (err) {
      setBusy(false);
      setErrorState(classify(err));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <Text style={styles.title}>Indtast stregkode</Text>
          <Text style={styles.subtitle}>
            Brug dette hvis stregkoden er beskadiget eller ikke kan scannes.
          </Text>

          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="f.eks. 5701234567890"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            inputMode="numeric"
            autoFocus
            maxLength={14}
            style={styles.input}
            editable={!busy}
            returnKeyType="search"
            onSubmitEditing={onLookup}
          />

          {validation && <Text style={styles.validation}>{validation}</Text>}

          {errorState && (
            <ErrorCard
              error={errorState}
              onPrimary={() => {
                setErrorState(null);
                router.replace('/scan');
              }}
            />
          )}

          <Pressable
            onPress={onLookup}
            disabled={busy || barcode.length === 0}
            style={({ pressed }) => [
              styles.primary,
              (busy || barcode.length === 0) && styles.primaryDisabled,
              pressed && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Slå op</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace('/scan')}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Tilbage til scanner</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 24, gap: 14 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 1,
  },
  validation: { fontSize: 13, color: colors.amber },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryDisabled: { opacity: 0.5 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
