/**
 * PointsScreen
 *
 * Shows the user's current eco-points balance, conversion rate to USD,
 * recent earning history and a button to the DonateScreen.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';

const EMISSION_EMOJI = {
  very_low: '🌿', low: '🌱', medium: '🌤️', high: '🏭', very_high: '⚠️',
};

export default function PointsScreen({ navigation }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data: d } = await api.get('/points/balance');
      setData(d);
    } catch {
      // silently fail – user sees previous data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh whenever tab gains focus (e.g. after returning from PlaceDetail)
  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const { points = 0, dollarsValue = '0.00', conversionRate, history = [] } = data ?? {};

  const renderHistoryItem = ({ item }) => (
    <View style={styles.histItem}>
      <Text style={styles.histEmoji}>
        {EMISSION_EMOJI[item.emissionLevel] ?? '📍'}
      </Text>
      <View style={styles.histInfo}>
        <Text style={styles.histReason} numberOfLines={1}>{item.reason}</Text>
        <Text style={styles.histDate}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.histAmount, item.amount > 0 ? styles.positive : styles.zero]}>
        {item.amount > 0 ? `+${item.amount}` : item.amount}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Eco-Points</Text>
        <Text style={styles.balanceValue}>{points.toLocaleString()}</Text>
        <Text style={styles.balanceDollar}>≈ ${dollarsValue} USD</Text>
        <Text style={styles.convRate}>{conversionRate}</Text>
      </View>

      {/* Donate CTA */}
      <TouchableOpacity
        style={styles.donateBtn}
        onPress={() => navigation.navigate('Donate')}
      >
        <Text style={styles.donateBtnText}>💚 Donate to Charity via Stripe</Text>
      </TouchableOpacity>
      {points < 100 && (
        <Text style={styles.donateHint}>
          Earn eco-points by visiting low-emission places to donate
        </Text>
      )}

      {/* Scan button shortcut */}
      <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('EmotionScan')}>
        <Text style={styles.scanBtnText}>📷 Scan Emotion → Find Places</Text>
      </TouchableOpacity>

      {/* History */}
      <Text style={styles.histTitle}>Recent Activity</Text>
      <FlatList
        data={history}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderHistoryItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#6366f1" />
        }
        ListEmptyComponent={
          <Text style={styles.histEmpty}>
            No activity yet.{'\n'}Visit eco-friendly places to earn points!
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f0f12', padding: 20 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f12' },
  balanceCard: {
    backgroundColor: '#1a2a1a', borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#4ade8044', marginBottom: 16,
  },
  balanceLabel:     { color: '#4ade80', fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  balanceValue:     { color: '#f0f0f2', fontSize: 52, fontWeight: '800', marginTop: 4 },
  balanceDollar:    { color: '#4ade80', fontSize: 22, fontWeight: '600', marginTop: 4 },
  convRate:         { color: '#8a8a94', fontSize: 12, marginTop: 6 },
  donateBtn: {
    backgroundColor: '#4ade80', borderRadius: 12, padding: 15,
    alignItems: 'center', marginBottom: 10,
  },
  donateBtnText:     { color: '#0f0f12', fontSize: 16, fontWeight: '700' },
  donateHint:        { color: '#8a8a94', fontSize: 12, textAlign: 'center', marginTop: -4, marginBottom: 6 },
  scanBtn: {
    backgroundColor: '#1a1a2f', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#6366f144', marginBottom: 24,
  },
  scanBtnText:    { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  histTitle:      { color: '#f0f0f2', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  histItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1f',
  },
  histEmoji:      { fontSize: 24 },
  histInfo:       { flex: 1 },
  histReason:     { color: '#f0f0f2', fontSize: 14 },
  histDate:       { color: '#8a8a94', fontSize: 12, marginTop: 2 },
  histAmount:     { fontSize: 16, fontWeight: '700' },
  positive:       { color: '#4ade80' },
  zero:           { color: '#8a8a94' },
  histEmpty: {
    color: '#8a8a94', textAlign: 'center', marginTop: 32,
    fontSize: 14, lineHeight: 22,
  },
});
