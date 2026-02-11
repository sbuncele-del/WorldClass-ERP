import axios from 'axios';

// Production: empty string = relative URLs through CloudFront proxy
// VITE_API_URL should be set in .env files, no fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens and tenant ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('accessToken');
    // Try multiple sources for tenant ID
    let tenantId = localStorage.getItem('tenantId') || localStorage.getItem('workspaceId');
    if (!tenantId) {
      try {
        const tenantData = localStorage.getItem('tenant');
        if (tenantData) {
          const tenant = JSON.parse(tenantData);
          tenantId = tenant.id;
        }
      } catch (e) {
        // ignore parse error
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login/signup pages to prevent loop
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/accept-invite', '/'];
      const isPublicPage = publicPaths.some(path => currentPath === path || currentPath.startsWith('/portal'));
      
      if (!isPublicPage) {
        // Handle unauthorized - only clear tokens and redirect if on protected page
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
