/**
 * Settings Slice
 * Redux state management for app settings
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings } from '../../types';

const initialState: AppSettings = {
  darkMode: false,
  gpsUpdateInterval: 30000, // 30 seconds
  offlineSyncEnabled: true,
  biometricAuthEnabled: false,
  voiceInputEnabled: false,
  language: 'en',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
      AsyncStorage.setItem('darkMode', action.payload.toString());
    },
    setGPSUpdateInterval: (state, action: PayloadAction<number>) => {
      state.gpsUpdateInterval = action.payload;
      AsyncStorage.setItem('gpsUpdateInterval', action.payload.toString());
    },
    setOfflineSyncEnabled: (state, action: PayloadAction<boolean>) => {
      state.offlineSyncEnabled = action.payload;
      AsyncStorage.setItem('offlineSyncEnabled', action.payload.toString());
    },
    setBiometricAuthEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricAuthEnabled = action.payload;
      AsyncStorage.setItem('biometricAuthEnabled', action.payload.toString());
    },
    setVoiceInputEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceInputEnabled = action.payload;
      AsyncStorage.setItem('voiceInputEnabled', action.payload.toString());
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      AsyncStorage.setItem('language', action.payload);
    },
    loadSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      return { ...state, ...action.payload };
    },
  },
});

export const {
  setDarkMode,
  setGPSUpdateInterval,
  setOfflineSyncEnabled,
  setBiometricAuthEnabled,
  setVoiceInputEnabled,
  setLanguage,
  loadSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;

// Helper to load settings from storage
export const loadStoredSettings = async () => {
  const settings: Partial<AppSettings> = {};

  const darkMode = await AsyncStorage.getItem('darkMode');
  if (darkMode) settings.darkMode = darkMode === 'true';

  const gpsUpdateInterval = await AsyncStorage.getItem('gpsUpdateInterval');
  if (gpsUpdateInterval) settings.gpsUpdateInterval = parseInt(gpsUpdateInterval, 10);

  const offlineSyncEnabled = await AsyncStorage.getItem('offlineSyncEnabled');
  if (offlineSyncEnabled) settings.offlineSyncEnabled = offlineSyncEnabled === 'true';

  const biometricAuthEnabled = await AsyncStorage.getItem('biometricAuthEnabled');
  if (biometricAuthEnabled) settings.biometricAuthEnabled = biometricAuthEnabled === 'true';

  const voiceInputEnabled = await AsyncStorage.getItem('voiceInputEnabled');
  if (voiceInputEnabled) settings.voiceInputEnabled = voiceInputEnabled === 'true';

  const language = await AsyncStorage.getItem('language');
  if (language) settings.language = language;

  return settings;
};
