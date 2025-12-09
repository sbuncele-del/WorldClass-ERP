# WorldClass Driver Mobile App - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [iOS Deployment](#ios-deployment)
3. [Android Deployment](#android-deployment)
4. [Over-the-Air Updates](#over-the-air-updates)
5. [Environment Configuration](#environment-configuration)
6. [Testing](#testing)
7. [Monitoring](#monitoring)

## Prerequisites

### Required Tools
- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Xcode (for iOS) - macOS only
- Android Studio (for Android)

### Required Accounts
- Expo account (free tier works)
- Apple Developer account ($99/year) - for iOS
- Google Play Console account ($25 one-time) - for Android
- Sentry account (for error tracking)
- Firebase account (for push notifications)

### Backend Requirements
- WorldClass ERP backend running and accessible
- WebSocket endpoint configured
- HTTPS/WSS enabled
- CORS configured for mobile app

## iOS Deployment

### 1. Apple Developer Setup

1. **Create App ID**:
   - Go to Apple Developer portal
   - Register new App ID: `com.worldclass.driverapp`
   - Enable capabilities: Push Notifications, Associated Domains

2. **Create Provisioning Profile**:
   - Create Development profile for testing
   - Create Distribution profile for App Store

3. **Create App in App Store Connect**:
   - Go to App Store Connect
   - Create new app with bundle ID: `com.worldclass.driverapp`
   - Fill in app metadata, screenshots, etc.

### 2. Configure iOS Build

Update `app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.worldclass.driverapp",
      "buildNumber": "1",
      "supportsTablet": true,
      "config": {
        "googleMapsApiKey": "YOUR_IOS_GOOGLE_MAPS_API_KEY"
      }
    }
  }
}
```

Create `eas.json`:
```json
{
  "build": {
    "production": {
      "ios": {
        "distribution": "store",
        "autoIncrement": true
      }
    },
    "preview": {
      "ios": {
        "distribution": "internal",
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### 3. Build iOS App

```bash
# Login to EAS
eas login

# Configure build
eas build:configure

# Build for production
eas build --platform ios --profile production

# Build for TestFlight
eas build --platform ios --profile preview
```

### 4. Submit to App Store

```bash
# Automated submission
eas submit --platform ios --profile production

# Or manually upload .ipa to App Store Connect
```

### 5. TestFlight Distribution

1. Build with preview profile
2. Upload to TestFlight via EAS or manually
3. Add internal/external testers
4. Distribute build

## Android Deployment

### 1. Google Play Setup

1. **Create Application**:
   - Go to Google Play Console
   - Create new app
   - Fill in store listing details

2. **Create Service Account** (for automated uploads):
   - Go to Google Cloud Console
   - Create service account
   - Download JSON key
   - Add to Play Console (Setup > API access)

### 2. Configure Android Build

Update `app.json`:
```json
{
  "expo": {
    "android": {
      "package": "com.worldclass.driverapp",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "RECORD_AUDIO"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ANDROID_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

Update `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### 3. Build Android App

```bash
# Build APK for production
eas build --platform android --profile production

# Build AAB for Play Store
eas build --platform android --profile production
```

### 4. Submit to Google Play

```bash
# Automated submission
eas submit --platform android --profile production

# Or manually upload .aab to Play Console
```

### 5. Release Tracks

1. **Internal Testing**: Quick testing with small group
2. **Closed Testing**: Alpha/Beta testing
3. **Open Testing**: Public beta
4. **Production**: Full release

## Over-the-Air Updates

### Setup CodePush with AppCenter

1. **Install CLI**:
```bash
npm install -g appcenter-cli
appcenter login
```

2. **Create Apps**:
```bash
appcenter apps create -d WorldClassDriver-iOS -o iOS -p React-Native
appcenter apps create -d WorldClassDriver-Android -o Android -p React-Native
```

3. **Get Deployment Keys**:
```bash
appcenter codepush deployment list -a <username>/WorldClassDriver-iOS
appcenter codepush deployment list -a <username>/WorldClassDriver-Android
```

4. **Configure App**:

Install package:
```bash
npm install --save react-native-code-push
```

Add to `App.tsx`:
```typescript
import codePush from "react-native-code-push";

function App() {
  // ... your app code
}

export default codePush({
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESTART
})(App);
```

5. **Deploy Updates**:
```bash
# Deploy to staging
appcenter codepush release-react -a <username>/WorldClassDriver-iOS -d Staging

# Deploy to production
appcenter codepush release-react -a <username>/WorldClassDriver-iOS -d Production

# Mandatory update
appcenter codepush release-react -a <username>/WorldClassDriver-iOS -m
```

## Environment Configuration

### Production Environment Variables

Create `.env.production`:
```env
API_URL=https://api.worldclass-erp.com/api/v1
WS_URL=wss://api.worldclass-erp.com
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
MIXPANEL_TOKEN=your-production-mixpanel-token
```

### Staging Environment Variables

Create `.env.staging`:
```env
API_URL=https://staging-api.worldclass-erp.com/api/v1
WS_URL=wss://staging-api.worldclass-erp.com
SENTRY_DSN=https://your-staging-sentry-dsn@sentry.io/project-id
MIXPANEL_TOKEN=your-staging-mixpanel-token
```

## Testing

### Pre-Deployment Checklist

- [ ] All features tested on iOS
- [ ] All features tested on Android
- [ ] Authentication flow works
- [ ] Trip management works
- [ ] POD capture and submission works
- [ ] Location tracking works
- [ ] Offline mode tested
- [ ] Push notifications tested
- [ ] Biometric authentication tested
- [ ] App icon and splash screen correct
- [ ] All permissions requested properly
- [ ] Error tracking configured
- [ ] Analytics tracking works

### Beta Testing

1. **TestFlight (iOS)**:
   - Upload build to TestFlight
   - Add internal testers (up to 100)
   - Add external testers (up to 10,000)
   - Collect feedback

2. **Internal Testing (Android)**:
   - Upload to Internal Testing track
   - Add tester email addresses
   - Share download link
   - Collect feedback

### Performance Testing

- Test on various device models
- Test on different network conditions
- Monitor memory usage
- Check battery consumption
- Test background location tracking

## Monitoring

### Sentry Setup

1. **Create Sentry Project**:
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Login
sentry-cli login

# Create project
sentry-cli projects create worldclass-driver-app
```

2. **Configure in App**:
Already configured in `App.tsx`:
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: config.SENTRY_DSN,
  enableAutoSessionTracking: true,
  tracesSampleRate: 1.0,
});
```

### Analytics with Mixpanel

1. **Install Mixpanel**:
```bash
npm install mixpanel-react-native
```

2. **Initialize**:
```typescript
import { Mixpanel } from 'mixpanel-react-native';

const mixpanel = new Mixpanel(config.MIXPANEL_TOKEN);
await mixpanel.init();

// Track events
mixpanel.track('Trip Started', { tripId: trip.id });
```

### Firebase Analytics

1. **Setup Firebase**:
```bash
expo install expo-firebase-analytics
```

2. **Configure**:
Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

3. **Track Events**:
```typescript
import * as Analytics from 'expo-firebase-analytics';

Analytics.logEvent('trip_started', { trip_id: trip.id });
```

## Rollback Procedure

### CodePush Rollback
```bash
# Rollback to previous release
appcenter codepush rollback -a <username>/WorldClassDriver-iOS Production

# Rollback to specific label
appcenter codepush rollback -a <username>/WorldClassDriver-iOS Production --target-release v2
```

### App Store/Play Store Rollback

1. **iOS**: Use "Phased Release" to pause rollout
2. **Android**: Use staged rollout and pause/decrease percentage

## Troubleshooting

### Build Issues

**iOS build fails**:
- Check provisioning profiles
- Verify bundle identifier
- Check Xcode version compatibility

**Android build fails**:
- Check Gradle configuration
- Verify package name
- Check Android SDK version

### Submission Issues

**iOS rejection**:
- Review rejection email
- Common issues: missing permissions descriptions, crashes, guideline violations
- Fix and resubmit

**Android rejection**:
- Review Play Console feedback
- Common issues: permissions policy, content ratings, privacy policy
- Update and resubmit

## Support

For deployment assistance:
- Email: devops@worldclass-erp.com
- Slack: #mobile-deployment
- Documentation: https://docs.worldclass-erp.com/mobile

## Changelog

Track version changes and releases:

### Version 1.0.0 (2024-12-09)
- Initial release
- Core trip management features
- POD capture and submission
- Background location tracking
- Offline mode support
- Biometric authentication
