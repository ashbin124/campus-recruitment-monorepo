/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem('token'));

  const setToken = useCallback((nextToken) => {
    setTokenState(nextToken);
    if (nextToken) localStorage.setItem('token', nextToken);
    else localStorage.removeItem('token');
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!token) {
          if (active) setUser(null);
          return;
        }
        const { data } = await api.get('/auth/me');
        if (active) setUser(data);
      } catch {
        if (active) {
          setUser(null);
          setToken(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token, setToken]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
  }, [setToken]);

  const value = useMemo(
    () => ({ user, setUser, token, setToken, logout }),
    [user, token, setToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
