/**
 * PlaceDetailScreen - Modern Premium Theme
 */

import { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

const EMISSION_META = {
  very_low: { label: 'Very Low', color: COLORS.emVeryLow, icon: 'leaf', points: 50 },
  low: { label: 'Low', color: COLORS.emLow, icon: 'leaf-outline', points: 30 },
  medium: { label: 'Medium', color: COLORS.emMedium, icon: 'partly-sunny', points: 15 },
  high: { label: 'High', color: COLORS.emHigh, icon: 'business', points: 5 },
  very_high: { label: 'Very High', color: COLORS.emVeryHigh, icon: 'warning', points: 0 },
};

export default function PlaceDetailScreen({ route, navigation }) {
  const { place } = route.params;

  const [emission, setEmission] = useState(null);
  const [loadingEm, setLoadingEm] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => {
    (async () => {
      if (!place.photoName && !place.photoUrl) {
        setLoadingEm(false);
        return;
      }
      try {
        const { data } = await api.post('/places/emission', {
          photoName: place.photoName,
          photoUrl: place.photoUrl,
        });
        setEmission(data);
      } catch {
        // Non-fatal
      } finally {
        setLoadingEm(false);
      }
    })();
  }, []);

  const handleVisit = async () => {
    if (!emission?.emission?.label) {
      Alert.alert('Analysis pending', 'Please wait for the sustainability check to complete.');
      return;
    }
    setAwarding(true);
    try {
      const { data } = await api.post('/points/award', {
        placeId: place.placeId,
        placeName: place.name,
        placeAddress: place.address,
        emissionLevel: emission.emission.label,
      });
      setAwarded(true);
      Alert.alert(
        '🌱 Points Earned!',
        data.message,
        [
          { text: 'View Portfolio', onPress: () => navigation.navigate('Points') },
          { text: 'Sweet!' },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not award points.');
    } finally {
      setAwarding(false);
    }
  };

  const emMeta = emission ? EMISSION_META[emission.emission?.label] ?? EMISSION_META.medium : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

      {/* ── Custom Header Over Photo ────────────────────────────────── */}
      <View style={styles.photoContainer}>
        {place.photoUrl ? (
          <Image source={{ uri: place.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.placeholder]}>
            <Ionicons name="map-outline" size={80} color={COLORS.slate200} />
          </View>
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.slate800} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* ── Title Area ─────────────────────────────────────────────── */}
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{place.name}</Text>
            {place.rating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingValue}>{place.rating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.address}>{place.address}</Text>
        </View>

        {/* ── Sustainability Hub ───────────────────────────────────────── */}
        <View style={styles.sustainCard}>
          <View style={styles.sustainHeader}>
            <Ionicons name="leaf" size={20} color={COLORS.primary} />
            <Text style={styles.sustainTitle}>SUSTAINABILITY SCORE</Text>
          </View>

          {loadingEm ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Running Carbon Analysis...</Text>
            </View>
          ) : emission ? (
            <View style={styles.emissionDetails}>
              <View style={styles.tierRow}>
                <View style={[styles.tierIcon, { backgroundColor: emMeta.color + '15' }]}>
                  <Ionicons name={emMeta.icon} size={32} color={emMeta.color} />
                </View>
                <View style={styles.tierInfo}>
                  <Text style={[styles.tierLabel, { color: emMeta.color }]}>{emMeta.label} Impact</Text>
                  <Text style={styles.confText}>Verified with {(emission.emission.confidence * 100).toFixed(0)}% confidence</Text>
                </View>
                <View style={[styles.ptsBadge, { backgroundColor: emMeta.color }]}>
                  <Text style={styles.ptsValue}>+{emMeta.points}</Text>
                  <Text style={styles.ptsUnit}>PTS</Text>
                </View>
              </View>

              {/* Progress Distribution */}
              <View style={styles.distContainer}>
                <View style={styles.distBar}>
                  {Object.entries(emission.emission.distribution).map(([label, prob]) => (
                    <View
                      key={label}
                      style={{ flex: prob, height: '100%', backgroundColor: EMISSION_META[label]?.color || COLORS.slate200 }}
                    />
                  ))}
                </View>
                <View style={styles.distLabels}>
                  <Text style={styles.distSub}>Carbon Probability Matrix</Text>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>CO2 ESTIMATE</Text>
                  <Text style={styles.statValue}>
                    {emission.emission.co2_kg_year >= 1000
                      ? `${(emission.emission.co2_kg_year / 1000).toFixed(1)}t`
                      : `${emission.emission.co2_kg_year}kg`}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>SCENE TYPE</Text>
                  <Text style={styles.statValue}>{emission.scenes?.[0]?.label || 'General'}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={24} color={COLORS.slate400} />
              <Text style={styles.errorText}>No photo available for carbon analysis.</Text>
            </View>
          )}
        </View>

        {/* ── Action Area ─────────────────────────────────────────────── */}
        {!awarded ? (
          <TouchableOpacity
            style={[styles.primaryBtn, (!emission || awarding) && styles.btnDisabled]}
            onPress={handleVisit}
            disabled={!emission || awarding}
          >
            {awarding ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.white} />
                <View>
                  <Text style={styles.btnText}>Check-in at Location</Text>
                  <Text style={styles.btnSub}>Claim your {emMeta?.points || '0'} Eco-Points</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.successBanner}>
            <Ionicons name="trophy" size={28} color={COLORS.primary} />
            <Text style={styles.successText}>Location Verified & Points Awarded!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  photoContainer: {
    height: 340,
    width: '100%',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: COLORS.slate50, justifyContent: 'center', alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW,
  },

  content: {
    marginTop: -40,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 24,
    paddingTop: 32,
  },
  headerInfo: { marginBottom: 32 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 26, fontWeight: '900', color: COLORS.slate900, flex: 1, marginRight: 12 },
  address: { fontSize: 15, color: COLORS.slate500, fontWeight: '500' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.slate50, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ratingValue: { fontSize: 14, fontWeight: '800', color: COLORS.slate800 },

  sustainCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.slate100,
    marginBottom: 32,
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  sustainHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sustainTitle: { fontSize: 13, fontWeight: '800', color: COLORS.slate400, letterSpacing: 1.5 },

  loadingState: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { marginTop: 12, color: COLORS.slate500, fontWeight: '600' },

  emissionDetails: {},
  tierRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  tierIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  tierInfo: { flex: 1, marginLeft: 16 },
  tierLabel: { fontSize: 20, fontWeight: '900' },
  confText: { fontSize: 13, color: COLORS.slate500, marginTop: 2 },
  ptsBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  ptsValue: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  ptsUnit: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 10, fontWeight: '800' },

  distContainer: { marginBottom: 24 },
  distBar: { height: 8, backgroundColor: COLORS.slate100, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', marginBottom: 8 },
  distSub: { fontSize: 12, color: COLORS.slate400, fontWeight: '600', textAlign: 'center' },

  statsGrid: { flexDirection: 'row', gap: 16 },
  statBox: { flex: 1, backgroundColor: COLORS.slate50, padding: 16, borderRadius: RADIUS.md },
  statLabel: { fontSize: 11, fontWeight: '800', color: COLORS.slate400, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.slate800, textTransform: 'capitalize' },

  errorBox: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  errorText: { color: COLORS.slate400, fontWeight: '600', fontSize: 14 },

  primaryBtn: {
    backgroundColor: COLORS.slate900,
    borderRadius: 32,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW,
  },
  btnDisabled: { backgroundColor: COLORS.slate400 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  btnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  btnSub: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '600' },

  successBanner: {
    backgroundColor: COLORS.primaryGhost,
    borderRadius: 32,
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  successText: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 16 },
});
