import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  getCurrentUser,
  logoutUser,
  requestMagicLink,
  verifyMagicLink,
  type AuthUser,
} from '@/services/api/authApi';
import {
  clearUserSessionToken,
  getUserSessionToken,
  setUserSessionToken,
} from '@/services/userSession';

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  completeSignIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const CACHED_USER_KEY = 'deals24-cached-user';

function readCachedUser(): AuthUser | null {
  if (!getUserSessionToken()) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(CACHED_USER_KEY) || 'null');
    return cached && typeof cached.id === 'string' && typeof cached.email === 'string'
      ? cached
      : null;
  } catch {
    return null;
  }
}

function cacheUser(user: AuthUser | null) {
  if (user) localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CACHED_USER_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readCachedUser);
  const [isLoading, setIsLoading] = useState(Boolean(getUserSessionToken()));

  useEffect(() => {
    if (!getUserSessionToken()) return;
    getCurrentUser()
      .then((currentUser) => {
        cacheUser(currentUser);
        setUser(currentUser);
      })
      .catch(() => {
        clearUserSessionToken();
        cacheUser(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const sendMagicLink = useCallback((email: string) => requestMagicLink(email), []);

  const completeSignIn = useCallback(async (token: string) => {
    const result = await verifyMagicLink(token);
    setUserSessionToken(result.sessionToken);
    cacheUser(result.user);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearUserSessionToken();
      cacheUser(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    sendMagicLink,
    completeSignIn,
    signOut,
  }), [user, isLoading, sendMagicLink, completeSignIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
