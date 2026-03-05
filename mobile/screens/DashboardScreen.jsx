import { useEffect, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

const { width } = Dimensions.get('window');

const FEATURE_CARDS = [
  {
    key: 'EmotionScan',
    icon: 'scan',
    title: 'Emotion Scan',
    desc: 'Match places to your mood',
    color: COLORS.primary,
    bg: '#ECFDF5',
  },
  {
    key: 'Points',
    icon: 'leaf',
    title: 'Eco-Points',
    desc: 'Track your green impact',
    color: '#065F46',
    bg: '#F0FDF4',
  },
  {
    key: 'Donate',
    icon: 'heart',
    title: 'Donate',
    desc: 'Convert points to USD',
    color: COLORS.teal,
    bg: '#F0FDFA',
  },
];

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [pointsRes, donationRes] = await Promise.all([
        api.get('/points/balance'),
        api.get('/donations/history')
      ]);

      setData({
        points: pointsRes.data.points,
        history: pointsRes.data.history,
        donations: donationRes.data.history || []
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    navigation.replace('Home');
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Calculate real stats
  const totalPoints = data?.points || 0;
  const greenTrips = data?.history?.length || 0;
  const charityTotalCents = data?.donations?.reduce((sum, d) => sum + (d.amountCents || 0), 0) || 0;
  const charityUSD = (charityTotalCents / 100).toFixed(0);

  // Rough estimate: each point represents ~0.25kg of CO2 saved (weighted by emission levels)
  const co2Saved = (totalPoints * 0.25).toFixed(1);

  const stats = [
    { label: 'CO2 Saved', value: `${co2Saved}kg`, color: COLORS.primary },
    { label: 'Green Trips', value: String(greenTrips), color: COLORS.accent },
    { label: 'Charity', value: `$${charityUSD}`, color: COLORS.secondary },
  ];

  const recentActivity = data?.history?.slice(0, 3) || [];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} tintColor={COLORS.primary} />
        }
      >
        {/* ── Premium Header ────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Traveler'}! 👋</Text>
              <Text style={styles.date}>Discover your green path today</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn}>
              <Image
                source={require('../assets/feelio.jpeg')}
                style={styles.profileImg}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>

          {/* ── Impact Stats (Real Data) ─────────────────────────────────── */}
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Main Feature Grid ──────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Main Features</Text>
        </View>

        <View style={styles.featureGrid}>
          {FEATURE_CARDS.map((card) => (
            <TouchableOpacity
              key={card.key}
              style={[styles.featureCard, { backgroundColor: card.bg }]}
              onPress={() => navigation.navigate(card.key)}
              activeOpacity={0.9}
            >
              <View style={[styles.iconCircle, { backgroundColor: COLORS.white }]}>
                <Ionicons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity / Journey (Real Data) ────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Green Journey</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Points')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.journeyList}>
          {recentActivity.length > 0 ? (
            recentActivity.map((item, idx) => (
              <View key={idx} style={styles.journeyItem}>
                <View style={styles.journeyIcon}>
                  <Ionicons
                    name={item.amount > 30 ? 'bicycle' : 'restaurant'}
                    size={20}
                    color={COLORS.slate600}
                  />
                </View>
                <View style={styles.journeyBody}>
                  <Text style={styles.journeyTitle}>{item.reason || 'Green Activity'}</Text>
                  <Text style={styles.journeyTime}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.journeyPoints}>
                  <Text style={styles.pointsText}>+{item.amount} 🌱</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>No recent activity yet. Start exploring!</Text>
            </View>
          )}
        </View>

        {/* ── Logout Section (Subtle) ────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out Securely</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Floating Navigation (Premium Tab Bar) ──────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home" size={26} color={COLORS.primary} />
          <View style={styles.activeDot} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Places')}>
          <Ionicons name="map-outline" size={26} color={COLORS.slate400} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('EmotionScan')}>
          <Ionicons name="scan" size={30} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Points')}>
          <Ionicons name="leaf-outline" size={26} color={COLORS.slate400} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Donate')}>
          <Ionicons name="heart-outline" size={26} color={COLORS.slate400} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    ...SHADOW,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.slate900,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  profileBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.primaryGhost,
  },
  profileImg: {
    width: '100%',
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate50,
    borderRadius: RADIUS.lg,
    padding: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 32,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate900,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 48) / 2,
    borderRadius: RADIUS.lg,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    ...SHADOW,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOW,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.slate500,
    lineHeight: 16,
  },
  journeyList: {
    paddingHorizontal: 24,
  },
  journeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    ...SHADOW,
  },
  journeyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.slate50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  journeyBody: {
    flex: 1,
  },
  journeyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.slate800,
  },
  journeyTime: {
    fontSize: 12,
    color: COLORS.slate400,
    marginTop: 2,
  },
  journeyPoints: {
    backgroundColor: COLORS.primaryGhost,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  pointsText: {
    color: COLORS.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyActivity: {
    padding: 20,
    alignItems: 'center',
  },
  emptyActivityText: {
    color: COLORS.slate400,
    fontSize: 14,
  },
  logoutBtn: {
    marginTop: 40,
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  logoutText: {
    color: COLORS.slate500,
    fontWeight: '600',
  },

  // ── Tab Bar ─────────────────────────────────────────────────────────────
  tabBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 35,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    ...SHADOW,
    shadowColor: COLORS.slate900,
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
  scanBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.slate900,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 15,
    ...SHADOW,
    shadowColor: COLORS.slate900,
    shadowOpacity: 0.3,
    elevation: 12,
  },
});
