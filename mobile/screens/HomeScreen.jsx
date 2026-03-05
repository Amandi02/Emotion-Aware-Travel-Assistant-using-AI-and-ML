import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* ── Visual Backdrop (Minimalist) ────────────────────────────── */}
        <View style={styles.backdrop}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
        </View>

        {/* ── Logo & Title ────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/feelio.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Feelio</Text>
          <Text style={styles.tagline}>Travel with Emotion · Go Green</Text>
        </View>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <View style={styles.content}>
          <Text style={styles.pitch}>
            Experience the world based on how you feel. Our AI matches your mood to eco-friendly destinations.
          </Text>

          {/* ── Action Pills (Visual Polish) ──────────────────────────── */}
          <View style={styles.pillRow}>
            {['✨ Emotion AI', '📍 Smart Maps', '🌱 Eco Points'].map(p => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <View style={styles.ctaContainer}>
          {!user ? (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => navigation.navigate('Signup')}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryBtnText}>Start Your Journey</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryBtnText}>Already have an account? <Text style={styles.loginLink}>Log in</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('Dashboard')}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryBtnText}>Enter Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <Text style={styles.footer}>Feelio.lk v1.0 • Built for the Planet 🌍</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: -1,
  },
  circle1: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryGhost,
  },
  circle2: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accentGhost,
  },
  hero: {
    alignItems: 'center',
    marginTop: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    ...SHADOW,
    padding: 10,
    marginBottom: 24,
  },
  logo: { width: '100%', height: '100%', borderRadius: 20 },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.slate900,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 8,
  },
  content: {
    alignItems: 'center',
  },
  pitch: {
    textAlign: 'center',
    fontSize: 17,
    color: COLORS.slate500,
    lineHeight: 26,
    marginBottom: 32,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.slate50,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate600,
  },
  ctaContainer: {
    gap: 16,
  },
  primaryBtn: {
    backgroundColor: COLORS.slate900,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: 15,
    color: COLORS.slate500,
    fontWeight: '500',
  },
  loginLink: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate400,
  },
});
