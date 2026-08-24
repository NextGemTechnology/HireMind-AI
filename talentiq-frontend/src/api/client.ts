import axios from 'axios';

const API_BASE = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Refresh on 401 or 403
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isAuthError = status === 401 || (status === 403 && !originalRequest.url?.includes('/auth/login'));

    if (isAuthError && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data?.data?.accessToken || res.data?.accessToken;
          const newRefreshToken = res.data?.data?.refreshToken || res.data?.refreshToken;

          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.warn('Token refresh failed. Clearing credentials.');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          const publicRoutes = ['/', '/jobs', '/user-login', '/hr-login', '/admin-login'];
          if (!publicRoutes.includes(window.location.pathname)) {
            window.location.href = '/user-login';
          }
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.clear();
        const publicRoutes = ['/', '/jobs', '/user-login', '/hr-login', '/admin-login'];
        if (!publicRoutes.includes(window.location.pathname)) {
          window.location.href = '/user-login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
