import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', { email, password, name });
      await signup(data.user, data.token);
      navigation.replace('Dashboard');
    } catch (err) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Sign up</Text>
      <Text style={styles.subtitle}>Create your account</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Name (optional)"
        placeholderTextColor="#8a8a94"
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#8a8a94"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        placeholderTextColor="#8a8a94"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.footer}>Already have an account? <Text style={styles.link}>Log in</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '600', color: '#f0f0f2' },
  subtitle: { fontSize: 15, color: '#8a8a94', marginTop: 4, marginBottom: 20 },
  error: { color: '#f87171', marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: '#0f0f12', borderWidth: 1, borderColor: '#2a2a32', borderRadius: 8,
    padding: 14, color: '#f0f0f2', fontSize: 16, marginBottom: 12,
  },
  button: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  footer: { marginTop: 20, color: '#8a8a94', fontSize: 14, textAlign: 'center' },
  link: { color: '#6366f1' },
});
