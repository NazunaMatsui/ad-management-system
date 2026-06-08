import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axiosインスタンス作成
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター（トークン自動付与）
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// レスポンスインターセプター（エラーハンドリング）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラー時はログアウト
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 認証API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData)
};

// キャンペーンAPI
export const campaignAPI = {
  getAll: () => api.get('/campaigns'),
  getById: (id) => api.get(`/campaigns/${id}`),
  create: (data) => api.post('/campaigns', data),
  update: (id, data) => api.put(`/campaigns/${id}`, data),
  delete: (id) => api.delete(`/campaigns/${id}`)
};

// 指標API
export const metricsAPI = {
  get: (params) => api.get('/metrics', { params }),
  getSummary: (params) => api.get('/metrics/summary', { params }),
  compare: (params) => api.get('/metrics/compare', { params }),
  create: (data) => api.post('/metrics', data),
  delete: (id) => api.delete(`/metrics/${id}`)
};

// メモAPI
export const memoAPI = {
  get: (params) => api.get('/memos', { params }),
  getById: (id) => api.get(`/memos/${id}`),
  create: (data) => api.post('/memos', data),
  update: (id, data) => api.put(`/memos/${id}`, data),
  delete: (id) => api.delete(`/memos/${id}`)
};

export default api;
