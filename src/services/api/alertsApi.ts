import api from './client';
import { createLocalAlert, isLocalAlertPreview, readLocalAlerts, saveLocalAlerts } from '../localAlertPreview';

export type DealAlert = {
  _id: string;
  email: string;
  type: 'deal' | 'keyword';
  dealId?: string | null;
  dealTitle?: string | null;
  keywords: string[];
  targetPrice?: number | null;
  active: boolean;
  createdAt: string;
  deal?: {
    id: string;
    title: string;
    imageUrl?: string | null;
    telegramFileId?: string | null;
    category?: string | null;
  } | null;
};

export type CreateDealAlertInput = {
  email?: string;
  type: 'deal' | 'keyword';
  dealId?: string;
  dealTitle?: string;
  previewDeal?: DealAlert['deal'];
  keywords?: string[];
  targetPrice?: number | null;
};

const OWNER_TOKEN_KEY = 'deal-alert-owner-token';

export function getOwnerToken(): string {
  const existing = localStorage.getItem(OWNER_TOKEN_KEY);
  if (existing) return existing;

  const token = crypto.randomUUID
    ? `${crypto.randomUUID()}${crypto.randomUUID()}`
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(OWNER_TOKEN_KEY, token);
  return token;
}

export async function getDealAlerts(): Promise<DealAlert[]> {
  if (isLocalAlertPreview) return readLocalAlerts();
  const response = await api.get<DealAlert[]>('/alerts', {
    headers: { 'X-Alert-Owner-Token': getOwnerToken() },
  });
  return response.data;
}

export async function createDealAlert(input: CreateDealAlertInput): Promise<DealAlert> {
  if (isLocalAlertPreview) return createLocalAlert(input);
  const response = await api.post<DealAlert>('/alerts', {
    ...input,
    ownerToken: getOwnerToken(),
  });
  if (input.email) localStorage.setItem('deal-alert-email', input.email);
  return response.data;
}

export async function updateDealAlert(
  id: string,
  update: { active?: boolean; targetPrice?: number | null; keywords?: string[] },
): Promise<DealAlert> {
  if (isLocalAlertPreview) {
    const alerts = readLocalAlerts();
    const existing = alerts.find((alert) => alert._id === id);
    if (!existing) throw new Error('Alert not found');
    const updated = { ...existing, ...update };
    saveLocalAlerts(alerts.map((alert) => alert._id === id ? updated : alert));
    return updated;
  }
  const response = await api.patch<DealAlert>(`/alerts/${id}`, {
    ...update,
    ownerToken: getOwnerToken(),
  });
  return response.data;
}

export async function deleteDealAlert(id: string): Promise<void> {
  if (isLocalAlertPreview) {
    saveLocalAlerts(readLocalAlerts().filter((alert) => alert._id !== id));
    return;
  }
  await api.delete(`/alerts/${id}`, {
    headers: { 'X-Alert-Owner-Token': getOwnerToken() },
  });
}
