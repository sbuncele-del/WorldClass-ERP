/**
 * Auth Slice
 * Redux slice for authentication state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../types';
import authService, { LoginCredentials, LoginResponse } from '../../services/auth.service';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  biometricEnabled: false,
};

// Async Thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    const response = await authService.login(credentials);
    if (!response.success) {
      return rejectWithValue(response.error);
    }
    return response.data;
  }
);

export const loginWithBiometric = createAsyncThunk(
  'auth/loginWithBiometric',
  async (_, { rejectWithValue }) => {
    const response = await authService.loginWithBiometric();
    if (!response.success) {
      return rejectWithValue(response.error);
    }
    return response.data;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  const isAuthenticated = await authService.isAuthenticated();
  if (isAuthenticated) {
    const user = await authService.getCurrentUser();
    const token = await authService.getAccessToken();
    const refreshToken = await authService.getRefreshToken();
    const biometricEnabled = await authService.isBiometricEnabled();
    return { user, token, refreshToken, biometricEnabled };
  }
  return null;
});

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    const success = await authService.enableBiometric(credentials);
    if (!success) {
      return rejectWithValue('Failed to enable biometric authentication');
    }
    return true;
  }
);

export const disableBiometric = createAsyncThunk('auth/disableBiometric', async () => {
  await authService.disableBiometric();
});

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(login.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(login.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.error = null;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.error = action.payload as string;
    });

    builder.addCase(loginWithBiometric.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loginWithBiometric.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.error = null;
    });
    builder.addCase(loginWithBiometric.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(logout.fulfilled, (state) => {
      return initialState;
    });

    builder.addCase(checkAuth.fulfilled, (state, action) => {
      if (action.payload) {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.biometricEnabled = action.payload.biometricEnabled;
      }
    });

    builder.addCase(enableBiometric.fulfilled, (state) => {
      state.biometricEnabled = true;
    });

    builder.addCase(disableBiometric.fulfilled, (state) => {
      state.biometricEnabled = false;
    });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
