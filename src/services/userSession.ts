const SESSION_TOKEN_KEY = 'deals24-session-token';

export function getUserSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function setUserSessionToken(token: string): void {
  localStorage.setItem(SESSION_TOKEN_KEY, token);
}

export function clearUserSessionToken(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
}
