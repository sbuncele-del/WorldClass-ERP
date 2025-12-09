/**
 * Root Navigator
 * Main navigation structure for the app
 */

import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { checkAuth } from '../store/slices/authSlice';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import TripsListScreen from '../screens/trips/TripsListScreen';
import TripDetailScreen from '../screens/trips/TripDetailScreen';
import ProofOfDeliveryScreen from '../screens/trips/ProofOfDeliveryScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      await dispatch(checkAuth());
      setIsLoading(false);
    };

    checkAuthentication();
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4A90E2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="TripsList"
            component={TripsListScreen}
            options={{ title: 'My Trips' }}
          />
          <Stack.Screen
            name="TripDetail"
            component={TripDetailScreen}
            options={{ title: 'Trip Details' }}
          />
          <Stack.Screen
            name="ProofOfDelivery"
            component={ProofOfDeliveryScreen}
            options={{ title: 'Proof of Delivery' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
