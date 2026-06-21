import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  register: (userData) => api.post('/auth/register', userData),
  me: (token) => api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
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
  delete: (id) => api.delete(`/memos/${id}`),
  getHistory: (id) => api.get(`/memos/${id}/history`)
};

// クリエイティブAPI
export const creativeAPI = {
  getAll: (params) => api.get('/creatives', { params }),
  getById: (id) => api.get(`/creatives/${id}`),
  create: (formData) => api.post('/creatives', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/creatives/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/creatives/${id}`)
};

// クリエイティブ素材API（画像・広告文 個別管理）
export const creativeImageAPI = {
  getAll: (params) => api.get('/creative-assets/images', { params }),
  create: (formData) => api.post('/creative-assets/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/creative-assets/images/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/creative-assets/images/${id}`),
};
export const creativeTextAPI = {
  getAll: (params) => api.get('/creative-assets/texts', { params }),
  create: (data) => api.post('/creative-assets/texts', data),
  update: (id, data) => api.put(`/creative-assets/texts/${id}`, data),
  delete: (id) => api.delete(`/creative-assets/texts/${id}`),
};

// チャットAPI
export const chatAPI = {
  send: (messages, sessionId) => api.post('/chat', { messages, sessionId }),
  getSessions: () => api.get('/chat/sessions'),
  getSession: (sessionId) => api.get(`/chat/sessions/${sessionId}`),
  deleteSession: (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
};

// Meta API
export const metaAPI = {
  test: () => api.get('/meta/test'),
  sync: (start_date, end_date) => api.post('/meta/sync', { start_date, end_date }),
};

export default api;
