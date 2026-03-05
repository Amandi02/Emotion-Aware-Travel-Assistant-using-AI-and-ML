/**
 * PointsScreen - Modern Premium Theme
 */

import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { COLORS, SHADOW, SHADOW_LG, RADIUS } from '../theme';

const EMISSION_ICON = {
  very_low: 'leaf',
  low: 'leaf-outline',
  medium: 'partly-sunny-outline',
  high: 'business-outline',
  very_high: 'warning-outline',
};

const EMISSION_COLOR = {
  very_low: COLORS.emVeryLow,
  low: COLORS.emLow,
  medium: COLORS.emMedium,
  high: COLORS.emHigh,
  very_high: COLORS.emVeryHigh,
};

export default function PointsScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data: d } = await api.get('/points/balance');
      setData(d);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const { points = 0, dollarsValue = '0.00', conversionRate, history = [] } = data ?? {};

  const renderHistoryItem = ({ item }) => (
    <View style={styles.histItem}>
      <View style={[styles.histIconWrap, { backgroundColor: (EMISSION_COLOR[item.emissionLevel] || COLORS.slate100) + '15' }]}>
        <Ionicons
          name={EMISSION_ICON[item.emissionLevel] || 'location'}
          size={22}
          color={EMISSION_COLOR[item.emissionLevel] || COLORS.slate400}
        />
      </View>
      <View style={styles.histInfo}>
        <Text style={styles.histReason} numberOfLines={1}>{item.reason}</Text>
        <Text style={styles.histDate}>
          {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
      <View style={styles.histAmountWrap}>
        <Text style={[styles.histAmount, item.amount > 0 ? styles.positive : styles.neutral]}>
          {item.amount > 0 ? `+${item.amount}` : item.amount}
        </Text>
        <Text style={styles.histUnit}>PTS</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={COLORS.slate800} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impact Portfolio</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Balance Card ─────────────────────────────────────────── */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="leaf" size={16} color={COLORS.primaryDark} />
                <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
              </View>
              <Text style={styles.balanceValue}>{points.toLocaleString()}</Text>
              <View style={styles.valuationRow}>
                <Text style={styles.valuationText}>≈ ${dollarsValue}</Text>
                <Text style={styles.valuationSub}> USD Impact</Text>
              </View>
              {conversionRate && (
                <View style={styles.rateChip}>
                  <Text style={styles.rateText}>{conversionRate}</Text>
                </View>
              )}
            </View>

            {/* ── Action Grid ─────────────────────────────────────────── */}
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.donateAction}
                onPress={() => navigation.navigate('Donate')}
                activeOpacity={0.9}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name="heart" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.actionTitle}>Donate</Text>
                <Text style={styles.actionSub}>via Stripe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scanAction}
                onPress={() => navigation.navigate('EmotionScan')}
                activeOpacity={0.9}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: COLORS.slate900 }]}>
                  <Ionicons name="camera" size={24} color={COLORS.white} />
                </View>
                <Text style={styles.actionTitle}>Earn</Text>
                <Text style={styles.actionSub}>Check-in</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="leaf-outline" size={64} color={COLORS.slate100} />
            <Text style={styles.emptyTitle}>Your impact starts here</Text>
            <Text style={styles.emptySub}>Record your mood or visit eco-friendly spots to see your portfolio grow!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.slate900 },

  balanceCard: {
    backgroundColor: COLORS.primaryGhost,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  balanceLabel: { fontSize: 13, fontWeight: '800', color: COLORS.primaryDark, letterSpacing: 1 },
  balanceValue: { fontSize: 56, fontWeight: '900', color: COLORS.slate900, marginBottom: 8 },
  valuationRow: { flexDirection: 'row', alignItems: 'baseline' },
  valuationText: { fontSize: 24, fontWeight: '800', color: COLORS.primaryDeep },
  valuationSub: { fontSize: 14, color: COLORS.slate500, fontWeight: '600' },
  rateChip: { marginTop: 16, backgroundColor: 'rgba(255, 255, 255, 0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  rateText: { fontSize: 11, color: COLORS.slate400, fontWeight: '700' },

  actionGrid: { flexDirection: 'row', gap: 16, marginBottom: 40 },
  donateAction: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    ...SHADOW,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
  },
  scanAction: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate100,
    ...SHADOW,
    shadowOpacity: 0.05,
  },
  actionIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionTitle: { fontSize: 16, fontWeight: '900', color: COLORS.slate900 },
  actionSub: { fontSize: 12, fontWeight: '600', color: COLORS.slate400, marginTop: 2 },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: COLORS.slate900, marginBottom: 20 },

  histItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate50,
  },
  histIconWrap: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  histInfo: { flex: 1, marginLeft: 16 },
  histReason: { fontSize: 16, fontWeight: '700', color: COLORS.slate800, marginBottom: 4 },
  histDate: { fontSize: 12, color: COLORS.slate400, fontWeight: '500' },
  histAmountWrap: { alignItems: 'flex-end' },
  histAmount: { fontSize: 18, fontWeight: '900' },
  histUnit: { fontSize: 10, fontWeight: '800', color: COLORS.slate400, marginTop: 2 },
  positive: { color: COLORS.primaryDeep },
  neutral: { color: COLORS.slate400 },

  emptyBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: COLORS.slate900, marginTop: 24, marginBottom: 12 },
  emptySub: { fontSize: 15, color: COLORS.slate400, textAlign: 'center', lineHeight: 22 },
});
