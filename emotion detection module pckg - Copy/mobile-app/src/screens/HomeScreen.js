import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_BASE_URL } from '../../config';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const recordingPromiseRef = useRef(null);

  const uploadAndAnalyze = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('video', {
        uri,
        type: 'video/mp4',
        name: 'selfie.mp4',
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      const response = await fetch(`${API_BASE_URL}/api/analyze-video`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      navigation.navigate('Result', { emotion: data.emotion, percent: data.percent });
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not analyze video. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    if (!cameraRef.current || !permission?.granted) return;
    try {
      recordingPromiseRef.current = cameraRef.current.recordAsync();
      setRecording(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !recordingPromiseRef.current) return;
    setRecording(false);
    try {
      cameraRef.current.stopRecording();
      const video = await recordingPromiseRef.current;
      recordingPromiseRef.current = null;
      if (video?.uri) {
        await uploadAndAnalyze(video.uri);
      } else {
        Alert.alert('Recording failed', 'No video was saved. Try again.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Recording failed');
      recordingPromiseRef.current = null;
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera access is required for selfie video.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        mode="video"
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>Record a selfie video</Text>
        <Text style={styles.subtitle}>
          {recording ? 'Recording… Tap Stop when done' : 'Tap Record, then Stop to analyze'}
        </Text>
        {loading ? (
          <ActivityIndicator size="large" color="#fff" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={[styles.recordButton, recording && styles.recordButtonStop]}
            onPress={recording ? stopRecording : startRecording}
            disabled={loading}
          >
            <Text style={styles.recordButtonText}>{recording ? 'Stop' : 'Record'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
    textAlign: 'center',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e94560',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonStop: {
    backgroundColor: '#c9304a',
    borderRadius: 8,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
  center: {
    flex: 1,
    backgroundColor: '#16213e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    color: '#eee',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
