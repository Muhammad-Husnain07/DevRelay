import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devrelay_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('devrelay_token');
      localStorage.removeItem('devrelay_workspace');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const get = (...args) => api.get(...args);
export const post = (...args) => api.post(...args);
export const put = (...args) => api.put(...args);
export const del = (...args) => api.delete(...args);

export default api;