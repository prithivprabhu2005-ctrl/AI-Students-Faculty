import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../services/api';

const AuthContext = createContext(null);

const getDefaultRoute = (role) => {
  if (role === 'staff' || role === 'admin' || role === 'faculty') {
    return '/staff/dashboard';
  }

  return '/student/dashboard';
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem(AUTH_USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(AUTH_TOKEN_KEY)));

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const clearSession = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      setLoading(false);
      return null;
    }

    try {
      const response = await api.get('/auth/profile');
      const freshUser = response.data.user;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
      setUser(freshUser);
      setToken(localStorage.getItem(AUTH_TOKEN_KEY));
      return freshUser;
    } catch (error) {
      clearSession();
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      setLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    persistSession(response.data.token, response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    try {
      if (localStorage.getItem(AUTH_TOKEN_KEY)) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      // Ignore logout API failures and clear local state.
    } finally {
      clearSession();
    }
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      refreshProfile,
      defaultRoute: getDefaultRoute(user?.role)
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
