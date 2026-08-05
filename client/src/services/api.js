import axios from 'axios';

export const AUTH_TOKEN_KEY = 'academic_auth_token';
export const AUTH_USER_KEY = 'academic_auth_user';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://ai-students-faculty.onrender.com/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401 && !requestUrl.includes('/auth/login')) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: error.response?.data?.message || 'Your session has expired. Please log in again.'
        })
      );
    }

    return Promise.reject(error);
  }
);

export default api;
