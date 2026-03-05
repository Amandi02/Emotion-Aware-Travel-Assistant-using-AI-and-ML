import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { COLORS } from './theme';

// ── Auth screens ──────────────────────────────────────────────────────────────
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';

// ── Main app screens ──────────────────────────────────────────────────────────
import DashboardScreen from './screens/DashboardScreen';
import EmotionScanScreen from './screens/EmotionScanScreen';
import PlacesScreen from './screens/PlacesScreen';
import PlaceDetailScreen from './screens/PlaceDetailScreen';
import PointsScreen from './screens/PointsScreen';
import DonateScreen from './screens/DonateScreen';

const Stack = createNativeStackNavigator();

const sharedScreenOptions = {
  headerStyle: { backgroundColor: COLORS.white },
  headerTintColor: COLORS.slate900,
  headerTitleStyle: { fontWeight: '800', color: COLORS.slate900, fontSize: 18 },
  contentStyle: { backgroundColor: COLORS.white },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
};

function AppNavigator() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <Image
          source={require('./assets/feelio.jpeg')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingSpinner} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={sharedScreenOptions}>
      {/* ── Public ─────────────────────────────────────────────────────────── */}
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: '' }} />
      <Stack.Screen name="Signup" component={SignupScreen} options={{ title: '' }} />

      {/* ── Authenticated ──────────────────────────────────────────────────── */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EmotionScan"
        component={EmotionScanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Places"
        component={PlacesScreen}
        options={{ headerShown: false }}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  loadingLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 16,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="dark" backgroundColor={COLORS.bg} />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
