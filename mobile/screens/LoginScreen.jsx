import { useState } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { COLORS, SHADOW, RADIUS, SPACING } from '../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await login(data.user, data.token);
      navigation.replace('Dashboard');
    } catch (err) {
      setError(err.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../assets/feelio.jpeg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Continue your green journey with Feelio</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. alex@earth.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Your secure password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnText}>Log In</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.footerText}>New to Feelio? <Text style={styles.greenText}>Create an account</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: COLORS.white,
    padding: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    ...SHADOW,
    padding: 5,
    marginBottom: 24,
  },
  logo: { width: '100%', height: '100%', borderRadius: 15 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.slate900, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.slate500, textAlign: 'center' },

  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 24,
  },
  errorText: { color: COLORS.error, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.slate700, marginLeft: 4 },
  input: {
    height: 56,
    backgroundColor: COLORS.slate50,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.slate900,
    borderWidth: 1,
    borderColor: COLORS.slate100,
  },
  primaryBtn: {
    height: 56,
    backgroundColor: COLORS.slate900,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    ...SHADOW,
  },
  disabled: { backgroundColor: COLORS.slate400 },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },

  footer: { marginTop: 32, alignItems: 'center' },
  footerText: { fontSize: 14, color: COLORS.slate500, fontWeight: '500' },
  greenText: { color: COLORS.primary, fontWeight: '800' },
});
