/**
 * Trips Slice
 * Redux slice for trip state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TripsState, Trip, TripStatus, ProofOfDelivery } from '../../types';
import tripService from '../../services/trip.service';
import offlineService from '../../services/offline.service';

const initialState: TripsState = {
  trips: [],
  currentTrip: null,
  isLoading: false,
  error: null,
  lastSync: null,
};

// Async Thunks
export const fetchTrips = createAsyncThunk(
  'trips/fetchTrips',
  async (status: TripStatus | undefined, { rejectWithValue }) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.getTrips(status);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    }
    
    return [];
  }
);

export const fetchTripById = createAsyncThunk(
  'trips/fetchTripById',
  async (tripId: string, { rejectWithValue }) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.getTripById(tripId);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } else {
      const cached = await offlineService.getCachedTrip(tripId);
      if (cached) {
        return cached;
      }
      return rejectWithValue('Trip not available offline');
    }
  }
);

export const acceptTrip = createAsyncThunk(
  'trips/acceptTrip',
  async (tripId: string, { rejectWithValue }) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.acceptTrip(tripId);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } else {
      await offlineService.addToQueue({
        type: 'ACCEPT_TRIP',
        payload: { tripId },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
      return rejectWithValue('Action queued for when online');
    }
  }
);

export const startTrip = createAsyncThunk(
  'trips/startTrip',
  async (
    { tripId, location }: { tripId: string; location: { lat: number; lng: number } },
    { rejectWithValue }
  ) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.startTrip(tripId, location);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } else {
      await offlineService.addToQueue({
        type: 'START_TRIP',
        payload: { tripId, location },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
      return rejectWithValue('Action queued for when online');
    }
  }
);

export const updateTripStatus = createAsyncThunk(
  'trips/updateTripStatus',
  async (
    { tripId, status, notes }: { tripId: string; status: TripStatus; notes?: string },
    { rejectWithValue }
  ) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.updateTripStatus(tripId, status, notes);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } else {
      await offlineService.addToQueue({
        type: 'UPDATE_TRIP_STATUS',
        payload: { tripId, status, notes },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
      return rejectWithValue('Action queued for when online');
    }
  }
);

export const completeTrip = createAsyncThunk(
  'trips/completeTrip',
  async (
    { tripId, location }: { tripId: string; location: { lat: number; lng: number } },
    { rejectWithValue }
  ) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.completeTrip(tripId, location);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } else {
      await offlineService.addToQueue({
        type: 'COMPLETE_TRIP',
        payload: { tripId, location },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
      return rejectWithValue('Action queued for when online');
    }
  }
);

export const submitPOD = createAsyncThunk(
  'trips/submitPOD',
  async (
    { tripId, pod }: { tripId: string; pod: ProofOfDelivery },
    { rejectWithValue }
  ) => {
    const isOnline = await offlineService.isOnline();
    
    if (isOnline) {
      const response = await tripService.submitProofOfDelivery(tripId, pod);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } else {
      await offlineService.addToQueue({
        type: 'SUBMIT_POD',
        payload: { tripId, pod },
        timestamp: new Date().toISOString(),
        retryCount: 0,
        status: 'pending',
      });
      return rejectWithValue('POD queued for when online');
    }
  }
);

// Slice
const tripsSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    setCurrentTrip: (state, action: PayloadAction<Trip | null>) => {
      state.currentTrip = action.payload;
    },
    updateTrip: (state, action: PayloadAction<Trip>) => {
      const index = state.trips.findIndex((t) => t.trip_id === action.payload.trip_id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      }
      if (state.currentTrip?.trip_id === action.payload.trip_id) {
        state.currentTrip = action.payload;
      }
    },
    addTrip: (state, action: PayloadAction<Trip>) => {
      const exists = state.trips.find((t) => t.trip_id === action.payload.trip_id);
      if (!exists) {
        state.trips.unshift(action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchTrips.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTrips.fulfilled, (state, action: PayloadAction<Trip[]>) => {
      state.isLoading = false;
      state.trips = action.payload;
      state.lastSync = new Date().toISOString();
    });
    builder.addCase(fetchTrips.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    builder.addCase(fetchTripById.fulfilled, (state, action: PayloadAction<Trip>) => {
      const index = state.trips.findIndex((t) => t.trip_id === action.payload.trip_id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      } else {
        state.trips.push(action.payload);
      }
    });

    builder.addCase(acceptTrip.fulfilled, (state, action: PayloadAction<Trip>) => {
      const index = state.trips.findIndex((t) => t.trip_id === action.payload.trip_id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      }
    });

    builder.addCase(startTrip.fulfilled, (state, action: PayloadAction<Trip>) => {
      state.currentTrip = action.payload;
      const index = state.trips.findIndex((t) => t.trip_id === action.payload.trip_id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      }
    });

    builder.addCase(updateTripStatus.fulfilled, (state, action: PayloadAction<Trip>) => {
      const index = state.trips.findIndex((t) => t.trip_id === action.payload.trip_id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      }
      if (state.currentTrip?.trip_id === action.payload.trip_id) {
        state.currentTrip = action.payload;
      }
    });

    builder.addCase(completeTrip.fulfilled, (state, action: PayloadAction<Trip>) => {
      state.currentTrip = null;
      const index = state.trips.findIndex((t) => t.trip_id === action.payload.trip_id);
      if (index !== -1) {
        state.trips[index] = action.payload;
      }
    });
  },
});

export const { setCurrentTrip, updateTrip, addTrip, clearError } = tripsSlice.actions;
export default tripsSlice.reducer;
