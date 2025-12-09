/**
 * Authentication Service
 * Handles login, logout, token management, and biometric authentication
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import apiClient from './api.service';
import { User, ApiResponse } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private readonly USER_KEY = 'user';
  private readonly BIOMETRIC_KEY = 'biometricEnabled';
  private readonly ENCRYPTED_CREDENTIALS_KEY = 'encryptedCredentials';

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      
      if (response.success && response.data) {
        await this.saveTokens(response.data.token, response.data.refreshToken);
        await this.saveUser(response.data.user);
      }

      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout and clear all stored data
   */
  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearStorage();
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return null;
      }

      const response = await apiClient.post<{ token: string }>('/auth/refresh', {
        refreshToken,
      });

      if (response.success && response.data?.token) {
        await SecureStore.setItemAsync(this.TOKEN_KEY, response.data.token);
        return response.data.token;
      }

      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(this.USER_KEY);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.TOKEN_KEY);
    } catch (error) {
      console.error('Get access token error:', error);
      return null;
    }
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Get refresh token error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    const user = await this.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Save authentication tokens
   */
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(this.TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Save user data
   */
  private async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Clear all stored authentication data
   */
  private async clearStorage(): Promise<void> {
    await SecureStore.deleteItemAsync(this.TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.USER_KEY);
  }

  /**
   * Check if device supports biometric authentication
   */
  async isBiometricSupported(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  }

  /**
   * Authenticate with biometrics
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access WorldClass Driver',
        fallbackLabel: 'Use password',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(credentials: LoginCredentials): Promise<boolean> {
    try {
      const isSupported = await this.isBiometricSupported();
      if (!isSupported) {
        return false;
      }

      // Encrypt and save credentials
      const encrypted = await this.encryptCredentials(credentials);
      await SecureStore.setItemAsync(this.ENCRYPTED_CREDENTIALS_KEY, encrypted);
      await SecureStore.setItemAsync(this.BIOMETRIC_KEY, 'true');

      return true;
    } catch (error) {
      console.error('Enable biometric error:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(): Promise<void> {
    await SecureStore.deleteItemAsync(this.ENCRYPTED_CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(this.BIOMETRIC_KEY);
  }

  /**
   * Check if biometric is enabled
   */
  async isBiometricEnabled(): Promise<boolean> {
    const enabled = await SecureStore.getItemAsync(this.BIOMETRIC_KEY);
    return enabled === 'true';
  }

  /**
   * Login with biometrics
   */
  async loginWithBiometric(): Promise<ApiResponse<LoginResponse>> {
    try {
      const authenticated = await this.authenticateWithBiometrics();
      if (!authenticated) {
        return {
          success: false,
          error: 'Biometric authentication failed',
        };
      }

      const encryptedCredentials = await SecureStore.getItemAsync(
        this.ENCRYPTED_CREDENTIALS_KEY
      );
      if (!encryptedCredentials) {
        return {
          success: false,
          error: 'No saved credentials found',
        };
      }

      const credentials = await this.decryptCredentials(encryptedCredentials);
      return await this.login(credentials);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric login failed',
      };
    }
  }

  /**
   * Encrypt credentials (simple base64 encoding - in production use proper encryption)
   */
  private async encryptCredentials(credentials: LoginCredentials): Promise<string> {
    const jsonStr = JSON.stringify(credentials);
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      jsonStr
    );
    // In production, use proper encryption like AES
    return Buffer.from(jsonStr).toString('base64') + '.' + digest;
  }

  /**
   * Decrypt credentials
   */
  private async decryptCredentials(encrypted: string): Promise<LoginCredentials> {
    const [encodedData] = encrypted.split('.');
    const jsonStr = Buffer.from(encodedData, 'base64').toString();
    return JSON.parse(jsonStr);
  }
}

export default new AuthService();
