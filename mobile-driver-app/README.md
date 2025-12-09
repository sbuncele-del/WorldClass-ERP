# WorldClass Driver Mobile App

A production-ready React Native mobile application for logistics drivers, built with Expo, TypeScript, and Redux.

## Overview

The WorldClass Driver Mobile App is designed for delivery drivers to manage their trips, capture proof of delivery, and track locations in real-time. It integrates seamlessly with the WorldClass ERP backend system.

## Features

### Core Features
- ✅ **JWT Authentication** - Secure login with token management
- ✅ **Biometric Authentication** - Touch ID / Face ID support
- ✅ **Real-time Trip Management** - WebSocket integration for live updates
- ✅ **Trip Status Updates** - Accept, start, delay, and complete trips
- ✅ **Proof of Delivery** - Photo capture, signature, GPS, and timestamp
- ✅ **Location Tracking** - Background GPS tracking every 30 seconds
- ✅ **Offline Mode** - SQLite-based offline storage and queue
- ⏳ **Push Notifications** - Firebase Cloud Messaging (FCM)
- ⏳ **QR/Barcode Scanning** - Package verification
- ⏳ **Voice-to-Text** - Notes entry via speech
- ⏳ **Maps Integration** - React Native Maps for navigation

### Technical Stack
- **Framework**: React Native (Expo SDK 50)
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Persistence**: Redux Persist + SQLite
- **Navigation**: React Navigation 6
- **Real-time**: Socket.io Client
- **HTTP Client**: Axios
- **UI Components**: React Native Paper
- **Error Tracking**: Sentry

## Prerequisites

- Node.js 16+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator
- Expo Go app (for testing on physical devices)

## Installation

### 1. Install Dependencies

```bash
cd mobile-driver-app
npm install
```

### 2. Configure Environment

Create a `.env` file in the `mobile-driver-app` directory:

```env
# API Configuration
API_URL=https://api.worldclass-erp.com/api/v1
WS_URL=wss://api.worldclass-erp.com

# Sentry DSN (optional)
SENTRY_DSN=your-sentry-dsn

# Analytics (optional)
MIXPANEL_TOKEN=your-mixpanel-token

# Google Maps API Keys
GOOGLE_MAPS_IOS_KEY=your-ios-key
GOOGLE_MAPS_ANDROID_KEY=your-android-key
```

### 3. Update app.json

Update the `app.json` file with your project details:
- Bundle identifiers
- Google Maps API keys
- EAS project ID

## Development

### Start Development Server

```bash
npm start
```

This will start the Expo development server. You can then:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan the QR code with Expo Go app on your phone

### Run on iOS

```bash
npm run ios
```

### Run on Android

```bash
npm run android
```

### Linting

```bash
npm run lint
```

### Testing

```bash
npm test
```

## Project Structure

```
mobile-driver-app/
├── App.tsx                     # Main application entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript configuration
└── src/
    ├── components/             # Reusable UI components
    │   ├── common/             # Common components
    │   ├── trips/              # Trip-related components
    │   └── camera/             # Camera components
    ├── config/                 # App configuration
    │   └── app.config.ts       # Environment config
    ├── navigation/             # Navigation setup
    │   └── RootNavigator.tsx   # Main navigator
    ├── screens/                # Screen components
    │   ├── auth/               # Authentication screens
    │   ├── trips/              # Trip screens
    │   └── settings/           # Settings screens
    ├── services/               # API and external services
    │   ├── api.service.ts      # HTTP client
    │   ├── auth.service.ts     # Authentication
    │   ├── trip.service.ts     # Trip management
    │   ├── location.service.ts # GPS tracking
    │   ├── websocket.service.ts # Real-time updates
    │   └── offline.service.ts  # Offline storage
    ├── store/                  # Redux store
    │   ├── index.ts            # Store configuration
    │   ├── hooks.ts            # Typed Redux hooks
    │   └── slices/             # Redux slices
    │       ├── authSlice.ts    # Auth state
    │       └── tripsSlice.ts   # Trips state
    ├── types/                  # TypeScript types
    │   └── index.ts            # Type definitions
    └── utils/                  # Utility functions
```

## Key Services

### API Service
Handles all HTTP requests with automatic token refresh and error handling.

```typescript
import apiClient from './services/api.service';

const response = await apiClient.get('/trips');
```

### Authentication Service
Manages login, logout, token storage, and biometric authentication.

```typescript
import authService from './services/auth.service';

await authService.login({ email, password });
await authService.loginWithBiometric();
```

### Location Service
Handles GPS tracking and location updates.

```typescript
import locationService from './services/location.service';

await locationService.startBackgroundTracking(driverId, vehicleId, tripId);
```

### WebSocket Service
Real-time communication for trip assignments and updates.

```typescript
import websocketService from './services/websocket.service';

await websocketService.connect();
websocketService.on('trip:assigned', (data) => {
  console.log('New trip assigned:', data);
});
```

### Offline Service
SQLite-based offline storage for trips and location data.

```typescript
import offlineService from './services/offline.service';

await offlineService.init();
await offlineService.addToQueue(action);
```

## Building for Production

### iOS Build

1. **Prerequisites**:
   - Apple Developer account
   - Xcode installed
   - EAS CLI installed (`npm install -g eas-cli`)

2. **Configure EAS**:
```bash
eas login
eas build:configure
```

3. **Build**:
```bash
eas build --platform ios
```

### Android Build

1. **Prerequisites**:
   - Google Play Console account
   - Android Studio installed
   - EAS CLI installed

2. **Build**:
```bash
eas build --platform android
```

### Over-the-Air Updates with CodePush

1. **Install CodePush**:
```bash
npm install -g appcenter-cli
appcenter login
```

2. **Create CodePush apps**:
```bash
appcenter apps create -d WorldClassDriver-iOS -o iOS -p React-Native
appcenter apps create -d WorldClassDriver-Android -o Android -p React-Native
```

3. **Deploy update**:
```bash
appcenter codepush release-react -a <username>/WorldClassDriver-iOS
appcenter codepush release-react -a <username>/WorldClassDriver-Android
```

## Configuration

### Backend Integration

The app connects to the WorldClass ERP backend. Ensure the following endpoints are available:

- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/logistics/trips` - Get trips
- `POST /api/v1/logistics/trips/:id/start` - Start trip
- `POST /api/v1/logistics/trips/:id/pod` - Submit POD
- `POST /api/v1/logistics/gps/location` - Location updates
- `WebSocket: wss://api.domain.com/logistics-ws` - Real-time updates

### Permissions

The app requires the following permissions:

**iOS (Info.plist)**:
- NSCameraUsageDescription
- NSLocationWhenInUseUsageDescription
- NSLocationAlwaysAndWhenInUseUsageDescription
- NSMicrophoneUsageDescription

**Android (AndroidManifest.xml)**:
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION
- CAMERA
- RECORD_AUDIO

## Security

### Data Encryption
- Tokens stored in Expo SecureStore
- Credentials encrypted before storage
- HTTPS for all API communications
- WSS for WebSocket connections

### Authentication
- JWT token-based authentication
- Automatic token refresh
- Biometric authentication support
- Auto-logout after inactivity

### Privacy Compliance
- GDPR/CCPA compliant data handling
- User consent for location tracking
- Data retention policies
- Secure data deletion

## Troubleshooting

### Common Issues

**Issue**: App won't connect to backend
- Check API_URL in configuration
- Verify backend is running and accessible
- Check network connectivity

**Issue**: Location tracking not working
- Ensure location permissions are granted
- Check that background location is enabled
- Verify location services are turned on

**Issue**: Biometric authentication fails
- Check device has biometric hardware
- Verify biometric data is enrolled
- Ensure permissions are granted

**Issue**: Photos not uploading
- Check camera permissions
- Verify file size is under limit
- Check network connectivity

## Support

For issues or questions:
- Email: support@worldclass-erp.com
- Documentation: https://docs.worldclass-erp.com
- GitHub Issues: https://github.com/your-org/WorldClass-ERP/issues

## License

Proprietary - WorldClass ERP

## Contributors

- Development Team @ WorldClass ERP
- Built with ❤️ for logistics professionals
