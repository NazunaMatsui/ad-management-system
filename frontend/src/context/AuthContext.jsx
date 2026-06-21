import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    // トークンでサーバーから実際のユーザー情報を取得
    authAPI.me(token).then(res => {
      setUser(res.data);
      sessionStorage.setItem('user', JSON.stringify(res.data));
    }).catch(() => {
      // トークンが無効なら強制ログアウト
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user: userData } = response.data;

      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'ログインに失敗しました'
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (patch) => {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      sessionStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
