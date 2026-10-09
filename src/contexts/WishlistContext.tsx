import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

function accountWishlistKey(userId: string) {
  return `deals24-account-wishlist:${userId}`;
}

function readAccountWishlist(userId: string): FavoriteItem[] | null {
  try {
    const raw = localStorage.getItem(accountWishlistKey(userId));
    if (raw === null) return null;
    const stored = JSON.parse(raw);
    return Array.isArray(stored) ? stored : null;
  } catch {
    return null;
  }
}

function saveAccountWishlist(userId: string, items: FavoriteItem[]) {
  localStorage.setItem(accountWishlistKey(userId), JSON.stringify(items));
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
  const userId = user?.id;
  const initialAccountWishlist = user ? readAccountWishlist(user.id) : null;
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => initialAccountWishlist ?? readLocalWishlist());
  const [isLoading, setIsLoading] = useState(isAuthLoading && initialAccountWishlist === null);
  const favoritesRef = useRef(favorites);
  const pendingToggles = useRef(new Set<string>());
  const ownerScope = user?.id ?? (isAuthLoading ? 'pending' : 'guest');

  const commitFavorites = useCallback((update: (current: FavoriteItem[]) => FavoriteItem[]) => {
    setFavorites((current) => {
      const updated = update(current);
      favoritesRef.current = updated;
      if (userId) saveAccountWishlist(userId, updated);
      else saveLocalWishlist(updated);
      return updated;
    });
  }, [userId]);

  useEffect(() => {
    if (ownerScope === 'pending') return;
    let cancelled = false;
    const load = async () => {
      const cachedItems = userId ? readAccountWishlist(userId) : null;
      if (cachedItems) {
        favoritesRef.current = cachedItems;
        setFavorites(cachedItems);
      }
      setIsLoading(Boolean(userId && cachedItems === null));
      try {
        if (userId) {
          const localItems = readLocalWishlist();
          const dealIds = localItems.flatMap((item) => item.id ? [item.id] : []);
          const accountItems = dealIds.length ? await importWishlist(dealIds) : await getWishlist();
          if (!cancelled) {
            favoritesRef.current = accountItems;
            setFavorites(accountItems);
            saveAccountWishlist(userId, accountItems);
            localStorage.removeItem(LOCAL_WISHLIST_KEY);
          }
        } else if (!cancelled) {
          const localItems = readLocalWishlist();
          favoritesRef.current = localItems;
          setFavorites(localItems);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load().catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [ownerScope, userId]);

  const isSaved = useCallback((id?: string, title?: string) => favorites.some((item) => (
    (id && item.id === id) || (!id && title && item.title === title)
  )), [favorites]);

  const removeFavorite = useCallback(async (item: FavoriteItem) => {
    const matchesItem = (favorite: FavoriteItem) => item.id
      ? favorite.id === item.id
      : favorite.title === item.title;

    if (!userId || !item.id) {
      commitFavorites((current) => current.filter((favorite) => !matchesItem(favorite)));
      return;
    }

    commitFavorites((current) => current.filter((favorite) => !matchesItem(favorite)));
    try {
      await removeWishlistItem(item.id);
    } catch (error) {
      commitFavorites((current) => current.some(matchesItem) ? current : [item, ...current]);
      throw error;
    }
  }, [commitFavorites, userId]);

  const toggleFavorite = useCallback(async (item: FavoriteItem) => {
    const toggleKey = item.id || item.title;
    if (pendingToggles.current.has(toggleKey)) {
      return favoritesRef.current.some((favorite) => item.id
        ? favorite.id === item.id
        : favorite.title === item.title);
    }

    pendingToggles.current.add(toggleKey);
    const alreadySaved = favoritesRef.current.some((favorite) => item.id
      ? favorite.id === item.id
      : favorite.title === item.title);
    try {
      if (alreadySaved) {
        await removeFavorite(item);
        return false;
      }

      if (userId && item.id) {
        commitFavorites((current) => [item, ...current.filter((favorite) => favorite.id !== item.id)]);
        const saved = await addWishlistItem(item.id);
        commitFavorites((current) => [saved, ...current.filter((favorite) => favorite.id !== saved.id)]);
      } else {
        commitFavorites((current) => [item, ...current.filter((favorite) => item.id
          ? favorite.id !== item.id
          : favorite.title !== item.title)]);
      }
      return true;
    } catch (error) {
      if (!alreadySaved) {
        commitFavorites((current) => current.filter((favorite) => item.id
          ? favorite.id !== item.id
          : favorite.title !== item.title));
      }
      throw error;
    } finally {
      pendingToggles.current.delete(toggleKey);
    }
  }, [commitFavorites, removeFavorite, userId]);

  const clearFavorites = useCallback(async () => {
    if (userId) await clearAccountWishlist();
    commitFavorites(() => []);
  }, [commitFavorites, userId]);

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
