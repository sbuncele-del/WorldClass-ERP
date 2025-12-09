/**
 * Application Configuration
 * Environment-specific settings for the driver mobile app
 */

const ENV = {
  dev: {
    API_URL: 'http://localhost:3000/api/v1',
    WS_URL: 'ws://localhost:3000',
    SENTRY_DSN: '',
    MIXPANEL_TOKEN: '',
  },
  staging: {
    API_URL: 'https://staging-api.worldclass-erp.com/api/v1',
    WS_URL: 'wss://staging-api.worldclass-erp.com',
    SENTRY_DSN: 'YOUR_STAGING_SENTRY_DSN',
    MIXPANEL_TOKEN: 'YOUR_STAGING_MIXPANEL_TOKEN',
  },
  prod: {
    API_URL: 'https://api.worldclass-erp.com/api/v1',
    WS_URL: 'wss://api.worldclass-erp.com',
    SENTRY_DSN: 'YOUR_PRODUCTION_SENTRY_DSN',
    MIXPANEL_TOKEN: 'YOUR_PRODUCTION_MIXPANEL_TOKEN',
  },
};

const getEnvVars = (env = '') => {
  if (env === 'production') return ENV.prod;
  if (env === 'staging') return ENV.staging;
  return ENV.dev;
};

const environment = process.env.NODE_ENV || 'development';
const envVars = getEnvVars(environment);

export default {
  ...envVars,
  // App Configuration
  APP_NAME: 'WorldClass Driver',
  APP_VERSION: '1.0.0',
  
  // Location Tracking
  LOCATION_TASK_NAME: 'background-location-task',
  LOCATION_UPDATE_INTERVAL: 30000, // 30 seconds in milliseconds
  LOCATION_ACCURACY: 6, // High accuracy
  
  // Offline Sync
  SYNC_RETRY_ATTEMPTS: 3,
  SYNC_RETRY_DELAY: 5000, // 5 seconds
  
  // Session Management
  AUTO_LOGOUT_TIME: 3600000, // 1 hour in milliseconds
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes before expiry
  
  // Camera & Media
  IMAGE_MAX_WIDTH: 1920,
  IMAGE_MAX_HEIGHT: 1080,
  IMAGE_QUALITY: 0.8,
  
  // Notifications
  NOTIFICATION_CHANNEL_ID: 'trip-updates',
  NOTIFICATION_CHANNEL_NAME: 'Trip Updates',
  
  // WebSocket
  WS_PATH: '/logistics-ws',
  WS_RECONNECT_DELAY: 5000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  
  // Data Limits
  MAX_OFFLINE_RECORDS: 100,
  MAX_PHOTO_SIZE_MB: 5,
};
