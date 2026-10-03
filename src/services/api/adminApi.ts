import type { TelegramMessage } from '../../types/telegram';
import { getAdminToken } from '../authService';
import api, { API_BASE_URL } from './client';

export const postAdminDeal = async (message: string): Promise<TelegramMessage> => {
  const response = await api.post('/admin/deals', { message });
  return response.data.deal;
};

export interface AdminLogEntry {
  _id?: string;
  id?: string;
  logId?: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  event?: string | null;
  message: string;
  requestId?: string | null;
  correlationId?: string | null;
  context?: Record<string, unknown>;
}

export interface AdminLogsResponse {
  logs: AdminLogEntry[];
  hasMore: boolean;
  nextBefore: string | null;
}

export const getAdminLogs = async (params: {
  before?: string | null;
  levels?: string[];
  service?: string;
  event?: string;
  search?: string;
  correlationId?: string;
  limit?: number;
} = {}): Promise<AdminLogsResponse> => {
  const response = await api.get('/admin/logs', {
    params: {
      before: params.before || undefined,
      levels: params.levels?.length ? params.levels.join(',') : undefined,
      service: params.service || undefined,
      event: params.event || undefined,
      search: params.search || undefined,
      correlationId: params.correlationId || undefined,
      limit: params.limit || 50,
    },
  });
  return {
    logs: response.data.logs || [],
    hasMore: response.data.hasMore || false,
    nextBefore: response.data.nextBefore || null,
  };
};

export const createAdminLogsStreamUrl = (recent = 25): string | null => {
  const adminToken = getAdminToken();
  return adminToken
    ? `${API_BASE_URL}/admin/logs/stream?recent=${recent}&token=${encodeURIComponent(adminToken)}`
    : null;
};

export type BlacklistEntryType = 'brand' | 'product';
export interface BlacklistEntry {
  _id: string;
  type: BlacklistEntryType;
  value: string;
  normalizedValue: string;
  createdAt: string;
  updatedAt: string;
}
export type BlacklistRuleAction = 'allow' | 'block';
export interface BlacklistRule {
  _id: string;
  brand: string;
  product: string;
  normalizedBrand: string;
  normalizedProduct: string;
  action: BlacklistRuleAction;
  createdAt: string;
  updatedAt: string;
}
export interface BlacklistPolicy {
  entries: BlacklistEntry[];
  rules: BlacklistRule[];
}

export const getBlacklistPolicy = async (): Promise<BlacklistPolicy> => {
  const response = await api.get('/admin/blacklist');
  return { entries: response.data.entries || [], rules: response.data.rules || [] };
};

export const addBlacklistEntry = async (
  type: BlacklistEntryType,
  value: string,
): Promise<BlacklistEntry> => {
  const response = await api.post('/admin/blacklist', { type, value });
  return response.data.entry;
};

export const removeBlacklistEntry = async (id: string): Promise<void> => {
  await api.delete(`/admin/blacklist/${id}`);
};

export const saveBlacklistRule = async (
  brand: string,
  product: string,
  action: BlacklistRuleAction,
): Promise<BlacklistRule> => {
  const response = await api.post('/admin/blacklist/rules', { brand, product, action });
  return response.data.rule;
};

export const removeBlacklistRule = async (id: string): Promise<void> => {
  await api.delete(`/admin/blacklist/rules/${id}`);
};
