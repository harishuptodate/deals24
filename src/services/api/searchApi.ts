import api from './client';

export type SearchPreview = {
  deals: Array<{ id: string; title: string; price: number | null; imageUrl: string | null; telegramFileId: string | null; date: string | null }>;
  products: Array<{ label: string; query: string }>;
  categories: Array<{ label: string; category: string }>;
};

export async function getSearchPreview(query: string, filters: string, signal: AbortSignal) {
  const params = new URLSearchParams(filters);
  params.set('q', query);
  const response = await api.get<SearchPreview>('/telegram/search/suggestions', { params, signal });
  return response.data;
}

export async function getPopularSearches(signal: AbortSignal): Promise<string[]> {
  const response = await api.get<{ queries: string[] }>('/telegram/search/popular', { signal });
  return response.data.queries;
}

export function recordSearchSelection(query: string) {
  void api.post('/telegram/search/selection', { query }).catch(() => undefined);
}
