import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  addWishlistItem,
  clearWishlist as clearAccountWishlist,
  getWishlist,
  importWishlist,
  removeWishlistItem,
  type FavoriteItem,
} from '@/services/api/wishlistApi';

const LOCAL_WISHLIST_KEY = 'favorites';

function readLocalWishlist(): FavoriteItem[] {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_WISHLIST_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveLocalWishlist(items: FavoriteItem[]) {
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
}

type WishlistContextValue = {
  favorites: FavoriteItem[];
  isLoading: boolean;
  isSaved: (id?: string, title?: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => Promise<boolean>;
  removeFavorite: (item: FavoriteItem) => Promise<void>;
  clearFavorites: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>(readLocalWishlist);
  const [isLoading, setIsLoading] = useState(isAuthLoading);

  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        if (user) {
          const localItems = readLocalWishlist();
          const dealIds = localItems.flatMap((item) => item.id ? [item.id] : []);
          const accountItems = dealIds.length ? await importWishlist(dealIds) : await getWishlist();
          if (!cancelled) {
            setFavorites(accountItems);
            localStorage.removeItem(LOCAL_WISHLIST_KEY);
          }
        } else if (!cancelled) {
          setFavorites(readLocalWishlist());
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load().catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [isAuthLoading, user]);

  const isSaved = useCallback((id?: string, title?: string) => favorites.some((item) => (
    (id && item.id === id) || (!id && title && item.title === title)
  )), [favorites]);

  const removeFavorite = useCallback(async (item: FavoriteItem) => {
    const matchesItem = (favorite: FavoriteItem) => item.id
      ? favorite.id === item.id
      : favorite.title === item.title;

    if (!user || !item.id) {
      setFavorites((current) => {
        const updated = current.filter((favorite) => !matchesItem(favorite));
        saveLocalWishlist(updated);
        return updated;
      });
      return;
    }

    setFavorites((current) => current.filter((favorite) => !matchesItem(favorite)));
    try {
      await removeWishlistItem(item.id);
    } catch (error) {
      setFavorites((current) => current.some(matchesItem) ? current : [item, ...current]);
      throw error;
    }
  }, [user]);

  const toggleFavorite = useCallback(async (item: FavoriteItem) => {
    const alreadySaved = favorites.some((favorite) => item.id
      ? favorite.id === item.id
      : favorite.title === item.title);
    if (alreadySaved) {
      await removeFavorite(item);
      return false;
    }

    if (user && item.id) {
      setFavorites((current) => [item, ...current.filter((favorite) => favorite.id !== item.id)]);
      try {
        const saved = await addWishlistItem(item.id);
        setFavorites((current) => [saved, ...current.filter((favorite) => favorite.id !== saved.id)]);
      } catch (error) {
        setFavorites((current) => current.filter((favorite) => favorite.id !== item.id));
        throw error;
      }
    } else {
      const updated = [item, ...favorites];
      saveLocalWishlist(updated);
      setFavorites(updated);
    }
    return true;
  }, [favorites, removeFavorite, user]);

  const clearFavorites = useCallback(async () => {
    if (user) await clearAccountWishlist();
    else saveLocalWishlist([]);
    setFavorites([]);
  }, [user]);

  const value = useMemo(() => ({
    favorites,
    isLoading,
    isSaved,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
  }), [favorites, isLoading, isSaved, toggleFavorite, removeFavorite, clearFavorites]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSyncedWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useSyncedWishlist must be used within WishlistProvider');
  return context;
}
