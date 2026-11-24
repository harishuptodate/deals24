import type { CreateDealAlertInput, DealAlert } from './api/alertsApi';
import type { FavoriteItem } from './api/wishlistApi';

export const isLocalAlertPreview = import.meta.env.DEV
  && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

const STORAGE_KEY = 'deals24-local-preview-alerts';

export function readLocalAlerts(): DealAlert[] {
  try {
    const alerts: DealAlert[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const favorites: FavoriteItem[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    return alerts.map((alert) => {
      if (alert.type !== 'deal' || alert.deal) return alert;
      const deal = favorites.find((item) => item.id === alert.dealId);
      return deal ? { ...alert, deal: { ...deal, id: deal.id } } : alert;
    });
  } catch {
    return [];
  }
}

export function saveLocalAlerts(alerts: DealAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function createLocalAlert(input: CreateDealAlertInput): DealAlert {
  const alerts = readLocalAlerts();
  const keywords = [...new Set((input.keywords || []).map((word) => word.trim().toLowerCase()))].sort();
  const existing = alerts.find((alert) => alert.type === input.type && (input.type === 'deal'
    ? alert.dealId === input.dealId
    : JSON.stringify(alert.keywords) === JSON.stringify(keywords)));
  const alert: DealAlert = {
    _id: existing?._id || crypto.randomUUID(),
    email: '',
    type: input.type,
    dealId: input.dealId,
    dealTitle: input.dealTitle || existing?.dealTitle,
    deal: input.previewDeal || existing?.deal,
    keywords,
    targetPrice: input.targetPrice ?? null,
    active: true,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  saveLocalAlerts([alert, ...alerts.filter((item) => item._id !== alert._id)]);
  return alert;
}
