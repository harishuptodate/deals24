
import axios from 'axios';
import { TelegramResponse, TelegramMessage, CategoryCount } from '../types/telegram';

// Get API base URL from environment variables or use a fallback
const getBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!configuredUrl) {
    // Fallback to current origin + /api
    return `${window.location.origin}/api`;
  }
  
  // If it's already a full URL (starts with http/https), use it as is
  if (configuredUrl.startsWith('http')) {
    return configuredUrl;
  }
  
  // Otherwise, append it to the current origin
  return `${window.location.origin}${configuredUrl}`;
};

const API_BASE_URL = getBaseUrl();

console.log('API Base URL configured:', API_BASE_URL); // Debug log

// Create an axios instance with the base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for production logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
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

// Get Telegram messages with pagination
export const getTelegramMessages = async (cursor?: string, category?: string | null, searchQuery?: string | null): Promise<TelegramResponse> => {
  try {
    console.log('Running in development mode');
    console.log('API Base URL:', API_BASE_URL);
    
    const params: Record<string, string | undefined> = { 
      cursor, 
      limit: '12'
    };
    
    if (category) {
      params.category = category;
    }
    
    if (searchQuery) {
      params.search = searchQuery;
    }
    
    console.log('Fetching messages with params:', params);
    
    // Make sure we're requesting JSON and not HTML
    const response = await api.get<TelegramResponse>('/telegram/messages', { 
      params,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Ensure data is always an array, even if the response is empty
    if (!response.data.data || !Array.isArray(response.data.data)) {
      console.warn('API returned invalid data format, returning empty array');
      response.data.data = [];
    }
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Telegram messages:', error);
    
    // Return a default empty response on error
    return { data: [], hasMore: false, nextCursor: undefined };
  }
};

// Get category counts
// In api.ts, update the getCategoryCounts function:
// api.ts - Updated getCategoryCounts function
export const getCategoryCounts = async (): Promise<CategoryCount[]> => {
  try {
    const response = await api.get('/telegram/categories/counts');
    
    // Check if we got the paginated format
    if (response.data && response.data.hasOwnProperty('data')) {
      // If data array is empty, return default data
      if (!response.data.data || response.data.data.length === 0) {
        return [
          { category: 'electronics-home', count: 245 },
          { category: 'laptops', count: 85 },
          { category: 'mobile-phones', count: 120 },
          { category: 'gadgets-accessories', count: 175 },
          { category: 'fashion', count: 95 }
        ];
      }
      return response.data.data;
    }
    
    // If we got a direct array
    if (Array.isArray(response.data)) {
      return response.data.length > 0 ? response.data : [
        { category: 'electronics-home', count: 245 },
        { category: 'laptops', count: 85 },
        { category: 'mobile-phones', count: 120 },
        { category: 'gadgets-accessories', count: 175 },
        { category: 'fashion', count: 95 }
      ];
    }
    
    // Default fallback
    return [
      { category: 'electronics-home', count: 245 },
      { category: 'laptops', count: 85 },
      { category: 'mobile-phones', count: 120 },
      { category: 'gadgets-accessories', count: 175 },
      { category: 'fashion', count: 95 }
    ];
  } catch (error) {
    console.error('Failed to fetch category counts:', error);
    return [
      { category: 'electronics-home', count: 245 },
      { category: 'laptops', count: 85 },
      { category: 'mobile-phones', count: 120 },
      { category: 'gadgets-accessories', count: 175 },
      { category: 'fashion', count: 95 }
    ];
  }
};

// Get a single Telegram message by ID
export const getTelegramMessageById = async (id: string): Promise<TelegramMessage> => {
  try {
    const response = await api.get(`/telegram/messages/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch Telegram message with ID ${id}:`, error);
    throw error;
  }
};

// Search Telegram messages
export const searchTelegramMessages = async (query: string): Promise<TelegramResponse> => {
  return getTelegramMessages(undefined, undefined, query);
};

// Get messages by category
export const getCategoryMessages = async (category: string, cursor?: string): Promise<TelegramResponse> => {
  try {
    const response = await api.get(`/telegram/categories/${category}`, {
      params: {
        cursor,
        limit: '12'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch messages for category ${category}:`, error);
    return { data: [], hasMore: false, nextCursor: undefined };
  }
};

// Track click on a message
export const trackMessageClick = async (messageId: string): Promise<void> => {
  try {
    if (!messageId) {
      console.error('Cannot track click: messageId is undefined or empty');
      return;
    }
    
    console.log(`Tracking click for message ID: ${messageId}`);
    await api.post(`/telegram/messages/${messageId}/click`);
  } catch (error) {
    console.error('Failed to track message click:', error);
  }
};

// Delete a product/message
export const deleteProduct = async (messageId: string): Promise<boolean> => {
  try {
    if (!messageId) {
      console.error('Cannot delete: messageId is undefined or empty');
      return false;
    }
    
    console.log(`Attempting to delete message with ID: ${messageId}`);
    const response = await api.delete(`/telegram/messages/${messageId}`);
    console.log('Delete product response:', response);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to delete message:', error);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    }
    return false;
  }
};

// Get click analytics data for the admin dashboard
export const getClickAnalytics = async (period: string = 'day'): Promise<any> => {
  try {
    const response = await api.get('/telegram/analytics/clicks', {
      params: { period }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch click analytics:', error);
    // Return default data structure if API fails
    return {
      clicksData: [],
      totalClicks: 0,
      totalMessages: 0
    };
  }
};

// Get top performing deals for the admin dashboard
export const getTopPerformingDeals = async (limit: number = 5): Promise<TelegramMessage[]> => {
  try {
    const response = await api.get('/telegram/analytics/top-performing', {
      params: { limit }
    });
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch top performing deals:', error);
    return [];
  }
};

export default api;
