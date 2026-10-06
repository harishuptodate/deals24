import api from './client';
import { getOwnerToken } from './alertsApi';

export type AuthUser = { id: string; email: string };

export async function requestMagicLink(email: string): Promise<void> {
  await api.post('/auth/magic-link', { email, ownerToken: getOwnerToken() });
}

export async function verifyMagicLink(token: string): Promise<{
  sessionToken: string;
  expiresAt: string;
  user: AuthUser;
}> {
  const response = await api.post('/auth/verify', { token });
  return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>('/auth/me');
  return response.data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}
