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
      console.log('API Response:', response.data);
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

// Track click on a message using a more resilient approach
export const trackMessageClick = async (messageId: string): Promise<boolean> => {
  try {
    if (!messageId) {
      console.error('Cannot track click: messageId is undefined or empty');
      return false;
    }
    
    console.log(`Tracking click for message ID: ${messageId}`);
    
    // Use a different endpoint naming to avoid ad blockers
    const endpoint = `${API_BASE_URL}/telegram/messages/${messageId}/track-engagement`;
    
    // For browsers that support Beacon API
    if (navigator.sendBeacon) {
      // Create a FormData object instead of Blob - better compatibility
      const formData = new FormData();
      formData.append('messageId', messageId);
      
      const success = navigator.sendBeacon(endpoint, formData);
      
      if (success) {
        // Also update the click stat
        try {
          // Use a timeout to ensure the first request completes
          setTimeout(() => {
            const statEndpoint = `${API_BASE_URL}/stats/record-view`;
            navigator.sendBeacon(statEndpoint);
          }, 10);
        } catch (err) {
          console.warn('Failed to update daily stats:', err);
        }
        
        return true;
      }
    }
    
    // Fallback for browsers that don't support Beacon API
    await api.post(`/telegram/messages/${messageId}/track-engagement`);
    
    // Also update the click stat
    try {
      await api.post('/stats/record-view');
    } catch (err) {
      console.warn('Failed to update daily stats:', err);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to track message click:', error);
    return false;
  }
};

// Use this function to handle link clicks with tracking
export const handleTrackedLinkClick = (url: string, messageId?: string, event?: MouseEvent): void => {
  // Store click in localStorage
  if (messageId) {
    const clickData = JSON.parse(localStorage.getItem('clickData') || '[]');
    clickData.push({
      messageId,
      url,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('clickData', JSON.stringify(clickData));
    
    // Track the click using the updated method
    const success = trackMessageClick(messageId);
    console.log(`Click tracking sent successfully: ${success}`);
  }
  
  // If this is called from an event handler and Ctrl/Cmd key is pressed,
  // don't use window.open, but still ensure tracking completes
  if (event && (event.ctrlKey || event.metaKey)) {
    // The browser will handle opening in a new tab naturally
    return;
  }
  
  // For normal clicks, add a tiny delay to ensure the beacon request is sent
  // and manually open the link
  setTimeout(() => {
    window.open(url, '_blank');
  }, 100);
};

// Edit message text
export const updateMessageText = async (messageId: string, text: string): Promise<boolean> => {
  try {
    if (!messageId) {
      console.error('Cannot update: messageId is undefined or empty');
      return false;
    }
    
    console.log(`Updating text for message ID: ${messageId}`);
    const response = await api.put(`/telegram/messages/${messageId}`, { text });
    return response.status === 200;
  } catch (error) {
    console.error('Failed to update message text:', error);
    return false;
  }
};

// Update message category
export const updateMessageCategory = async (messageId: string, category: string): Promise<boolean> => {
  try {
    if (!messageId || !category) {
      console.error('Cannot update: messageId or category is missing');
      return false;
    }
    
    console.log(`Updating category for message ID: ${messageId} to ${category}`);
    const response = await api.put(`/telegram/messages/${messageId}/category`, { category });
    return response.status === 200;
  } catch (error) {
    console.error('Failed to update message category:', error);
    return false;
  }
};

// Get all available categories
export const getAllCategories = async (): Promise<string[]> => {
  try {
    const response = await api.get('/telegram/categories');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
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
      totalMessages: 0,
      totalMonth: 0,
      totalYear: 0
    };
  }
};

// Get specific message click stats
export const getClickStats = async (): Promise<any> => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch click stats:', error);
    // Return a more robust default structure
    return {
      last7Days: Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return { date: date.toISOString(), clicks: 0 };
      }),
      monthly: [],
      yearly: [],
      totalClicks: 0
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
