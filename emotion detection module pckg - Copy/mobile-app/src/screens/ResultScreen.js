import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const EMOTION_EMOJI = {
  anger: '😠',
  disgust: '🤢',
  fear: '😨',
  happy: '😊',
  neutral: '😐',
  sad: '😢',
  surprise: '😲',
};

export default function ResultScreen({ route, navigation }) {
  const { emotion = 'neutral', percent = 0 } = route.params || {};
  const emoji = EMOTION_EMOJI[emotion] ?? '😐';
  const label = emotion.charAt(0).toUpperCase() + emotion.slice(1);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.emotion}>{label}</Text>
        <Text style={styles.percent}>{Number(percent).toFixed(1)}%</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Analyze another</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    marginBottom: 32,
    minWidth: 280,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emotion: {
    fontSize: 28,
    fontWeight: '700',
    color: '#eee',
    marginBottom: 8,
  },
  percent: {
    fontSize: 20,
    color: '#a0a0a0',
  },
  button: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
