import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feelio</Text>
      <Text style={styles.subtitle}>
        {user ? `Welcome back, ${user.name || user.email}.` : 'Sign up or log in to get started.'}
      </Text>
      {!user ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.secondaryText}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.primaryText}>Sign up</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.primaryText}>Go to Dashboard</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#f0f0f2' },
  subtitle: { fontSize: 16, color: '#8a8a94', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primary: { backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: '#2a2a32', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  secondaryText: { color: '#f0f0f2', fontSize: 16 },
});
