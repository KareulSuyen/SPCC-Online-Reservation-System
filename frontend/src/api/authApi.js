api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/token/refresh/`, { refresh: refreshToken });
          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData) => api.post('/register/', userData).then(res => res.data),
  login: async (credentials) => {
    const res = await api.post('/login/', credentials);
    if (res.data.access && res.data.refresh) {
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('refresh_token', res.data.refresh);
    }
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/logout/');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },
  getCurrentUser: async () => api.get('/user/').then(res => res.data),
  changePassword: async (passwordData) => api.post('/password/change/', passwordData).then(res => res.data),
  requestPasswordReset: async (email) => api.post('/password-reset/', { email }).then(res => res.data),
  confirmPasswordReset: async (data) => api.post('/password-reset-confirm/', data).then(res => res.data),
  verifyEmail: async (token) => api.post('/verify-email/', { token }).then(res => res.data),
  resendVerification: async (email) => api.post('/resend-verification/', { email }).then(res => res.data),
  refreshToken: async (refreshToken) => api.post('/token/refresh/', { refresh: refreshToken }).then(res => res.data),
};

export const dashboardAPI = {
  getDashboard: async () => api.get('/dashboard/').then(res => res.data),
};

export const setAuthTokens = (access, refresh) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const isAuthenticated = () => !!getAccessToken();

export default api;
