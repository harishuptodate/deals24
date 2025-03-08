
import axios from 'axios';
import { TelegramResponse, TelegramMessage } from '../types/telegram';

// Get API base URL from environment variables or use a fallback
// If the URL is already absolute (starts with http), use it as is
// Otherwise, construct a full URL based on the current origin
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
    
    // For development mode, return mock data if the API is not available
    if (import.meta.env.DEV) {
      console.log('DEV mode detected - using mock data');
      return getMockTelegramData(category || undefined);
    }
    
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
    
    // If in development mode and API fails, return mock data
    if (import.meta.env.DEV) {
      console.log('DEV mode detected - using mock data after API error');
      return getMockTelegramData(category || undefined);
    }
    
    // Return a default empty response on error
    return { data: [], hasMore: false, nextCursor: undefined };
  }
};

// Get a single Telegram message by ID
export const getTelegramMessageById = async (id: string): Promise<TelegramMessage> => {
  try {
    // For development mode, return mock data if the API is not available
    if (import.meta.env.DEV) {
      console.log('DEV mode detected - using mock data for single message');
      const mockData = getMockTelegramData();
      const message = mockData.data.find(msg => msg.id === id);
      if (message) return message;
      throw new Error('Message not found');
    }
    
    const response = await api.get(`/telegram/messages/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch Telegram message with ID ${id}:`, error);
    throw error;
  }
};

// Mock data function for development purposes
const getMockTelegramData = (category?: string): TelegramResponse => {
  const allData = [
    {
      id: '1',
      text: 'Apple MacBook Pro M2\n\nNow available for just $1499 - Save $500 off retail price!\n\nFeatures:\n- M2 Chip\n- 16GB RAM\n- 512GB SSD\n- 16-inch Retina Display',
      date: new Date().toISOString(),
      link: 'https://example.com/deal1',
      category: 'laptops'
    },
    {
      id: '2',
      text: 'Sony WH-1000XM5 Noise Cancelling Headphones\n\nPrime Day Deal: $299 (Regular $399)\n\n- Industry leading noise cancellation\n- 30 hour battery life\n- Premium sound quality',
      date: new Date().toISOString(),
      link: 'https://example.com/deal2',
      category: 'electronics-home'
    },
    {
      id: '3',
      text: 'Samsung 65" OLED 4K Smart TV\n\nLimited time offer: $1799\n\n- OLED Display\n- 4K Resolution\n- Smart features with voice assistant',
      date: new Date().toISOString(),
      link: 'https://example.com/deal3',
      category: 'electronics-home'
    },
    {
      id: '4',
      text: 'iPad Air 5th Generation\n\n$499 (Regular $599)\n\n- M1 Chip\n- 10.9-inch Liquid Retina Display\n- 64GB Storage\n- All colors available',
      date: new Date().toISOString(),
      link: 'https://example.com/deal4',
      category: 'mobile-phones'
    },
    {
      id: '5',
      text: 'Dyson V12 Cordless Vacuum\n\nFlash Sale: $499\n\n- Powerful suction\n- 60 minute run time\n- HEPA filtration\n- Includes all attachments',
      date: new Date().toISOString(),
      link: 'https://example.com/deal5',
      category: 'electronics-home'
    },
    {
      id: '6',
      text: 'Bose QuietComfort Earbuds II\n\n$199 (Save $80)\n\n- Best-in-class noise cancellation\n- 6 hour battery life\n- Wireless charging case\n- Personalized sound',
      date: new Date().toISOString(),
      link: 'https://example.com/deal6',
      category: 'mobile-phones'
    },
    {
      id: '7',
      text: '#Myntra Upto 90% Off On HRX Clothing.\n\nMen\'s : https://myntr.it/vr7VnfB\nT-Shirt : https://myntr.it/Ea2zkCt\nTrackpants : https://myntr.it/okp5ITi\nShorts : https://myntr.it/fwEs6uR\nSweatshirts : https://myntr.it/TOTpgDL\nJackets : https://myntr.it/yj932bu\nTracksuits  : https://myntr.it/JTyiFlC\n\nWomen\'s : https://myntr.it/d14wa8T\nTrackpants : https://myntr.it/s7L593t\nTights : https://myntr.it/Zb6nW0x',
      date: new Date().toISOString(),
      link: 'https://myntr.it/vr7VnfB',
      category: 'fashion'
    },
    {
      id: '8',
      text: 'Nike Running Shoes Sale\n\nUp to 40% off select styles\n\nMen\'s: https://example.com/nike-mens\nWomen\'s: https://example.com/nike-womens\nKids\': https://example.com/nike-kids',
      date: new Date().toISOString(),
      link: 'https://example.com/nike-sale',
      category: 'fashion'
    },
  ];

  // Filter by category if provided
  const filteredData = category 
    ? allData.filter(item => item.category === category)
    : allData;
  
  return {
    data: filteredData,
    hasMore: false,
    nextCursor: undefined
  };
};

export default api;
