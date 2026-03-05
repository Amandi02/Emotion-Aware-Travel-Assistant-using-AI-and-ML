import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigation.replace('Home');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Greeting */}
      <Text style={styles.greeting}>
        Hey{user?.name ? `, ${user.name}` : ''}! 👋
      </Text>
      <Text style={styles.subtitle}>What would you like to do today?</Text>

      {/* ── Feature cards ───────────────────────────────────────────────────── */}

      {/* Emotion scan */}
      <TouchableOpacity
        style={[styles.card, styles.cardPrimary]}
        onPress={() => navigation.navigate('EmotionScan')}
      >
        <Text style={styles.cardEmoji}>😊</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Scan Your Emotion</Text>
          <Text style={styles.cardDesc}>
            Take a selfie → get 10 eco-friendly place suggestions near you
          </Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </TouchableOpacity>

      {/* Eco-points */}
      <TouchableOpacity
        style={[styles.card, styles.cardGreen]}
        onPress={() => navigation.navigate('Points')}
      >
        <Text style={styles.cardEmoji}>🌱</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Eco-Points</Text>
          <Text style={styles.cardDesc}>
            View your balance and earning history
          </Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </TouchableOpacity>

      {/* Donate */}
      <TouchableOpacity
        style={[styles.card, styles.cardTeal]}
        onPress={() => navigation.navigate('Donate')}
      >
        <Text style={styles.cardEmoji}>💚</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>Donate to Charity</Text>
          <Text style={styles.cardDesc}>
            Convert eco-points into a real USD donation via Stripe
          </Text>
        </View>
        <Text style={styles.cardArrow}>›</Text>
      </TouchableOpacity>

      {/* Pipeline explanation */}
      <View style={styles.pipelineCard}>
        <Text style={styles.pipelineTitle}>How Feelio Works</Text>

        {[
          ['1', '😊', 'Emotion Detection', 'We detect your mood from a quick selfie using AI'],
          ['2', '📍', 'Smart Place Suggestions', 'Google Places finds 10 spots matched to your mood'],
          ['3', '♻️', 'Carbon Emission Score', 'Our sustainability AI rates each place\'s carbon footprint'],
          ['4', '🌱', 'Earn Eco-Points', 'Choose low-emission spots and earn points per visit'],
          ['5', '💚', 'Donate to Charity', 'Convert your points to real USD donations via Stripe'],
        ].map(([num, emoji, title, desc]) => (
          <View key={num} style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{num}</Text></View>
            <Text style={styles.stepEmoji}>{emoji}</Text>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepDesc}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Account */}
      <View style={styles.account}>
        <Text style={styles.accountEmail}>{user?.email}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f0f12', padding: 20 },
  greeting:       { fontSize: 24, fontWeight: '700', color: '#f0f0f2', marginTop: 8 },
  subtitle:       { fontSize: 14, color: '#8a8a94', marginTop: 4, marginBottom: 24 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, padding: 18, marginBottom: 14,
    borderWidth: 1,
  },
  cardPrimary:    { backgroundColor: '#1a1a2f', borderColor: '#6366f144' },
  cardGreen:      { backgroundColor: '#1a2a1a', borderColor: '#4ade8044' },
  cardTeal:       { backgroundColor: '#0f2a26', borderColor: '#2dd4bf44' },
  cardEmoji:      { fontSize: 32 },
  cardText:       { flex: 1 },
  cardTitle:      { color: '#f0f0f2', fontSize: 16, fontWeight: '600' },
  cardDesc:       { color: '#8a8a94', fontSize: 13, marginTop: 3 },
  cardArrow:      { color: '#555', fontSize: 24, fontWeight: '300' },

  pipelineCard: {
    backgroundColor: '#1a1a1f', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a32', padding: 18, marginBottom: 20,
  },
  pipelineTitle:  { color: '#f0f0f2', fontSize: 15, fontWeight: '700', marginBottom: 16 },

  step:           { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepEmoji:      { fontSize: 20, marginTop: -1 },
  stepContent:    { flex: 1 },
  stepTitle:      { color: '#f0f0f2', fontSize: 14, fontWeight: '600' },
  stepDesc:       { color: '#8a8a94', fontSize: 12, marginTop: 2, lineHeight: 17 },

  account:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  accountEmail:   { color: '#555', fontSize: 13 },
  logoutText:     { color: '#8a8a94', fontSize: 14 },
});
