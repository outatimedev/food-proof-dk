import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorCard } from '@/components/ErrorCard';
import { analyzeLabelImage, VisionExtractionError } from '@/lib/analyze';
import { isPro } from '@/lib/entitlement';
import { ClassifiedError, classify } from '@/lib/errors';
import { fetchByBarcode, hasScoreableNutrition } from '@/lib/openfoodfacts';
import { canUseVision, chargeVision } from '@/lib/quota';
import { scoreProduct } from '@/lib/scoring';
import { Product } from '@/lib/types';
import { colors, radius } from '@/theme';

const HAS_VISION_BACKEND =
  !!process.env.EXPO_PUBLIC_API_BASE_URL || !!process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

type Mode = 'barcode' | 'label';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<Mode>('barcode');
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<ClassifiedError | null>(null);
  const lockRef = useRef(false);

  const goToResult = useCallback((product: Product) => {
    const score = scoreProduct(product);
    router.replace({
      pathname: '/result',
      params: {
        product: JSON.stringify(product),
        score: JSON.stringify(score),
      },
    });
  }, []);

  const onBarcodeScanned = useCallback(
    async ({ data }: { data: string; type: string }) => {
      if (lockRef.current || busy || mode !== 'barcode') return;
      lockRef.current = true;
      setError(null);
      setBusy('Slår op i Open Food Facts…');
      try {
        const product = await fetchByBarcode(data);
        if (!hasScoreableNutrition(product)) {
          setBusy(null);
          setError({
            kind: 'no_nutrition_data',
            titleDa: 'Ingen næringsdata',
            bodyDa: `Fandt produktet ${product.productName ?? data} men uden næringsdeklaration. Fotografér bagsiden i stedet.`,
            cta: { primary: 'Fotografér etiket', secondary: 'Indtast manuelt' },
          });
          lockRef.current = false;
          return;
        }
        goToResult(product);
      } catch (err) {
        setBusy(null);
        setError(classify(err));
        lockRef.current = false;
      }
    },
    [busy, goToResult, mode],
  );

  const captureLabel = async () => {
    if (!cameraRef.current || busy) return;
    setError(null);
    setBusy('Aflæser etiket…');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: true,
      });
      if (!photo?.base64) throw new Error('Kunne ikke læse billede.');
      await runVision(photo.base64, 'image/jpeg');
    } catch (err) {
      setBusy(null);
      setError(classify(err));
    }
  };

  const pickFromLibrary = async () => {
    if (busy) return;
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setBusy('Aflæser etiket…');
    const asset = result.assets[0];
    const mediaType: 'image/jpeg' | 'image/png' =
      asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    try {
      await runVision(asset.base64!, mediaType);
    } catch (err) {
      setBusy(null);
      setError(classify(err));
    }
  };

  const runVision = async (
    base64: string,
    mediaType: 'image/jpeg' | 'image/png',
  ) => {
    const pro = isPro();
    // Local quota is advisory — the proxy is the real gate. We pre-check so
    // free users see the paywall *before* an upload, not after.
    if (!(await canUseVision(pro))) {
      setBusy(null);
      router.push('/paywall');
      return;
    }
    if (!HAS_VISION_BACKEND) {
      setBusy(null);
      setError({
        kind: 'auth_failed',
        titleDa: 'Vision er ikke konfigureret',
        bodyDa:
          'Sæt EXPO_PUBLIC_API_BASE_URL (proxy) eller EXPO_PUBLIC_ANTHROPIC_API_KEY (dev) i .env.',
        cta: { primary: 'OK' },
      });
      return;
    }
    try {
      const product = await analyzeLabelImage({ imageBase64: base64, mediaType });
      // Mirror the server charge locally so the settings/usage display
      // stays in sync. Pro users skip both.
      await chargeVision(pro);
      goToResult(product);
    } catch (err) {
      setBusy(null);
      if (err instanceof VisionExtractionError && err.code === 'quota_exceeded') {
        router.push('/paywall');
        return;
      }
      setError(classify(err));
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <Text style={styles.permissionTitle}>Kameraadgang</Text>
        <Text style={styles.permissionBody}>
          FoodProof skal bruge kameraet til at scanne stregkoder og etiketter.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Giv adgang</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={pickFromLibrary}>
          <Text style={styles.secondaryBtnText}>Vælg billede fra bibliotek</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={
          mode === 'barcode'
            ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'code128'] }
            : undefined
        }
        onBarcodeScanned={mode === 'barcode' ? onBarcodeScanned : undefined}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.frame, mode === 'barcode' && styles.frameBarcode]}>
          <Text style={styles.frameHint}>
            {mode === 'barcode' ? 'Centrér stregkoden' : 'Centrér næringsdeklarationen'}
          </Text>
        </View>
      </View>

      {/* Mode toggle */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={styles.segment}>
          <Pressable
            onPress={() => {
              setMode('barcode');
              setError(null);
              lockRef.current = false;
            }}
            style={[styles.segmentBtn, mode === 'barcode' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, mode === 'barcode' && styles.segmentTextActive]}>
              Stregkode
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setMode('label');
              setError(null);
              lockRef.current = false;
            }}
            style={[styles.segmentBtn, mode === 'label' && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, mode === 'label' && styles.segmentTextActive]}>
              Etiket
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {busy && (
        <View style={styles.busyBox}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.busyText}>{busy}</Text>
        </View>
      )}

      {error && !busy && (
        <View style={styles.errorContainer}>
          <ErrorCard
            error={error}
            onPrimary={() => {
              if (error.kind === 'product_not_found' || error.kind === 'no_nutrition_data') {
                setMode('label');
                setError(null);
                lockRef.current = false;
              } else if (error.kind === 'offline' || error.kind === 'rate_limited' || error.kind === 'vision_failed') {
                setError(null);
                lockRef.current = false;
              } else {
                setError(null);
              }
            }}
            onSecondary={() => {
              if (error.kind === 'product_not_found' || error.kind === 'no_nutrition_data' || error.kind === 'vision_failed') {
                router.push('/manual');
              }
            }}
          />
        </View>
      )}

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <Pressable
          style={styles.libraryBtn}
          onPress={pickFromLibrary}
          disabled={!!busy}
        >
          <Text style={styles.libraryBtnText}>Bibliotek</Text>
        </Pressable>

        {mode === 'label' ? (
          <Pressable
            onPress={captureLabel}
            disabled={!!busy}
            style={({ pressed }) => [
              styles.shutter,
              pressed && styles.shutterPressed,
              busy && styles.shutterBusy,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </Pressable>
        ) : (
          <View style={styles.shutterPlaceholder}>
            <Text style={styles.shutterPlaceholderText}>Auto</Text>
          </View>
        )}

        <View style={styles.libraryBtn} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  permissionTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  permissionBody: { fontSize: 16, color: colors.textMuted, lineHeight: 22 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '85%',
    aspectRatio: 0.75,
    borderColor: 'rgba(255,255,255,0.85)',
    borderWidth: 2,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  frameBarcode: { aspectRatio: 2.4, width: '90%' },
  frameHint: {
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'center',
    paddingTop: 8,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.md,
    padding: 4,
  },
  segmentBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  segmentBtnActive: { backgroundColor: '#fff' },
  segmentText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: colors.primary },
  busyBox: {
    position: 'absolute',
    bottom: 200,
    left: 24,
    right: 24,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  busyText: { color: '#fff', fontSize: 14, flex: 1 },
  errorContainer: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    right: 16,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.primary,
  },
  shutterPressed: { transform: [{ scale: 0.95 }] },
  shutterBusy: { opacity: 0.6 },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary },
  shutterPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPlaceholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  libraryBtn: {
    width: 80,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  libraryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
