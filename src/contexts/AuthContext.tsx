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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(getUserSessionToken()));

  useEffect(() => {
    if (!getUserSessionToken()) return;
    getCurrentUser()
      .then(setUser)
      .catch(() => clearUserSessionToken())
      .finally(() => setIsLoading(false));
  }, []);

  const sendMagicLink = useCallback((email: string) => requestMagicLink(email), []);

  const completeSignIn = useCallback(async (token: string) => {
    const result = await verifyMagicLink(token);
    setUserSessionToken(result.sessionToken);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      clearUserSessionToken();
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
