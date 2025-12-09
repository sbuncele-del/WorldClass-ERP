# WorldClass Driver Mobile App - Testing Plan

## Overview

This document outlines the comprehensive testing strategy for the WorldClass Driver Mobile App, covering unit tests, integration tests, E2E tests, and manual testing procedures.

## Test Environment Setup

### Prerequisites
- Node.js 16+ installed
- iOS Simulator or Android Emulator configured
- Physical devices for real-world testing
- Backend API running (staging environment)

### Installation
```bash
cd mobile-driver-app
npm install
```

## Unit Testing

### Framework
- Jest for JavaScript/TypeScript testing
- React Native Testing Library for component testing

### Running Unit Tests
```bash
npm test                 # Run all tests
npm test -- --watch      # Run in watch mode
npm test -- --coverage   # Run with coverage report
```

### Test Coverage Goals
- Services: 80%+ coverage
- Redux slices: 90%+ coverage
- Components: 70%+ coverage
- Utilities: 90%+ coverage

### Unit Test Examples

#### Authentication Service Tests
```typescript
// src/services/__tests__/auth.service.test.ts
describe('AuthService', () => {
  it('should login successfully with valid credentials', async () => {
    const response = await authService.login({
      email: 'driver@example.com',
      password: 'password123',
    });
    expect(response.success).toBe(true);
    expect(response.data?.token).toBeDefined();
  });

  it('should handle login failure with invalid credentials', async () => {
    const response = await authService.login({
      email: 'invalid@example.com',
      password: 'wrongpassword',
    });
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
```

#### Trip Service Tests
```typescript
// src/services/__tests__/trip.service.test.ts
describe('TripService', () => {
  it('should fetch trips successfully', async () => {
    const response = await tripService.getTrips();
    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
  });

  it('should start trip with location', async () => {
    const location = { lat: 40.7128, lng: -74.0060 };
    const response = await tripService.startTrip('trip-123', location);
    expect(response.success).toBe(true);
  });
});
```

## Integration Testing

### Component Integration Tests

#### Login Screen Tests
```typescript
// src/screens/auth/__tests__/LoginScreen.test.tsx
describe('LoginScreen', () => {
  it('should render login form', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Email')).toBeDefined();
    expect(getByPlaceholderText('Password')).toBeDefined();
  });

  it('should handle login submission', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Email'), 'driver@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });
});
```

#### Trips List Tests
```typescript
// src/screens/trips/__tests__/TripsListScreen.test.tsx
describe('TripsListScreen', () => {
  it('should display list of trips', async () => {
    const { getByText } = render(<TripsListScreen />);
    
    await waitFor(() => {
      expect(getByText(/Trip #/)).toBeDefined();
    });
  });

  it('should filter trips by status', async () => {
    const { getByText, queryByText } = render(<TripsListScreen />);
    
    fireEvent.press(getByText('In Progress'));
    
    await waitFor(() => {
      expect(queryByText('completed')).toBeNull();
    });
  });
});
```

## Manual Testing

### Test Cases

#### 1. Authentication Flow

**Test Case 1.1: User Login**
- **Steps**:
  1. Open app
  2. Enter valid email and password
  3. Tap "Login" button
- **Expected**: User successfully logs in and sees trips list
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 1.2: Biometric Login**
- **Steps**:
  1. Enable biometric authentication in settings
  2. Logout
  3. Tap "Use Biometric Login"
  4. Authenticate with Face ID/Touch ID
- **Expected**: User successfully logs in
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 1.3: Invalid Credentials**
- **Steps**:
  1. Enter invalid email/password
  2. Tap "Login" button
- **Expected**: Error message displayed
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

#### 2. Trip Management

**Test Case 2.1: View Trips List**
- **Steps**:
  1. Login successfully
  2. View trips list
- **Expected**: List of assigned trips displayed
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 2.2: Accept Trip**
- **Steps**:
  1. Select a trip with "assigned" status
  2. Tap "Accept Trip"
  3. Confirm acceptance
- **Expected**: Trip status changes to "accepted"
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 2.3: Start Trip**
- **Steps**:
  1. Select accepted trip
  2. Tap "Start Trip"
  3. Confirm start
- **Expected**: Trip status changes to "in_progress", location tracking starts
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 2.4: Report Delay**
- **Steps**:
  1. Select in-progress trip
  2. Tap "Report Delay"
  3. Enter delay reason
  4. Submit
- **Expected**: Trip status changes to "delayed", notification sent
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

#### 3. Proof of Delivery

**Test Case 3.1: Capture Photos**
- **Steps**:
  1. Open POD screen
  2. Tap "Add Photo"
  3. Take photo with camera
  4. Review captured photo
- **Expected**: Photo captured and displayed
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 3.2: Capture Signature**
- **Steps**:
  1. Tap "Capture Signature"
  2. Draw signature
  3. Confirm signature
- **Expected**: Signature captured and displayed
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 3.3: Submit POD**
- **Steps**:
  1. Capture photos and signature
  2. Enter recipient name
  3. Add notes
  4. Tap "Submit & Complete Delivery"
- **Expected**: POD submitted, trip completed, returns to trips list
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

#### 4. Location Tracking

**Test Case 4.1: Background Tracking**
- **Steps**:
  1. Start a trip
  2. Minimize app
  3. Move to different location
  4. Return to app after 1 minute
- **Expected**: Location updates sent to backend
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 4.2: Location Permission**
- **Steps**:
  1. Deny location permission
  2. Attempt to start trip
- **Expected**: Permission request shown, trip cannot start without permission
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

#### 5. Offline Mode

**Test Case 5.1: Offline Actions Queue**
- **Steps**:
  1. Turn off internet
  2. Accept a trip
  3. Update trip status
  4. Turn on internet
- **Expected**: Actions queued offline, synced when online
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 5.2: Offline Data Access**
- **Steps**:
  1. View trips while online
  2. Turn off internet
  3. View trips list again
- **Expected**: Cached trips displayed
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

#### 6. Real-time Updates

**Test Case 6.1: Trip Assignment Notification**
- **Steps**:
  1. Have dispatcher assign new trip to driver
  2. Wait for notification
- **Expected**: Real-time notification received, trip appears in list
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

**Test Case 6.2: Trip Status Update**
- **Steps**:
  1. Have dispatcher update trip status
  2. Observe app
- **Expected**: Trip status updates in real-time
- **Status**: [ ] Pass [ ] Fail
- **Notes**: _______________________

## Performance Testing

### Test Scenarios

#### 1. App Launch Time
- **Metric**: Time from app icon tap to login screen
- **Target**: < 3 seconds
- **Test**: Launch app 10 times, calculate average
- **Result**: _______ seconds

#### 2. Login Response Time
- **Metric**: Time from login tap to trips list
- **Target**: < 2 seconds
- **Test**: Login 10 times, calculate average
- **Result**: _______ seconds

#### 3. Location Update Frequency
- **Metric**: Location updates per minute
- **Target**: 2 updates (every 30 seconds)
- **Test**: Monitor for 5 minutes
- **Result**: _______ updates/minute

#### 4. Battery Consumption
- **Metric**: Battery drain per hour with background tracking
- **Target**: < 10% per hour
- **Test**: Monitor battery over 1 hour with active trip
- **Result**: _______ % per hour

#### 5. Memory Usage
- **Metric**: Average memory consumption
- **Target**: < 150 MB
- **Test**: Monitor memory during typical usage
- **Result**: _______ MB

## Security Testing

### Test Cases

#### 1. Token Storage
- **Test**: Verify tokens stored in SecureStore
- **Expected**: Tokens encrypted and not accessible
- **Status**: [ ] Pass [ ] Fail

#### 2. API Communication
- **Test**: Monitor network traffic
- **Expected**: All API calls use HTTPS
- **Status**: [ ] Pass [ ] Fail

#### 3. Biometric Security
- **Test**: Attempt biometric bypass
- **Expected**: Biometric authentication required
- **Status**: [ ] Pass [ ] Fail

#### 4. Data Encryption
- **Test**: Export app data
- **Expected**: Sensitive data encrypted
- **Status**: [ ] Pass [ ] Fail

## Device Testing Matrix

### iOS Devices
- [ ] iPhone 14 Pro (iOS 17)
- [ ] iPhone 13 (iOS 16)
- [ ] iPhone 12 (iOS 15)
- [ ] iPhone SE 2nd Gen (iOS 15)
- [ ] iPad Pro 12.9" (iPadOS 17)

### Android Devices
- [ ] Samsung Galaxy S23 (Android 13)
- [ ] Google Pixel 7 (Android 13)
- [ ] Samsung Galaxy A53 (Android 12)
- [ ] OnePlus 9 (Android 12)
- [ ] Samsung Galaxy Tab S8 (Android 12)

## Network Conditions Testing

Test app behavior under various network conditions:

- [ ] WiFi (Good connection)
- [ ] 4G LTE (Good connection)
- [ ] 3G (Moderate connection)
- [ ] 2G (Poor connection)
- [ ] Airplane mode (No connection)
- [ ] Intermittent connection

## Regression Testing

Before each release, run complete regression test suite:

1. Authentication (all test cases)
2. Trip Management (all test cases)
3. POD Capture (all test cases)
4. Location Tracking (all test cases)
5. Offline Mode (all test cases)
6. Real-time Updates (all test cases)

## Bug Tracking

### Bug Report Template

**Bug ID**: _______
**Severity**: Critical / High / Medium / Low
**Device**: _______
**OS Version**: _______
**Steps to Reproduce**:
1. _______
2. _______
3. _______

**Expected Behavior**: _______
**Actual Behavior**: _______
**Screenshots/Videos**: _______
**Logs**: _______

## Test Reports

### Daily Test Report
- Date: _______
- Tester: _______
- Total Tests: _______
- Passed: _______
- Failed: _______
- Blocked: _______
- Notes: _______

### Release Test Sign-off

**Version**: _______
**Release Date**: _______
**Sign-off By**: _______

- [ ] All critical tests passed
- [ ] All high priority bugs resolved
- [ ] Performance targets met
- [ ] Security tests passed
- [ ] Device compatibility verified
- [ ] Ready for release

## Appendix

### Test Data

**Test Driver Account**:
- Email: driver.test@worldclass-erp.com
- Password: Test@123456
- Driver ID: DRV-TEST-001

**Test Trips**:
- Trip 1: Short route (5 km)
- Trip 2: Medium route (20 km)
- Trip 3: Long route (50 km)
- Trip 4: Multi-stop trip (3 stops)

### Useful Commands

```bash
# Run specific test file
npm test -- LoginScreen.test.tsx

# Run tests with coverage
npm test -- --coverage --watchAll=false

# Update snapshots
npm test -- -u

# Clear test cache
npm test -- --clearCache
```
