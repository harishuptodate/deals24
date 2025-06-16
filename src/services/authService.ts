
const isAuthenticated = () => {
  return localStorage.getItem('adminAuth') === 'authenticated_user_token';
};

const login = (username: string, password: string): boolean => {
  if (
    username === import.meta.env.VITE_ADMIN_USERNAME && 
    password === import.meta.env.VITE_ADMIN_PASSWORD
  ) {
    localStorage.setItem('adminAuth', 'authenticated_user_token');
    return true;
  }
  return false;
};

const logout = () => {
  localStorage.removeItem('adminAuth');
  localStorage.removeItem('editPermissionGranted');
  localStorage.removeItem('categoryPermissionGranted');
  window.location.reload();
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
  hasEditPermission, 
  hasCategoryPermission, 
  grantEditPermission, 
  grantCategoryPermission, 
  verifyActionPassword 
};
