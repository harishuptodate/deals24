import axios from 'axios';
import type {
  CategoryCount,
  ClickAnalyticsResponse,
  ClickStatsResponse,
  TelegramMessage,
  TelegramResponse,
  TopPerformingResponse,
} from '../../types/telegram';
import api, { API_BASE_URL } from './client';

const DEFAULT_CATEGORY_COUNTS: CategoryCount[] = [
  { category: 'electronics-home', count: 245 },
  { category: 'laptops', count: 85 },
  { category: 'mobile-phones', count: 120 },
  { category: 'gadgets-accessories', count: 175 },
  { category: 'fashion', count: 95 },
  { category: 'lifestyle', count: 0 },
];

export const getTelegramMessages = async (
  cursor?: string,
  category?: string | null,
  searchQuery?: string | null,
  from?: string | null,
  to?: string | null,
  minPrice?: string | null,
  maxPrice?: string | null,
  sort?: string | null,
): Promise<TelegramResponse> => {
  try {
    const params: Record<string, string | undefined> = { cursor, limit: '12' };
    if (category) params.category = category;
    if (searchQuery) params.search = searchQuery;
    if (from) params.from = from;
    if (to) params.to = to;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (sort) params.sort = sort;

    const response = await api.get<TelegramResponse>('/telegram/messages', {
      params,
      headers: { Accept: 'application/json' },
    });
    if (!response.data.data || !Array.isArray(response.data.data)) response.data.data = [];
    return response.data;
  } catch (error) {
    console.error('Failed to fetch Telegram messages:', error);
    return { data: [], hasMore: false, nextCursor: undefined };
  }
};

export const getCategoryCounts = async (): Promise<CategoryCount[]> => {
  try {
    const response = await api.get('/telegram/categories/counts');
    if (response.data && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
      return response.data.data?.length ? response.data.data : DEFAULT_CATEGORY_COUNTS;
    }
    if (Array.isArray(response.data)) {
      return response.data.length ? response.data : DEFAULT_CATEGORY_COUNTS;
    }
    return DEFAULT_CATEGORY_COUNTS;
  } catch (error) {
    console.error('Failed to fetch category counts:', error);
    return DEFAULT_CATEGORY_COUNTS;
  }
};

export const getTelegramMessageById = async (id: string): Promise<TelegramMessage> => {
  const response = await api.get(`/telegram/messages/${id}`);
  return response.data;
};

export const searchTelegramMessages = (query: string): Promise<TelegramResponse> => (
  getTelegramMessages(undefined, undefined, query)
);

export const getCategoryMessages = async (
  category: string,
  cursor?: string,
): Promise<TelegramResponse> => {
  try {
    const response = await api.get(`/telegram/categories/${category}`, {
      params: { cursor, limit: '12' },
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch messages for category ${category}:`, error);
    return { data: [], hasMore: false, nextCursor: undefined };
  }
};

export const trackMessageClick = async (messageId: string): Promise<boolean> => {
  if (!messageId) return false;
  try {
    await api.post(`/telegram/messages/${messageId}/today`);
  } catch (error) {
    console.warn('Message click tracking failed:', error);
  }
  return true;
};

export const handleTrackedLinkClick = async (
  url: string,
  messageId?: string,
  event?: MouseEvent,
): Promise<void> => {
  if (messageId) await trackMessageClick(messageId);
  if (event && (event.ctrlKey || event.metaKey)) return;
  setTimeout(() => window.open(url, '_blank'), 100);
};

export const updateMessageText = async (
  messageId: string,
  text: string,
  imageUrl: string | null = null,
  price: string | null = null,
  priceObservedAt: string | null = null,
): Promise<boolean> => {
  if (!messageId) return false;
  try {
    const response = await api.put(`/telegram/messages/${messageId}`, {
      text,
      imageUrl,
      price,
      priceObservedAt,
    });
    return response.status === 200;
  } catch (error) {
    console.error('Failed to update message:', error);
    return false;
  }
};

export const updateMessageCategory = async (
  messageId: string,
  category: string,
): Promise<boolean> => {
  if (!messageId || !category) return false;
  try {
    const response = await api.put(`/telegram/messages/${messageId}/category`, { category });
    return response.status === 200;
  } catch (error) {
    console.error('Failed to update message category:', error);
    return false;
  }
};

export const getAllCategories = async (): Promise<string[]> => {
  try {
    const response = await api.get('/telegram/categories');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return [];
  }
};

export const deleteProduct = async (messageId: string): Promise<boolean> => {
  if (!messageId) return false;
  try {
    const response = await api.delete(`/telegram/messages/${messageId}`);
    return response.status === 200;
  } catch (error) {
    console.error('Failed to delete message:', error);
    return false;
  }
};

export const getClickAnalytics = async (
  period: string = 'day',
): Promise<ClickAnalyticsResponse> => {
  try {
    const response = await api.get('/telegram/analytics/clicks', { params: { period } });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch click analytics:', error);
    return {
      clicksData: [],
      totalClicks: 0,
      totalMessages: 0,
      totalMonth: 0,
      totalYear: 0,
    };
  }
};

export const getClickStats = async (): Promise<ClickStatsResponse> => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch click stats:', error);
    return {
      daily: [],
      weekly: [],
      last7Days: Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return { date: date.toISOString(), name: date.toISOString(), clicks: 0 };
      }),
      monthly: [],
      yearly: [],
      totalClicks: 0,
      totalMonthClicks: 0,
      totalYearClicks: 0,
    };
  }
};

export const getTopPerformingDeals = async (
  limit: number = 5,
): Promise<TopPerformingResponse> => {
  try {
    const response = await api.get('/telegram/analytics/top-performing', { params: { limit } });
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch top performing deals:', error);
    return { topMessages: [], totalMessages: 0 };
  }
};

export const getDealById = async (id: string): Promise<TelegramMessage> => {
  const response = await axios.get(`${API_BASE_URL}/telegram/messages/${id}`);
  return response.data;
};
