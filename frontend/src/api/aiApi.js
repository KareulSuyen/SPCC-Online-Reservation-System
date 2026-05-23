import axios from 'axios';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: `${VITE_API_URL}`, 
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${VITE_API_URL}/api/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('accessToken', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const sendPrompt = async (prompt) => {
  try {
    console.log('Sending prompt to AI endpoint:', prompt);
    
    const response = await api.post('/api/ai/ai/', {  
      prompt: prompt
    });

    console.log('AI API response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('AI API error:', error);
    
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', error.response.data);
      
      const errorMsg = error.response.data?.error || 
        error.response.data?.details || 
        error.response.data?.message ||
        `HTTP ${error.response.status}: ${error.response.statusText}`;
      
      throw new Error(`AI API Error: ${errorMsg}`);
      
    } else if (error.request) {
      console.error('Network Error - No response received');
      throw new Error('Network Error: No response from server. Please check your connection.');
      
    } else {
      console.error('Request Setup Error:', error.message);
      throw new Error(`Request Error: ${error.message}`);
    }
  }
};

export default api;
