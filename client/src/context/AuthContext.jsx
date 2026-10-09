import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as apiLogin, removeToken, setToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if we have an existing session on mount
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const token = localStorage.getItem('carelume_token');
        if (!token) {
          setLoading(false);
          return;
        }
        const userData = await getMe();
        if (!cancelled) {
          setUser(userData);
        }
      } catch {
        removeToken();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    setUser(data.user);
    return data.user;
  }, []);

  const setSession = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    login,
    setSession,
    logout,
    isStaff: user?.role === 'staff',
    isPatient: user?.role === 'patient',
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
