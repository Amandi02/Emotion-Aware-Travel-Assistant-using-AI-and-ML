/**
 * EmotionScanScreen - Camera Only "Gallery" Theme
 */

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { mlApi } from '../api';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

const { width } = Dimensions.get('window');

const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', angry: '😠', anger: '😠',
  fear: '😨', neutral: '😐', surprise: '😲', disgust: '🤢',
};

// Accent colours per emotion for the breakdown bars
const EMOTION_COLOR = {
  happy:   '#10B981',  // emerald
  sad:     '#3B82F6',  // blue
  angry:   '#EF4444',  // red
  anger:   '#EF4444',
  fear:    '#F97316',  // orange
  neutral: '#94A3B8',  // slate
  surprise:'#F59E0B',  // amber
  disgust: '#8B5CF6',  // purple
};

export default function EmotionScanScreen({ navigation }) {
  const [videoUri, setVideoUri] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [percent, setPercent] = useState(null);
  const [allEmotions, setAllEmotions] = useState(null);
  const [loading, setLoading] = useState(false);

  const startScanning = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to scan your emotion.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 10,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled && result.assets?.[0]) {
      setVideoUri(result.assets[0].uri);
      setEmotion(null);
      setPercent(null);
      setAllEmotions(null);
    }
  };

  const analyse = async () => {
    if (!videoUri) return;
    setLoading(true);
    try {
      const ext = videoUri.split('.').pop()?.toLowerCase();
      const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      const result = await mlApi.analyzeEmotionVideo(videoUri, mime);
      setEmotion(result.emotion);
      setPercent(result.percent);
      setAllEmotions(result.average_emotions ?? null);
    } catch (err) {
      Alert.alert('Analysis failed', err.message || 'Could not detect emotion.');
    } finally {
      setLoading(false);
    }
  };

  const findPlaces = () => navigation.navigate('Places', { emotion });

  return (
    <View style={styles.container}>
      {/* ── Premium Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.slate400} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emotion Scan</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Match your mood</Text>
          <Text style={styles.heroSubtitle}>Record a short video of your face to find the perfect eco-friendly places for how you feel.</Text>

          <TouchableOpacity
            style={[styles.scannerSlot, videoUri && styles.scannerSlotActive]}
            onPress={startScanning}
            activeOpacity={0.9}
          >
            {videoUri ? (
              <View style={styles.videoOverlay}>
                <Ionicons name="checkmark-circle" size={80} color={COLORS.white} />
                <Text style={styles.videoText}>MOOD CAPTURED</Text>
                <Text style={styles.retakeText}>Tap to retake</Text>
              </View>
            ) : (
              <View style={styles.cameraPrompt}>
                <View style={styles.cameraIconCircle}>
                  <Ionicons name="camera" size={40} color={COLORS.primary} />
                </View>
                <Text style={styles.cameraPromptTitle}>Start Camera</Text>
                <Text style={styles.cameraPromptText}>Up to 10 seconds</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Analysis Results ───────────────────────────────────────── */}
        {emotion && (
          <View style={styles.resultSection}>
            {/* Dominant emotion hero card */}
            <View style={styles.resultCard}>
              <View style={styles.resultEmojiWrap}>
                <Text style={styles.resultEmoji}>{EMOTION_EMOJI[emotion]}</Text>
              </View>
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{emotion.toUpperCase()}</Text>
                <View style={styles.confRow}>
                  <View style={styles.confBarBg}>
                    <View style={[styles.confBarFill, { width: `${percent}%`, backgroundColor: EMOTION_COLOR[emotion] ?? COLORS.primary }]} />
                  </View>
                  <Text style={styles.resultConf}>{percent}%</Text>
                </View>
              </View>
            </View>

            {/* Full emotion breakdown */}
            {allEmotions && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Full Emotion Breakdown</Text>
                {Object.entries(allEmotions)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, pct]) => {
                    const isDominant = name === emotion;
                    const barColor = EMOTION_COLOR[name] ?? COLORS.primary;
                    return (
                      <View key={name} style={styles.breakdownRow}>
                        <Text style={styles.breakdownEmoji}>{EMOTION_EMOJI[name] ?? '🙂'}</Text>
                        <View style={styles.breakdownMiddle}>
                          <Text style={[styles.breakdownLabel, isDominant && styles.breakdownLabelBold]}>
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                            {isDominant ? '  ✦' : ''}
                          </Text>
                          <View style={styles.breakdownBarBg}>
                            <View
                              style={[
                                styles.breakdownBarFill,
                                { width: `${pct}%`, backgroundColor: barColor },
                                isDominant && styles.breakdownBarDominant,
                              ]}
                            />
                          </View>
                        </View>
                        <Text style={[styles.breakdownPct, isDominant && { color: barColor }]}>
                          {pct}%
                        </Text>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Floating Primary Action ───────────────────────────────────── */}
      <View style={styles.footer}>
        {!emotion ? (
          <TouchableOpacity
            style={[styles.primaryAction, !videoUri && styles.actionDisabled]}
            onPress={analyse}
            disabled={!videoUri || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.actionRow}>
                <Ionicons name="sparkles" size={20} color={COLORS.white} />
                <Text style={styles.actionLabel}>REVEAL MY VIBE</Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryAction} onPress={findPlaces}>
            <View style={styles.actionRow}>
              <Ionicons name="map" size={20} color={COLORS.white} />
              <Text style={styles.actionLabel}>EXPLORE PLACES</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.slate900 },

  scrollContent: { padding: 24, paddingBottom: 120 },

  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.slate900,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: COLORS.slate500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },

  scannerSlot: {
    width: width - 48,
    height: width - 48,
    backgroundColor: COLORS.slate50,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.slate100,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW,
  },
  scannerSlotActive: {
    borderStyle: 'solid',
    borderColor: COLORS.primary,
  },
  cameraPrompt: {
    alignItems: 'center',
  },
  cameraIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOW,
  },
  cameraPromptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.slate800,
  },
  cameraPromptText: {
    fontSize: 14,
    color: COLORS.slate400,
    marginTop: 4,
  },

  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoText: { color: COLORS.white, fontWeight: '900', fontSize: 20, marginTop: 12 },
  retakeText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, marginTop: 8, fontWeight: '600' },

  resultSection: {
    marginTop: 10,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate50,
    padding: 20,
    borderRadius: RADIUS.lg,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  resultEmojiWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW,
  },
  resultEmoji: { fontSize: 32 },
  resultText: { flex: 1 },
  resultName: { fontSize: 20, fontWeight: '900', color: COLORS.slate900, marginBottom: 8 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confBarBg: { flex: 1, height: 6, backgroundColor: COLORS.slate200, borderRadius: 3, overflow: 'hidden' },
  confBarFill: { height: '100%', backgroundColor: COLORS.primary },
  resultConf: { fontSize: 13, fontWeight: '800', color: COLORS.slate500, width: 40 },

  // ── Breakdown card ──────────────────────────────────────────────────────────
  breakdownCard: {
    marginTop: 16,
    backgroundColor: COLORS.slate50,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    padding: 20,
    gap: 14,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  breakdownMiddle: { flex: 1, gap: 4 },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  breakdownLabelBold: {
    fontWeight: '900',
    color: COLORS.slate900,
  },
  breakdownBarBg: {
    height: 6,
    backgroundColor: COLORS.slate200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownBarDominant: {
    height: 8,
  },
  breakdownPct: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate400,
    width: 44,
    textAlign: 'right',
  },

  footer: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
  },
  primaryAction: {
    height: 64,
    backgroundColor: COLORS.slate900,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW,
  },
  actionDisabled: {
    backgroundColor: COLORS.slate300,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionLabel: { color: COLORS.white, fontWeight: '900', letterSpacing: 1.5, fontSize: 16 },
});
