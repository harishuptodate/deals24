
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

// Enhanced function to determine category based on message content with expanded patterns
export const detectCategory = (text: string): string | undefined => {
  const lowerText = text.toLowerCase();
  
  // Electronics & Home
  if (lowerText.match(/washing machine|tv|television|sofa|refrigerator|fridge|air conditioner|ac|microwave|oven|toaster|dishwasher|water purifier|home theatre|soundbar|geyser|cooler|vacuum cleaner|iron|induction cooktop|blender|mixer grinder|juicer|coffee maker|rice cooker|heater|fan|chimney|deep freezer|air fryer/i)) {
    return 'electronics-home';
  }
  
  // Laptops
  if (lowerText.match(/laptop|notebook|ultrabook|macbook|lenovo|hp|dell|acer|asus|msi|razer|apple macbook|chromebook|gaming laptop|surface laptop|thinkpad|ideapad|legion|vivobook|zenbook|spectre|pavilion|omen|inspiron|latitude|xps|rog|tuf|predator|swift|helios|nitro|blade|stealth|probook/i)) {
    return 'laptops';
  }
  
  // Mobile Phones
  if (lowerText.match(/iphone|android|smartphone|mobile phone|5g phone|samsung|oneplus|xiaomi|redmi|oppo|vivo|realme|motorola|nokia|google pixel|sony xperia|huawei|asus rog phone|infinix|tecno|honor|iqoo|poco|foldable phone|flip phone|flagship phone|budget phone|mid-range phone|flagship killer/i)) {
    return 'mobile-phones';
  }
  
  // Accessories
  if (lowerText.match(/power bank|tws|earphones|earbuds|headphones|bluetooth earphones|neckband|chargers|fast charger|usb charger|wireless charger|cable|usb cable|type-c cable|lightning cable|hdmi cable|adapter|memory card|sd card|pendrive|usb drive|hdd|ssd|laptop bag|keyboard|mouse|gaming mouse|mouse pad|cooling pad|phone case|screen protector|smartwatch|fitness band|vr headset|gaming controller/i)) {
    return 'gadgets-accessories';
  }
  
  // Fashion
  if (lowerText.match(/clothing|t-shirt|shirt|jeans|trousers|pants|shorts|skirt|dress|jacket|blazer|sweater|hoodie|coat|suit|ethnic wear|kurta|saree|lehenga|salwar|leggings|innerwear|nightwear|sportswear|shoes|sneakers|heels|sandals|flip-flops|boots|formal shoes|loafers|running shoes|belts|wallets|watches|sunglasses|jewelry|rings|necklace|bracelet|earrings|bangles|handbag|clutch|backpack/i)) {
    return 'fashion';
  }
  
  return undefined;
};

// Get Telegram messages with pagination
export const getTelegramMessages = async (cursor?: string, category?: string | null, searchQuery?: string | null): Promise<TelegramResponse> => {
  try {
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
    
    console.log('Response received:', response.data);
    
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
    const response = await api.get(`/categories/${category}`, {
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
    await api.post(`/telegram/messages/${messageId}/click`);
  } catch (error) {
    console.error('Failed to track message click:', error);
  }
};

// Get click analytics data
export const getClickAnalytics = async (period: string = 'day'): Promise<any> => {
  try {
    const response = await api.get('/telegram/analytics/clicks', {
      params: { period }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch click analytics:', error);
    return { clicksData: [], topPerforming: [] };
  }
};

// Get top performing deals
export const getTopPerformingDeals = async (limit: number = 5): Promise<TelegramMessage[]> => {
  try {
    const response = await api.get('/telegram/analytics/top-performing', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch top performing deals:', error);
    return [];
  }
};

export default api;
