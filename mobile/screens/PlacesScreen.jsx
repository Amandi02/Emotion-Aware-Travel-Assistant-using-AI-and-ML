/**
 * PlacesScreen - Modern Premium "Location Cards" Theme
 */

import { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  Image, Dimensions
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

const { width } = Dimensions.get('window');

const EMOTION_EMOJI = {
  happy: '😊', sad: '😢', angry: '😠', fear: '😨',
  neutral: '😐', surprise: '😲', disgust: '🤢',
};

export default function PlacesScreen({ route, navigation }) {
  const emotion = route.params?.emotion ?? 'neutral';
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationErr, setLocationErr] = useState(null);

  const fetchPlaces = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationErr('Location permission is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;

      const { data } = await api.get(`/places/nearby?lat=${lat}&lng=${lng}&emotion=${emotion}`);
      setPlaces(data.places || []);
      setLocationErr(null);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not load places.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchPlaces(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding best spots for your mood...</Text>
      </View>
    );
  }

  const renderPlace = ({ item }) => {
    // Simulated eco-score (0-100)
    const score = Math.floor(Math.random() * 40) + 60;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PlaceDetail', { place: item })}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="image-outline" size={48} color={COLORS.slate300} />
            </View>
          )}

          {/* Eco Badge (Floating) */}
          <View style={styles.ecoBadge}>
            <Ionicons name="leaf" size={14} color={COLORS.primaryDeep} />
            <Text style={styles.ecoText}>{score}% Green</Text>
          </View>

          {/* Rating overlay */}
          <View style={styles.overlay}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.rating}>{item.rating || '4.5'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.placeName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.placeAddress} numberOfLines={1}>{item.address}</Text>

          <View style={styles.cardFooter}>
            <View style={styles.typeTag}>
              <Text style={styles.typeText}>{(item.types?.[0] || 'Discovery').replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.distanceWrap}>
              <Ionicons name="location-outline" size={14} color={COLORS.slate400} />
              <Text style={styles.distanceText}>Nearby</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Premium Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.slate800} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Discovered</Text>
            <Text style={styles.headerSubtitle}>Best spots for {emotion} mood {EMOTION_EMOJI[emotion]}</Text>
          </View>
          <TouchableOpacity style={styles.searchBtn}>
            <Ionicons name="search-outline" size={20} color={COLORS.slate800} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={places}
        keyExtractor={(p) => p.placeId}
        renderItem={renderPlace}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchPlaces(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="map-outline" size={60} color={COLORS.slate200} />
            <Text style={styles.emptyText}>No places found nearby.</Text>
            <Text style={styles.emptySub}>Try adjusting your location or scanning again.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FBFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FBFC' },
  loadingText: { color: COLORS.slate500, marginTop: 14, fontSize: 16, fontWeight: '600' },

  header: {
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitles: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: COLORS.slate900 },
  headerSubtitle: { fontSize: 13, color: COLORS.slate500, fontWeight: '600', marginTop: 2 },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  listContent: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: 24,
    overflow: 'hidden',
    ...SHADOW,
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  ecoBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOW,
  },
  ecoText: { fontSize: 13, fontWeight: '800', color: COLORS.primaryDeep },

  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  ratingRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: { color: COLORS.white, fontWeight: '800', fontSize: 13 },

  cardContent: {
    padding: 20,
  },
  placeName: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: COLORS.slate500,
    marginBottom: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.slate50,
    paddingTop: 16,
  },
  typeTag: {
    backgroundColor: COLORS.primaryGhost,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  typeText: { fontSize: 11, fontWeight: '800', color: COLORS.primaryDeep, textTransform: 'uppercase' },
  distanceWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { fontSize: 13, color: COLORS.slate400, fontWeight: '600' },

  emptyBox: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '800', color: COLORS.slate800, marginBottom: 8, marginTop: 20 },
  emptySub: { fontSize: 14, color: COLORS.slate400, textAlign: 'center', lineHeight: 20 },
});
