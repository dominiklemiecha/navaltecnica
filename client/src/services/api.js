import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE
});

// Aggiungi token a ogni richiesta
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect a login se 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password })
};

// Data
export const dataApi = {
  getLocations: () => api.get('/data/locations'),
  getDestinations: (locationId) => api.get('/data/destinations', { params: { location_id: locationId } }),
  getBrands: () => api.get('/data/brands'),
  getModels: (brandId) => api.get('/data/models', { params: { brand_id: brandId } }),
  getParts: (modelId) => api.get(`/data/parts/${modelId}`),
  getPricing: () => api.get('/data/pricing')
};

// Quotations
export const quotationApi = {
  list: () => api.get('/quotations'),
  get: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  updateStatus: (id, status) => api.patch(`/quotations/${id}/status`, { status }),
  delete: (id) => api.delete(`/quotations/${id}`),
  getPdf: (id) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' })
};

// Admin
export const adminApi = {
  // Destinations
  getDestinations: () => api.get('/admin/destinations'),
  createDestination: (data) => api.post('/admin/destinations', data),
  updateDestination: (id, data) => api.put(`/admin/destinations/${id}`, data),
  deleteDestination: (id) => api.delete(`/admin/destinations/${id}`),

  // Models
  getModels: () => api.get('/admin/models'),
  createModel: (data) => api.post('/admin/models', data),
  updateModel: (id, data) => api.put(`/admin/models/${id}`, data),
  deleteModel: (id) => api.delete(`/admin/models/${id}`),

  // Categories
  getCategories: (modelId) => api.get('/admin/categories', { params: { model_id: modelId } }),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),

  // Parts
  getParts: (params) => api.get('/admin/parts', { params }),
  createPart: (data) => api.post('/admin/parts', data),
  updatePart: (id, data) => api.put(`/admin/parts/${id}`, data),
  deletePart: (id) => api.delete(`/admin/parts/${id}`),

  // Pricing
  getPricing: () => api.get('/admin/pricing'),
  updatePricing: (id, value) => api.put(`/admin/pricing/${id}`, { value }),

  // Brands
  getBrands: () => api.get('/admin/brands'),
};

export default api;
