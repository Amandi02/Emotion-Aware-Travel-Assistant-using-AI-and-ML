import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import HomeScreen from './src/screens/HomeScreen';
import ResultScreen from './src/screens/ResultScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#1a1a2e' },
            headerTintColor: '#eee',
            headerTitleStyle: { fontWeight: '600' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Emotion Detection' }} />
          <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Result' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
