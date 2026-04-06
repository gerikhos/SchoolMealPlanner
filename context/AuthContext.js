import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../utils';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Восстановление сессии при запуске
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('auth_token');
        if (storedToken) {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          const json = await res.json();
          if (json.success) {
            setToken(storedToken);
            setUser(json.user);
          } else {
            await AsyncStorage.removeItem('auth_token');
          }
        }
      } catch (err) {
        console.error('Ошибка восстановления сессии:', err);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (json.success) {
      await AsyncStorage.setItem('auth_token', json.token);
      setToken(json.token);
      setUser(json.user);
      return { success: true };
    }
    return { success: false, error: json.error };
  };

  const register = async (username, password, full_name) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, full_name }),
    });
    const json = await res.json();
    if (json.success) {
      await AsyncStorage.setItem('auth_token', json.token);
      setToken(json.token);
      setUser(json.user);
      return { success: true };
    }
    return { success: false, error: json.error };
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {}
    await AsyncStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
