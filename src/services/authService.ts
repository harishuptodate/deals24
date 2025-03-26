const isAuthenticated = () => {
  return localStorage.getItem('adminAuth') === 'true';
};

const login = (username: string, password: string): boolean => {
  if (
    username === import.meta.env.VITE_ADMIN_USERNAME && 
    password === import.meta.env.VITE_ADMIN_PASSWORD
  ) {
    localStorage.setItem('adminAuth', 'true');
    return true;
  }
  return false;
};

const logout = () => {
  localStorage.removeItem('adminAuth');
};

export { isAuthenticated, login, logout };
