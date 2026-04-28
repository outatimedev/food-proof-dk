import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyzeLabelImage } from '@/lib/analyze';
import { scoreLabel } from '@/lib/scoring';
import { colors, radius } from '@/theme';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResult = async (base64: string, mediaType: 'image/jpeg' | 'image/png') => {
    if (!API_KEY) {
      setError(
        'EXPO_PUBLIC_ANTHROPIC_API_KEY mangler. Tilføj den til .env og genstart Expo.',
      );
      setBusy(false);
      return;
    }
    try {
      const extracted = await analyzeLabelImage({
        apiKey: API_KEY,
        imageBase64: base64,
        mediaType,
      });
      const score = scoreLabel(extracted);
      router.replace({
        pathname: '/result',
        params: {
          extracted: JSON.stringify(extracted),
          score: JSON.stringify(score),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const onCapture = async () => {
    if (!cameraRef.current || busy) return;
    setError(null);
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
        skipProcessing: true,
      });
      if (!photo?.base64) throw new Error('Kunne ikke læse billede.');
      await handleResult(photo.base64, 'image/jpeg');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const onPickFromLibrary = async () => {
    if (busy) return;
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setBusy(true);
    const asset = result.assets[0];
    const mediaType: 'image/jpeg' | 'image/png' =
      asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    await handleResult(asset.base64!, mediaType);
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
          FoodProof skal bruge kameraet til at scanne fødevareetiketter.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Giv adgang</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onPickFromLibrary}>
          <Text style={styles.secondaryBtnText}>Vælg fra fotobibliotek</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlay}>
        <View style={styles.frame}>
          <Text style={styles.frameHint}>Centrér næringsdeklarationen</Text>
        </View>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <Pressable
          style={styles.libraryBtn}
          onPress={onPickFromLibrary}
          disabled={busy}
        >
          <Text style={styles.libraryBtnText}>Bibliotek</Text>
        </Pressable>

        <Pressable
          onPress={onCapture}
          disabled={busy}
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
  frameHint: {
    color: '#fff',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  errorBox: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    right: 16,
    backgroundColor: colors.redBg,
    padding: 12,
    borderRadius: radius.md,
  },
  errorText: { color: colors.red, fontSize: 13 },
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
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
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
