/**
 * PlacesScreen
 *
 * Fetches the user's current GPS location, then calls the backend
 * /api/places/nearby?lat=&lng=&emotion= to get 10 nearby places.
 * Each place shows its name, type and a tap target → PlaceDetailScreen.
 */

import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api';

const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', angry: '😠', fear: '😨',
  neutral: '😐', surprise: '😲', disgust: '🤢',
};

// Emission badge colours
const EMISSION_COLOR = {
  very_low:  '#4ade80',
  low:       '#a3e635',
  medium:    '#facc15',
  high:      '#fb923c',
  very_high: '#f87171',
};

export default function PlacesScreen({ route, navigation }) {
  const emotion = route.params?.emotion ?? 'neutral';
  const [places, setPlaces]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationErr, setLocationErr] = useState(null);

  const fetchPlaces = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationErr('Location permission is required to find nearby places.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;

      const { data } = await api.get(
        `/places/nearby?lat=${lat}&lng=${lng}&emotion=${emotion}`
      );
      setPlaces(data.places || []);
      setLocationErr(null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load nearby places.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPlaces(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Finding places near you…</Text>
      </View>
    );
  }

  if (locationErr) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{locationErr}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPlaces()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderPlace = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PlaceDetail', { place: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
        {item.rating ? (
          <Text style={styles.rating}>⭐ {item.rating}</Text>
        ) : null}
      </View>
      <Text style={styles.address} numberOfLines={1}>{item.address}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.typeTag}>
          {(item.types?.[0] ?? 'place').replace(/_/g, ' ')}
        </Text>
        <Text style={styles.emissionHint}>Tap for emission & points →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Places</Text>
        <Text style={styles.emotionTag}>
          {EMOTION_EMOJI[emotion]} {emotion.charAt(0).toUpperCase() + emotion.slice(1)} mood
        </Text>
      </View>

      <FlatList
        data={places}
        keyExtractor={(p) => p.placeId}
        renderItem={renderPlace}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlaces(true)} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No places found nearby. Try a different radius.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f0f12' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f12', padding: 24 },
  header:       { padding: 24, paddingBottom: 12 },
  title:        { fontSize: 22, fontWeight: '700', color: '#f0f0f2' },
  emotionTag:   { fontSize: 14, color: '#8a8a94', marginTop: 4 },
  loadingText:  { color: '#8a8a94', marginTop: 12, fontSize: 14 },
  errorText:    { color: '#f87171', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn:     { backgroundColor: '#6366f1', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#1a1a1f', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a32',
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  placeName:   { fontSize: 16, fontWeight: '600', color: '#f0f0f2', flex: 1 },
  rating:      { fontSize: 13, color: '#facc15', marginLeft: 8 },
  address:     { fontSize: 13, color: '#8a8a94', marginTop: 4 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  typeTag: {
    backgroundColor: '#2a2a32', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, fontSize: 12, color: '#a0a0aa',
  },
  emissionHint: { fontSize: 12, color: '#6366f1' },
  empty:        { color: '#8a8a94', textAlign: 'center', marginTop: 48, fontSize: 15 },
});
