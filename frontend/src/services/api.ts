import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('balanceiq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('balanceiq_token');
      localStorage.removeItem('balanceiq_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
};

// ---- Groups ----
export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id: string) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string; default_currency?: string }) =>
    api.post('/groups', data),
  update: (id: string, data: any) => api.put(`/groups/${id}`, data),
  addMember: (groupId: string, data: any) =>
    api.post(`/groups/${groupId}/members`, data),
  updateMember: (groupId: string, memberId: string, data: any) =>
    api.patch(`/groups/${groupId}/members/${memberId}`, data),
  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),
};

// ---- Expenses ----
export const expensesApi = {
  list: (groupId: string, params?: any) =>
    api.get(`/groups/${groupId}/expenses`, { params }),
  get: (groupId: string, expenseId: string) =>
    api.get(`/groups/${groupId}/expenses/${expenseId}`),
  create: (groupId: string, data: any) =>
    api.post(`/groups/${groupId}/expenses`, data),
  update: (groupId: string, expenseId: string, data: any) =>
    api.put(`/groups/${groupId}/expenses/${expenseId}`, data),
  delete: (groupId: string, expenseId: string) =>
    api.delete(`/groups/${groupId}/expenses/${expenseId}`),
};

// ---- Settlements ----
export const settlementsApi = {
  list: (groupId: string) => api.get(`/groups/${groupId}/settlements`),
  create: (groupId: string, data: any) =>
    api.post(`/groups/${groupId}/settlements`, data),
  getRecommendations: (groupId: string) =>
    api.get(`/groups/${groupId}/settlements/recommendations`),
};

// ---- Imports ----
export const importsApi = {
  list: (groupId: string) => api.get(`/groups/${groupId}/imports`),
  upload: (groupId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/groups/${groupId}/imports/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateMapping: (groupId: string, importId: string, mapping: any) =>
    api.post(`/groups/${groupId}/imports/${importId}/mapping`, mapping),
  getMembership: (groupId: string, importId: string) =>
    api.get(`/groups/${groupId}/imports/${importId}/membership`),
  confirmMembership: (groupId: string, importId: string, data: any) =>
    api.post(`/groups/${groupId}/imports/${importId}/membership`, data),
  getAnomalies: (groupId: string, importId: string) =>
    api.get(`/groups/${groupId}/imports/${importId}/anomalies`),
  resolveAnomaly: (groupId: string, importId: string, anomalyId: string, data: any) =>
    api.patch(`/groups/${groupId}/imports/${importId}/anomalies/${anomalyId}`, data),
  execute: (groupId: string, importId: string, data?: any) =>
    api.post(`/groups/${groupId}/imports/${importId}/execute`, data),
  getReport: (groupId: string, importId: string) =>
    api.get(`/groups/${groupId}/imports/${importId}/report`),
};

// ---- Balances ----
export const balancesApi = {
  get: (groupId: string) => api.get(`/groups/${groupId}/balances`),
  explain: (groupId: string, userId: string) =>
    api.get(`/groups/${groupId}/balances/${userId}/explain`),
};

// ---- Dashboard ----
export const dashboardApi = {
  getMetrics: () => api.get('/dashboard'),
};

// ---- Reports ----
export const reportsApi = {
  monthlyTrends: (groupId: string) =>
    api.get(`/groups/${groupId}/reports/monthly-trends`),
  categories: (groupId: string) =>
    api.get(`/groups/${groupId}/reports/categories`),
  contributions: (groupId: string) =>
    api.get(`/groups/${groupId}/reports/contributions`),
  settlements: (groupId: string) =>
    api.get(`/groups/${groupId}/reports/settlements`),
  currencies: (groupId: string) =>
    api.get(`/groups/${groupId}/reports/currencies`),
};

export default api;
