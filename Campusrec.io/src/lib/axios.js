import axios from 'axios';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function resolveApiBaseUrl() {
  const configured = String(import.meta.env.VITE_API_URL || '').trim();
  const defaultUrl = 'http://localhost:3005/api';
  const fallback = configured || defaultUrl;

  if (typeof window === 'undefined') return fallback;

  // If frontend is opened from LAN IP but API URL is localhost, route API calls to same host IP.
  const currentHost = window.location.hostname;
  if (LOCAL_HOSTS.has(currentHost)) return fallback;

  try {
    const parsed = new URL(fallback);
    if (LOCAL_HOSTS.has(parsed.hostname)) {
      parsed.hostname = currentHost;
      return parsed.toString().replace(/\/$/, '');
    }
  } catch {
    return fallback;
  }

  return fallback;
}

// Create axios instance with base url and credentials support
export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized on protected routes only.
    // Do not force-refresh for login/register failures.
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');
      const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register');
      const hasToken = Boolean(localStorage.getItem('token'));
      if (hasToken && !isAuthRequest) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    if (error.response?.status === 403) {
      const message = String(error.response?.data?.message || '').toLowerCase();
      if (message.includes('suspend')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

export default api;
