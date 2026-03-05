import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Auth screens ──────────────────────────────────────────────────────────────
import HomeScreen    from './screens/HomeScreen';
import LoginScreen   from './screens/LoginScreen';
import SignupScreen  from './screens/SignupScreen';

// ── Main app screens ──────────────────────────────────────────────────────────
import DashboardScreen   from './screens/DashboardScreen';
import EmotionScanScreen from './screens/EmotionScanScreen';
import PlacesScreen      from './screens/PlacesScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import PointsScreen      from './screens/PointsScreen';
import DonateScreen      from './screens/DonateScreen';

const Stack = createNativeStackNavigator();

const sharedScreenOptions = {
  headerStyle:      { backgroundColor: '#1a1a1f' },
  headerTintColor:  '#f0f0f2',
  headerTitleStyle: { fontWeight: '600' },
  contentStyle:     { backgroundColor: '#0f0f12' },
};

function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      {/* ── Public ─────────────────────────────────────────────────────────── */}
      <Stack.Screen name="Home"   component={HomeScreen}   options={{ title: 'Feelio' }} />
      <Stack.Screen name="Login"  component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />

      {/* ── Authenticated ──────────────────────────────────────────────────── */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard', headerBackVisible: false }}
      />
      <Stack.Screen
        name="EmotionScan"
        component={EmotionScanScreen}
        options={{ title: 'Emotion Scan' }}
      />
      <Stack.Screen
        name="Places"
        component={PlacesScreen}
        options={{ title: 'Nearby Places' }}
      />
      <Stack.Screen
        name="PlaceDetail"
        component={PlaceDetailScreen}
        options={({ route }) => ({ title: route.params?.place?.name ?? 'Place Detail' })}
      />
      <Stack.Screen
        name="Points"
        component={PointsScreen}
        options={{ title: 'Eco-Points' }}
      />
      <Stack.Screen
        name="Donate"
        component={DonateScreen}
        options={{ title: 'Donate' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f12' },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
