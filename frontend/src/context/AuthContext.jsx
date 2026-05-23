import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import BanAlert from '../components/BanAlert';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const VITE_API_URL = import.meta.env.VITE_API_URL;

const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

const isTokenExpiringSoon = (token, minutesBeforeExpiry = 5) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const expiresIn = decoded.exp * 1000 - Date.now();
  return expiresIn < minutesBeforeExpiry * 60 * 1000;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBanAlert, setShowBanAlert] = useState(false);
  const [banAlertData, setBanAlertData] = useState(null);
  const banCheckIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const refreshTimerRef = useRef(null);

  const API_URL = `${VITE_API_URL}/api/auth`;

  const setAccessToken = (token) => {
    localStorage.setItem('accessToken', token);
    window.dispatchEvent(new Event('tokenChanged'));
  };

  const removeAccessToken = () => {
    localStorage.removeItem('accessToken');
    window.dispatchEvent(new Event('tokenChanged'));
  };

  const scheduleTokenRefresh = () => {
    const accessToken = localStorage.getItem('accessToken');
    
    if (!accessToken) return;

    const decoded = decodeToken(accessToken);
    if (!decoded || !decoded.exp) return;

    const expiresIn = decoded.exp * 1000 - Date.now() - (5 * 60 * 1000);
    
    if (expiresIn > 0) {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        if (isRefreshingRef.current) return;
        
        try {
          isRefreshingRef.current = true;
          
          const refreshToken = localStorage.getItem('refreshToken');
          if (!refreshToken) {
            logout();
            return;
          }

          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access, refresh } = response.data;
          setAccessToken(access);
          
          if (refresh) {
            localStorage.setItem('refreshToken', refresh);
          }
                    
          scheduleTokenRefresh();
        } catch (error) {
          logout();
        } finally {
          isRefreshingRef.current = false;
        }
      }, expiresIn);

    } else {
      console.log('[AUTH] Token expiring soon, refreshing immediately...');
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        axios.post(`${API_URL}/token/refresh/`, { refresh: refreshToken })
          .then(response => {
            const { access, refresh } = response.data;
            setAccessToken(access);
            if (refresh) {
              localStorage.setItem('refreshToken', refresh);
            }
            scheduleTokenRefresh();
          })
          .catch(() => logout());
      }
    }
  };

  const uploadProfilePicture = async (file) => {
    try {
      setError(null);
      
      if (!file) {
        throw new Error('No file selected');
      }
      
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }
      
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, GIF and WebP images are allowed');
      }
      
      const formData = new FormData();
      formData.append('profile_picture', file);
      
      const response = await axios.post(`${API_URL}/profile-picture/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const updatedUser = {
        ...user,
        profile_picture_url: response.data.profile_picture_url
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { 
        success: true, 
        message: response.data.message,
        profile_picture_url: response.data.profile_picture_url 
      };
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.profile_picture?.[0] ||
                       err.message ||
                       'Failed to upload profile picture';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const removeProfilePicture = async () => {
    try {
      setError(null);
      const response = await axios.delete(`${API_URL}/profile-picture/`);
      
      const updatedUser = {
        ...user,
        profile_picture_url: response.data.profile_picture_url
      };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { 
        success: true, 
        message: response.data.message,
        profile_picture_url: response.data.profile_picture_url 
      };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to remove profile picture';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const handleBanResponse = (error) => {
    if (error.response?.status === 403 && error.response?.data?.banned) {
      const banData = error.response.data;
      
      removeAccessToken();
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      
      if (banCheckIntervalRef.current) {
        clearInterval(banCheckIntervalRef.current);
        banCheckIntervalRef.current = null;
      }

      setBanAlertData(banData);
      setShowBanAlert(true);
      
      return true;
    }
    return false;
  };

  const handleBanAlertClose = () => {
    setShowBanAlert(false);
    setBanAlertData(null);
    window.location.href = '/login';
  };

  const checkBanStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      await axios.get(`${API_URL}/user/`);
    } catch (error) {
      if (error.response?.status === 403) {
        handleBanResponse(error);
      }
    }
  };

  const startBanChecking = () => {
    if (banCheckIntervalRef.current) {
      clearInterval(banCheckIntervalRef.current);
    }

    checkBanStatus();

    banCheckIntervalRef.current = setInterval(() => {
      checkBanStatus();
    }, 15000);
  };

  const stopBanChecking = () => {
    if (banCheckIntervalRef.current) {
      clearInterval(banCheckIntervalRef.current);
      banCheckIntervalRef.current = null;
    }
  };

  const logout = () => {
    stopBanChecking();
    
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    
    removeAccessToken();
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    isRefreshingRef.current = false;
  };

  useEffect(() => {
    const handleFocus = () => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken && isTokenExpiringSoon(accessToken, 10)) {
        console.log('[AUTH] Window focused, checking token...');
        scheduleTokenRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (handleBanResponse(error)) {
          return Promise.reject(error);
        }

        const originalRequest = error.config;

        if (
          error.response?.status === 401 && 
          !originalRequest._retry && 
          !originalRequest.url?.includes('/token/refresh/') &&
          !isRefreshingRef.current 
        ) {
          originalRequest._retry = true;
          isRefreshingRef.current = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
              console.log('[AUTH] No refresh token found, logging out...');
              isRefreshingRef.current = false;
              logout();
              return Promise.reject(error);
            }

            console.log('[AUTH] Access token expired, attempting refresh...');
            const response = await axios.post(`${API_URL}/token/refresh/`, {
              refresh: refreshToken,
            });

            const { access, refresh } = response.data;
            setAccessToken(access);
            
            if (refresh) {
              localStorage.setItem('refreshToken', refresh);
              console.log('[AUTH] New refresh token saved');
            }
            
            isRefreshingRef.current = false;

            console.log('[AUTH] Token refreshed successfully');
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return axios(originalRequest);
          } catch (refreshError) {
            console.error('[AUTH] Token refresh failed:', refreshError.response?.status);
            isRefreshingRef.current = false;
            
            if (handleBanResponse(refreshError)) {
              return Promise.reject(refreshError);
            }
            
            console.log('[AUTH] Refresh token invalid, logging out...');
            logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
      stopBanChecking();
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/user/`);
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          startBanChecking();
          scheduleTokenRefresh();
        } catch (error) {
          if (!handleBanResponse(error)) {
            console.log('[AUTH] Init failed, checking stored user...');
            if (storedUser) {
              try {
                setUser(JSON.parse(storedUser));
                startBanChecking();
                scheduleTokenRefresh();
              } catch (e) {
                console.error('Failed to parse stored user:', e);
                removeAccessToken();
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
              }
            } else {
              removeAccessToken();
              localStorage.removeItem('refreshToken');
            }
          }
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const register = async (formData, recaptchaToken) => {
    try {
      setError(null);
      const payload = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        password: formData.password,
        password2: formData.password2 || formData.confirmPassword,
        recaptcha_token: recaptchaToken,
      };
      const response = await axios.post(`${API_URL}/register/`, payload);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const login = async (credentials, recaptchaToken) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/login/`, {
        ...credentials,
        recaptcha_token: recaptchaToken,
      });
      const { access, refresh, user: userData, is_admin, redirect_to } = response.data;

      setAccessToken(access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      if (is_admin && redirect_to) {
        window.location.href = redirect_to;
        return { success: true, is_admin: true };
      }

      startBanChecking();
      scheduleTokenRefresh();

      return { success: true, is_admin: false };
    } catch (err) {
      console.error('Login error:', err);

      if (err.response?.status === 403 && err.response?.data?.banned) {
        const banData = err.response.data;
        
        setBanAlertData(banData);
        setShowBanAlert(true);
        
        return {
          success: false,
          error: 'Account is banned',
          banned: true
        };
      }

      if (err.response?.status === 429) {
        const errorMsg = err.response.data.error || 'Too many login attempts. Please try again later.';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          locked: err.response.data.locked || true,
          retry_after: err.response.data.retry_after || 300
        };
      }

      if (err.response?.status === 403) {
        const errorMsg = err.response.data.error || 'Account not verified';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          email_not_verified: err.response.data.email_not_verified || true
        };
      }

      if (err.response?.status === 401) {
        const errorMsg = err.response.data.error || 'Invalid email or password';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          attempts_remaining: err.response.data.attempts_remaining
        };
      }

      if (err.response?.data) {
        const errorMsg = err.response.data.error || 'Login failed. Please try again.';
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
          attempts_remaining: err.response.data.attempts_remaining,
          email_not_verified: err.response.data.email_not_verified
        };
      }
      const errorMsg = 'Network error. Please check your connection and try again.';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
  };

  const verifyEmail = async (token) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/verify-email/`, { token });
      const { access, refresh, user: userData } = response.data;

      setAccessToken(access);
      localStorage.setItem('refreshToken', refresh);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      startBanChecking();
      scheduleTokenRefresh();

      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Verification failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resendVerification = async (email) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/resend-verification/`, { email });
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to resend verification';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const requestPasswordReset = async (email, recaptchaToken) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/password-reset/`, { 
        email,
        recaptcha_token: recaptchaToken,
      });
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to send reset email';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const resetPassword = async (token, password, password2) => {
    try {
      setError(null);
      const response = await axios.post(`${API_URL}/password-reset-confirm/`, {
        token,
        password,
        password2,
      });
      return { success: true, message: response.data.message };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.password?.[0] ||
        'Password reset failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    uploadProfilePicture,
    removeProfilePicture,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <BanAlert 
        isOpen={showBanAlert} 
        onClose={handleBanAlertClose} 
        banData={banAlertData} 
      />
    </AuthContext.Provider>
  );
};

export default AuthProvider;
