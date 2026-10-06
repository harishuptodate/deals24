import api from './client';

export type FavoriteItem = {
  id?: string;
  title: string;
  description: string;
  link: string;
  timestamp: string;
  createdAt?: string;
  category?: string;
  imageUrl?: string;
  telegramFileId?: string;
};

export async function getWishlist(): Promise<FavoriteItem[]> {
  const response = await api.get<FavoriteItem[]>('/wishlist');
  return response.data;
}

export async function addWishlistItem(dealId: string): Promise<FavoriteItem> {
  const response = await api.post<FavoriteItem>('/wishlist', { dealId });
  return response.data;
}

export async function importWishlist(dealIds: string[]): Promise<FavoriteItem[]> {
  const response = await api.post<FavoriteItem[]>('/wishlist/import', { dealIds });
  return response.data;
}

export async function removeWishlistItem(dealId: string): Promise<void> {
  await api.delete(`/wishlist/${dealId}`);
}

export async function clearWishlist(): Promise<void> {
  await api.delete('/wishlist');
}
