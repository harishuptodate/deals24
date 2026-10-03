import type { DealPriceHistory } from '../../types/telegram';
import api from './client';

export const getDealPriceHistory = async (id: string): Promise<DealPriceHistory> => {
  const response = await api.get<DealPriceHistory>(`/telegram/messages/${id}/price-history`);
  return response.data;
};

export const updateDealPriceHistoryPoint = async (
  dealId: string,
  observationId: string,
  price: number,
  observedAt: string,
): Promise<{ currentPrice: number | null }> => {
  const response = await api.put(
    `/telegram/messages/${dealId}/price-history/${observationId}`,
    { price, observedAt },
  );
  return response.data;
};

export const deleteDealPriceHistoryPoint = async (
  dealId: string,
  observationId: string,
): Promise<{ currentPrice: number | null }> => {
  const response = await api.delete(
    `/telegram/messages/${dealId}/price-history/${observationId}`,
  );
  return response.data;
};
