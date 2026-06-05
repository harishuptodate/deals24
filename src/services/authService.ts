const ADMIN_AUTH_MARKER = 'adminAuth';
const ADMIN_TOKEN_KEY = 'adminAuthToken';
const ADMIN_TOKEN_EXPIRY_KEY = 'adminAuthTokenExpiry';

const getApiBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;

  if (!configuredUrl) {
    return `${window.location.origin}/api`;
  }

  if (configuredUrl.startsWith('http')) {
    return configuredUrl;
  }

  return `${window.location.origin}${configuredUrl}`;
};

const isAuthenticated = () => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const expiry = Number(localStorage.getItem(ADMIN_TOKEN_EXPIRY_KEY) || '0');

  if (!token || !expiry || expiry < Date.now()) {
    return false;
  }

  return true;
};

const login = async (username: string, password: string): Promise<boolean> => {
  const response = await fetch(`${getApiBaseUrl()}/admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    return false;
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.token) {
    return false;
  }

  localStorage.setItem(ADMIN_AUTH_MARKER, 'authenticated_user_token');
  localStorage.setItem(ADMIN_TOKEN_KEY, payload.token);
  localStorage.setItem(
    ADMIN_TOKEN_EXPIRY_KEY,
    String(Date.now() + Number(payload.expiresInMs || 0)),
  );
  return true;
};

const logout = () => {
  localStorage.removeItem(ADMIN_AUTH_MARKER);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_EXPIRY_KEY);
  localStorage.removeItem('editPermissionGranted');
  localStorage.removeItem('categoryPermissionGranted');
  window.location.reload();
};

const getAdminToken = (): string | null => {
  if (!isAuthenticated()) {
    return null;
  }

  return localStorage.getItem(ADMIN_TOKEN_KEY);
};

const hasEditPermission = (): boolean => {
  return localStorage.getItem('editPermissionGranted') === 'true';
};

const hasCategoryPermission = (): boolean => {
  return localStorage.getItem('categoryPermissionGranted') === 'true';
};

const grantEditPermission = (): void => {
  localStorage.setItem('editPermissionGranted', 'true');
};

const grantCategoryPermission = (): void => {
  localStorage.setItem('categoryPermissionGranted', 'true');
};

const verifyActionPassword = (password: string): boolean => {
  const correctPassword = import.meta.env.VITE_DELETE_PASSWORD || 'admin123';
  return password === correctPassword;
};

export { 
  isAuthenticated, 
  login, 
  logout, 
  getAdminToken,
  hasEditPermission, 
  hasCategoryPermission, 
  grantEditPermission, 
  grantCategoryPermission, 
  verifyActionPassword 
};
