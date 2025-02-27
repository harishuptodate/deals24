
import axios from 'axios';
import { TelegramResponse, TelegramMessage } from '../types/telegram';
import { mockTelegramMessages } from '../data/mockTelegramData';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for production logging
api.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle API errors gracefully
    if (error.response) {
      // The request was made and the server responded with a status code outside the range of 2xx
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API Error: No response received', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Check if backend is available
const isBackendAvailable = async (): Promise<boolean> => {
  try {
    // Try to reach the health endpoint or any lightweight endpoint
    await api.get('/health', { timeout: 3000 });
    return true;
  } catch (error) {
    console.warn('Backend not available, using mock data');
    return false;
  }
};

// Use mock data or real API data based on backend availability
let usesMockData = false;

// Get Telegram messages with pagination
export const getTelegramMessages = async (cursor?: string): Promise<TelegramResponse> => {
  try {
    // Try to use real API if we haven't determined if backend is available yet
    if (!usesMockData) {
      try {
        const backendAvailable = await isBackendAvailable();
        usesMockData = !backendAvailable;
        
        if (backendAvailable) {
          const response = await api.get<TelegramResponse>('/telegram/messages', {
            params: { cursor, limit: 12 }
          });
          return response.data;
        }
      } catch (error) {
        usesMockData = true;
        console.log('Switching to mock data');
      }
    }
    
    // If backend is not available or request failed, use mock data
    if (usesMockData) {
      console.log('Using mock data for getTelegramMessages');
      // Simulate pagination
      const limit = 12;
      const startIndex = cursor ? mockTelegramMessages.findIndex(msg => msg.id === cursor) + 1 : 0;
      const endIndex = startIndex + limit;
      const data = mockTelegramMessages.slice(startIndex, endIndex);
      
      // Return paginated mock data in the same format as the API
      return {
        data,
        hasMore: endIndex < mockTelegramMessages.length,
        nextCursor: endIndex < mockTelegramMessages.length ? mockTelegramMessages[endIndex - 1].id : undefined
      };
    }
    
    // This should never be reached, but TypeScript needs a return value
    throw new Error('Failed to fetch data');
  } catch (error) {
    console.error('Failed to fetch Telegram messages:', error);
    
    // Return mock data as fallback on any error
    const data = mockTelegramMessages.slice(0, 12);
    return {
      data,
      hasMore: mockTelegramMessages.length > 12,
      nextCursor: mockTelegramMessages.length > 12 ? mockTelegramMessages[11].id : undefined
    };
  }
};

// Get a single Telegram message by ID
export const getTelegramMessageById = async (id: string): Promise<TelegramMessage> => {
  try {
    if (!usesMockData) {
      try {
        const backendAvailable = await isBackendAvailable();
        usesMockData = !backendAvailable;
        
        if (backendAvailable) {
          const response = await api.get(`/telegram/messages/${id}`);
          return response.data;
        }
      } catch (error) {
        usesMockData = true;
      }
    }
    
    // If backend is not available or request failed, use mock data
    if (usesMockData) {
      console.log('Using mock data for getTelegramMessageById');
      const message = mockTelegramMessages.find(msg => msg.id === id);
      
      if (message) {
        return message;
      }
      
      throw new Error('Message not found');
    }
    
    // This should never be reached, but TypeScript needs a return value
    throw new Error('Failed to fetch data');
  } catch (error) {
    console.error(`Failed to fetch Telegram message with ID ${id}:`, error);
    
    // Return mock data as fallback on any error
    const message = mockTelegramMessages.find(msg => msg.id === id);
    
    if (message) {
      return message;
    }
    
    throw new Error('Message not found');
  }
};

export default api;
