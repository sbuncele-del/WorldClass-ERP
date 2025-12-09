/**
 * Main Application Entry Point
 */

import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';

import { store, persistor } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import config from './src/config/app.config';
import offlineService from './src/services/offline.service';

// Initialize Sentry for error tracking
if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: 1.0,
  });
}

function App() {
  useEffect(() => {
    // Initialize offline database
    offlineService.init().catch((error) => {
      console.error('Failed to initialize offline service:', error);
    });
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <PaperProvider>
            <NavigationContainer>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

export default Sentry.wrap(App);
