/**
 * API client configuration using Axios
 */
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { API_BASE_URL } from './constants';
import { useAuthStore } from './store';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    if (typeof window !== 'undefined') {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    const normalize = (value: any): any => {
      if (Array.isArray(value)) return value.map(normalize);
      if (value && typeof value === 'object') {
        for (const key of Object.keys(value)) {
          if ((key.endsWith('_score') || key === 'overall_band') && value[key] != null) {
            value[key] = Number(value[key]);
          } else value[key] = normalize(value[key]);
        }
      }
      return value;
    };
    if (!(response.data instanceof Blob)) response.data = normalize(response.data);
    return response;
  },
  (error) => {
    // Handle 401 unauthorized - clear token and redirect to login
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
        // Optionally redirect to login
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;



