/**
 * PlaceDetailScreen
 *
 * Shows full details for a place, fetches carbon-emission analysis
 * from the backend (which calls the ML API with the place photo).
 * User can tap "I Visited Here!" to earn eco-points.
 */

import { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { api } from '../api';

const EMISSION_META = {
  very_low:  { label: 'Very Low',  color: '#4ade80', emoji: '🌿', points: 50 },
  low:       { label: 'Low',       color: '#a3e635', emoji: '🌱', points: 30 },
  medium:    { label: 'Medium',    color: '#facc15', emoji: '🌤️', points: 15 },
  high:      { label: 'High',      color: '#fb923c', emoji: '🏭', points:  5 },
  very_high: { label: 'Very High', color: '#f87171', emoji: '⚠️', points:  0 },
};

export default function PlaceDetailScreen({ route, navigation }) {
  const { place } = route.params;

  const [emission, setEmission]   = useState(null);
  const [loadingEm, setLoadingEm] = useState(true);
  const [awarding, setAwarding]   = useState(false);
  const [awarded, setAwarded]     = useState(false);

  // ── fetch emission on mount ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (!place.photoName && !place.photoUrl) {
        setLoadingEm(false);
        return;
      }
      try {
        const { data } = await api.post('/places/emission', {
          photoName: place.photoName,   // new Places API (v1) photo reference
          photoUrl:  place.photoUrl,
        });
        setEmission(data);
      } catch {
        // Non-fatal – still show place without emission
      } finally {
        setLoadingEm(false);
      }
    })();
  }, []);

  // ── award points ────────────────────────────────────────────────────────────
  const handleVisit = async () => {
    if (!emission?.emission?.label) {
      Alert.alert('Not yet', 'Wait for emission analysis to complete first.');
      return;
    }
    setAwarding(true);
    try {
      const { data } = await api.post('/points/award', {
        placeId:       place.placeId,
        placeName:     place.name,
        placeAddress:  place.address,
        emissionLevel: emission.emission.label,
      });
      setAwarded(true);
      Alert.alert(
        '🌱 Points Earned!',
        data.message,
        [{ text: 'View Points', onPress: () => navigation.navigate('Points') }, { text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Oops', err.message || 'Could not award points.');
    } finally {
      setAwarding(false);
    }
  };

  // ── helpers ─────────────────────────────────────────────────────────────────
  const emMeta = emission ? EMISSION_META[emission.emission?.label] ?? EMISSION_META.medium : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Place photo */}
      {place.photoUrl ? (
        <Image source={{ uri: place.photoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderText}>📍</Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Place info */}
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.address}>{place.address}</Text>
        {place.rating ? (
          <Text style={styles.rating}>⭐ {place.rating} ({place.userRatings} reviews)</Text>
        ) : null}

        <View style={styles.divider} />

        {/* Emission analysis */}
        <Text style={styles.sectionTitle}>♻️ Carbon Emission Analysis</Text>

        {loadingEm ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#6366f1" />
            <Text style={styles.loadingText}>Analysing place image…</Text>
          </View>
        ) : emission ? (
          <>
            {/* ── CO₂ amount hero ─────────────────────────────────────────── */}
            <View style={[styles.co2Hero, { borderColor: emMeta.color + '55' }]}>
              <View style={styles.co2Left}>
                <Text style={styles.co2Emoji}>{emMeta.emoji}</Text>
                <View>
                  <Text style={[styles.co2Tier, { color: emMeta.color }]}>
                    {emMeta.label} Emission
                  </Text>
                  <Text style={styles.co2Conf}>
                    {(emission.emission.confidence * 100).toFixed(1)}% confidence
                  </Text>
                </View>
              </View>
              <Text style={[styles.emissionPoints, { color: emMeta.color }]}>
                +{emMeta.points} pts
              </Text>
            </View>

            {/* ── CO₂ figure card ─────────────────────────────────────────── */}
            {emission.emission.co2_kg_year != null && (
              <View style={[styles.co2Card, { borderColor: emMeta.color + '44' }]}>
                <View style={styles.co2CardRow}>
                  <Text style={styles.co2Icon}>♻️</Text>
                  <View style={styles.co2CardText}>
                    <Text style={styles.co2CardLabel}>Estimated CO₂ Emissions</Text>
                    <Text style={[styles.co2CardValue, { color: emMeta.color }]}>
                      {emission.emission.co2_kg_year >= 1000
                        ? `${(emission.emission.co2_kg_year / 1000).toFixed(1)} t`
                        : `${emission.emission.co2_kg_year} kg`}
                      <Text style={styles.co2Unit}> CO₂e / year</Text>
                    </Text>
                  </View>
                </View>
                <Text style={styles.co2Note}>
                  Weighted estimate from model confidence distribution
                </Text>
              </View>
            )}

            {/* ── Distribution bar ────────────────────────────────────────── */}
            <Text style={styles.distTitle}>Emission probability breakdown</Text>
            <View style={styles.distRow}>
              {Object.entries(emission.emission.distribution).map(([label, prob]) => {
                const meta = EMISSION_META[label] ?? { color: '#555' };
                return (
                  <View
                    key={label}
                    style={[styles.distBar, { flex: prob, backgroundColor: meta.color }]}
                  />
                );
              })}
            </View>
            <View style={styles.distLegend}>
              {Object.entries(emission.emission.distribution).map(([label, prob]) => {
                const meta = EMISSION_META[label] ?? { color: '#555', label: label };
                return (
                  <View key={label} style={styles.distLegendItem}>
                    <Text style={[styles.distLegendLabel, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                    <Text style={[styles.distLegendPct, { color: meta.color }]}>
                      {(prob * 100).toFixed(0)}%
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* ── Top scene ───────────────────────────────────────────────── */}
            {emission.scenes?.[0] && (
              <View style={styles.sceneRow}>
                <Text style={styles.sceneLabel}>📸 Scene: </Text>
                <Text style={styles.sceneValue}>{emission.scenes[0].label}</Text>
              </View>
            )}

            {/* ── Attributes ──────────────────────────────────────────────── */}
            {emission.attributes && (
              <View style={styles.attrRow}>
                {emission.attributes
                  .filter((a) => a.probability > 0.5)
                  .map((a) => (
                    <View key={a.name} style={styles.attrChip}>
                      <Text style={styles.attrChipText}>{a.name.replace(/_/g, ' ')}</Text>
                    </View>
                  ))}
              </View>
            )}
          </>
        ) : (
          <Text style={styles.noEmission}>No photo available – emission analysis skipped.</Text>
        )}

        <View style={styles.divider} />

        {/* CTA */}
        {!awarded ? (
          <TouchableOpacity
            style={[styles.visitBtn, (!emission || awarding) && styles.visitBtnDisabled]}
            onPress={handleVisit}
            disabled={!emission || awarding}
          >
            {awarding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.visitBtnText}>
                ✅ I Visited Here! Earn {emMeta?.points ?? '?'} pts
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.awardedBanner}>
            <Text style={styles.awardedText}>🎉 Points awarded!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#0f0f12' },
  photo:                { width: '100%', height: 220 },
  photoPlaceholder:     { backgroundColor: '#1a1a1f', alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 60 },
  content:              { padding: 20 },
  name:                 { fontSize: 22, fontWeight: '700', color: '#f0f0f2' },
  address:              { fontSize: 14, color: '#8a8a94', marginTop: 4 },
  rating:               { fontSize: 13, color: '#facc15', marginTop: 6 },
  divider:              { height: 1, backgroundColor: '#2a2a32', marginVertical: 20 },
  sectionTitle:         { fontSize: 16, fontWeight: '600', color: '#f0f0f2', marginBottom: 14 },
  loadingRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText:          { color: '#8a8a94', fontSize: 14 },
  // ── Tier header row ──────────────────────────────────────────────────────
  co2Hero: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12,
    backgroundColor: '#1a1a1f',
  },
  co2Left:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  co2Emoji:  { fontSize: 30 },
  co2Tier:   { fontSize: 17, fontWeight: '700' },
  co2Conf:   { fontSize: 12, color: '#8a8a94', marginTop: 2 },
  emissionPoints: { fontSize: 20, fontWeight: '700' },

  // ── CO₂ figure card ───────────────────────────────────────────────────────
  co2Card: {
    borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16,
    backgroundColor: '#141420',
  },
  co2CardRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  co2Icon:      { fontSize: 28 },
  co2CardText:  { flex: 1 },
  co2CardLabel: { color: '#8a8a94', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  co2CardValue: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  co2Unit:      { fontSize: 13, fontWeight: '400', color: '#8a8a94' },
  co2Note:      { color: '#555', fontSize: 10, marginTop: 8, fontStyle: 'italic' },

  // ── Distribution bar ──────────────────────────────────────────────────────
  distTitle:    { color: '#8a8a94', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  distRow:      { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  distBar:      { height: 10 },
  distLegend:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  distLegendItem:  { alignItems: 'center', flex: 1 },
  distLegendLabel: { fontSize: 9, textAlign: 'center' },
  distLegendPct:   { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  sceneRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sceneLabel:     { color: '#8a8a94', fontSize: 14 },
  sceneValue:     { color: '#f0f0f2', fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  attrRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  attrChip:       { backgroundColor: '#2a2a32', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  attrChipText:   { color: '#a0a0aa', fontSize: 12 },
  noEmission:     { color: '#8a8a94', fontSize: 14, fontStyle: 'italic' },
  visitBtn:       { backgroundColor: '#4ade80', borderRadius: 12, padding: 16, alignItems: 'center' },
  visitBtnDisabled: { opacity: 0.4 },
  visitBtnText:   { color: '#0f0f12', fontSize: 16, fontWeight: '700' },
  awardedBanner:  { backgroundColor: '#1a2a1f', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4ade80' },
  awardedText:    { color: '#4ade80', fontSize: 16, fontWeight: '600' },
});
