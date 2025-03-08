import axios from 'axios';
import { TelegramResponse, TelegramMessage } from '../types/telegram';

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

console.log('Using API URL:', API_BASE_URL); // Debug log

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

// Function to determine category based on message content
export const detectCategory = (text: string): string | undefined => {
  const lowerText = text.toLowerCase();
  
  // Electronics & Home
  if (lowerText.match(/tv|television|smart home|refrigerator|fridge|washer|dryer|vacuum|appliance|speaker|audio|camera|gaming console|playstation|xbox|nintendo/i)) {
    return 'electronics-home';
  }
  
  // Laptops
  if (lowerText.match(/laptop|macbook|notebook|chromebook|gaming laptop|dell|hp|lenovo|asus|acer|msi/i)) {
    return 'laptops';
  }
  
  // Mobile Phones
  if (lowerText.match(/phone|smartphone|iphone|android|samsung|pixel|oneplus|xiaomi|vivo|oppo|realme|mobile|earbuds|headphone|earphone/i)) {
    return 'mobile-phones';
  }
  
  // Fashion
  if (lowerText.match(/shirt|tshirt|t-shirt|jeans|pants|dress|clothing|shoes|footwear|apparel|fashion|jacket|sweater|sweatshirt|hoodie|watch|handbag|bag|backpack|sunglasses/i)) {
    return 'fashion';
  }
  
  return undefined;
};

// Get Telegram messages with pagination
export const getTelegramMessages = async (cursor?: string, category?: string | null): Promise<TelegramResponse> => {
  try {
    const params: Record<string, string | undefined> = { 
      cursor, 
      limit: '12'
    };
    
    if (category) {
      params.category = category;
    }
    
    console.log('Fetching messages with params:', params);
    
    // Make sure we're requesting JSON and not HTML
    const response = await api.get<TelegramResponse>('/telegram/messages', { 
      params,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Response received:', response.data);
    
    // Ensure data is always an array, even if the response is empty
    if (!response.data.data || !Array.isArray(response.data.data)) {
      console.warn('API returned invalid data format, returning empty array');
      response.data.data = [];
    }
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Telegram messages:', error);
    
    // Check if the error response contains HTML (which indicates we got the wrong endpoint)
    if (error.response?.data && typeof error.response.data === 'string' && 
        error.response.data.includes('<!DOCTYPE html>')) {
      console.error('Received HTML instead of JSON. API endpoint may be misconfigured.');
    }
    
    // Return a default empty response on error
    return { data: [], hasMore: false, nextCursor: undefined };
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

export default api;
