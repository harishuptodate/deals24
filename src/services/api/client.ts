import axios, { AxiosRequestHeaders } from 'axios';
import { getAdminToken } from '../authService';
import { getUserSessionToken } from '../userSession';

function getBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  if (!configuredUrl) return `${window.location.origin}/api`;
  if (configuredUrl.startsWith('http')) return configuredUrl;
  return `${window.location.origin}${configuredUrl}`;
}

export const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const adminToken = getAdminToken();
    const userSessionToken = getUserSessionToken();
    if (adminToken && config.url?.startsWith('/admin')) {
      config.headers = (config.headers as AxiosRequestHeaders)
        || ({} as unknown as AxiosRequestHeaders);
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (userSessionToken) {
      config.headers = (config.headers as AxiosRequestHeaders)
        || ({} as unknown as AxiosRequestHeaders);
      config.headers.Authorization = `Bearer ${userSessionToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('API Error: No response received', error.request);
    } else {
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  },
);

export default api;
