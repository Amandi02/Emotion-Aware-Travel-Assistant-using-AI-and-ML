/**
 * EmotionScanScreen
 *
 * User records a short selfie video (up to 10 s) or picks one from the gallery.
 * The video is sent to the backend which processes EVERY frame with a
 * 5-frame sliding-window smoother (same as the training notebook) and returns
 * the dominant emotion.  The user is then navigated to PlacesScreen.
 */

import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { mlApi } from '../api';

const EMOTION_EMOJI = {
  happy:    '😊',
  sad:      '😢',
  angry:    '😠',
  anger:    '😠',
  fear:     '😨',
  neutral:  '😐',
  surprise: '😲',
  disgust:  '🤢',
};

const EMOTION_COLOR = {
  happy:    '#4ade80',
  sad:      '#60a5fa',
  angry:    '#f87171',
  anger:    '#f87171',
  fear:     '#c084fc',
  neutral:  '#94a3b8',
  surprise: '#fb923c',
  disgust:  '#a3e635',
};

export default function EmotionScanScreen({ navigation }) {
  const [videoUri, setVideoUri]   = useState(null);
  const [emotion, setEmotion]     = useState(null);
  const [percent, setPercent]     = useState(null);
  const [loading, setLoading]     = useState(false);

  // ── pick / record video ─────────────────────────────────────────────────────

  const recordVideo = async (useCamera) => {
    const picker = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to continue.');
      return;
    }

    const result = await picker({
      mediaTypes: ['videos'],
      videoMaxDuration: 10,      // cap at 10 seconds to keep upload small
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      setVideoUri(result.assets[0].uri);
      setEmotion(null);
      setPercent(null);
    }
  };

  // ── analyse ─────────────────────────────────────────────────────────────────

  const analyse = async () => {
    if (!videoUri) return;
    setLoading(true);
    try {
      // Detect MIME from extension (expo returns .mp4 on Android, .mov on iOS)
      const ext = videoUri.split('.').pop()?.toLowerCase();
      const mime = ext === 'mov' ? 'video/quicktime' : 'video/mp4';

      const result = await mlApi.analyzeEmotionVideo(videoUri, mime);
      setEmotion(result.emotion);
      setPercent(result.percent);
    } catch (err) {
      Alert.alert('Analysis failed', err.message || 'Could not detect emotion. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── navigate to places ──────────────────────────────────────────────────────

  const findPlaces = () => {
    navigation.navigate('Places', { emotion });
  };

  // ── render ──────────────────────────────────────────────────────────────────

  const emotionColor = emotion ? EMOTION_COLOR[emotion] ?? '#6366f1' : '#6366f1';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emotion Scan</Text>
      <Text style={styles.subtitle}>
        Record a short selfie video (up to 10 s) so the model can analyse your emotion across frames
      </Text>

      {/* Video status indicator */}
      <View style={styles.previewBox}>
        {videoUri ? (
          <View style={styles.videoReady}>
            <Text style={styles.videoIcon}>🎬</Text>
            <Text style={styles.videoReadyText}>Video ready</Text>
            <Text style={styles.videoPath} numberOfLines={1}>
              {videoUri.split('/').pop()}
            </Text>
          </View>
        ) : (
          <Text style={styles.previewPlaceholder}>🎥</Text>
        )}
      </View>

      {/* Record / gallery buttons */}
      {!emotion && (
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={() => recordVideo(true)}>
            <Text style={styles.btnText}>🎥 Record</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={() => recordVideo(false)}>
            <Text style={styles.btnText}>📂 Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Analyse button */}
      {videoUri && !emotion && (
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={analyse}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.primaryBtnText, { marginLeft: 10 }]}>
                Analysing video…
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Detect Emotion</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Emotion result */}
      {emotion && (
        <View style={[styles.resultCard, { borderColor: emotionColor }]}>
          <Text style={styles.emoji}>{EMOTION_EMOJI[emotion] ?? '🙂'}</Text>
          <Text style={[styles.emotionName, { color: emotionColor }]}>
            {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
          </Text>
          <Text style={styles.emotionPct}>{percent}% confidence</Text>

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setEmotion(null); setPercent(null); setVideoUri(null); }}
            >
              <Text style={styles.secondaryBtnText}>Re-scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, marginBottom: 0 }]}
              onPress={findPlaces}
            >
              <Text style={styles.primaryBtnText}>Find Sustainable Places →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#0f0f12' },
  title:              { fontSize: 24, fontWeight: '700', color: '#f0f0f2' },
  subtitle:           { fontSize: 13, color: '#8a8a94', marginTop: 4, marginBottom: 24, lineHeight: 18 },

  previewBox: {
    width: '100%', aspectRatio: 1, borderRadius: 16,
    backgroundColor: '#1a1a1f', borderWidth: 1, borderColor: '#2a2a32',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginBottom: 20,
  },
  previewPlaceholder: { fontSize: 64, opacity: 0.3 },
  videoReady:         { alignItems: 'center', gap: 8 },
  videoIcon:          { fontSize: 48 },
  videoReadyText:     { color: '#4ade80', fontSize: 16, fontWeight: '600' },
  videoPath:          { color: '#8a8a94', fontSize: 11, maxWidth: 260 },

  row:                { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: {
    flex: 1, padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a32',
    alignItems: 'center', backgroundColor: '#1a1a1f',
  },
  btnText:            { color: '#f0f0f2', fontSize: 15 },

  primaryBtn: {
    backgroundColor: '#6366f1', borderRadius: 10,
    padding: 14, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnDisabled:        { opacity: 0.5 },
  loadingRow:         { flexDirection: 'row', alignItems: 'center' },

  resultCard: {
    backgroundColor: '#1a1a1f', borderRadius: 16, borderWidth: 1.5,
    padding: 24, alignItems: 'center', marginTop: 8,
  },
  emoji:              { fontSize: 56, marginBottom: 8 },
  emotionName:        { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  emotionPct:         { color: '#8a8a94', fontSize: 14, marginBottom: 20 },
  resultActions:      { flexDirection: 'row', gap: 12, width: '100%' },
  secondaryBtn: {
    padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a32', alignItems: 'center',
  },
  secondaryBtnText:   { color: '#8a8a94', fontSize: 15 },
});
