import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiEyeSlash, HiHome } from 'react-icons/hi2';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from '../styles/login.module.scss';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const recaptchaRef = useRef(null);
  const timerRef = useRef(null);
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [lockUntil, setLockUntil] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  useEffect(() => {
    const lockData = localStorage.getItem('loginLockData');
    if (lockData) {
      const { lockUntil: storedLockUntil, email, errorMessage } = JSON.parse(lockData);
      const now = Date.now();
      
      if (storedLockUntil > now) {
        const remainingSeconds = Math.ceil((storedLockUntil - now) / 1000);
        setIsLocked(true);
        setLockUntil(storedLockUntil);
        setLockTimer(remainingSeconds);
        setError(errorMessage || 'Too many failed login attempts. Please try again later.');
        setFormData(prev => ({ ...prev, email }));
      } else {
        localStorage.removeItem('loginLockData');
      }
    }
  }, []);

  useEffect(() => {
    const updateTimer = () => {
      if (lockUntil) {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));
        
        if (remaining > 0) {
          setLockTimer(remaining);
        } else {
          setIsLocked(false);
          setError('');
          setAttemptsRemaining(null);
          setLockUntil(null);
          localStorage.removeItem('loginLockData');
        }
      }
    };

    if (lockUntil) {
      updateTimer(); 
      timerRef.current = setInterval(updateTimer, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [lockUntil]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error && !isLocked) {
      setError('');
      setAttemptsRemaining(null);
    }
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    if (error && error.toLowerCase().includes('recaptcha')) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      return;
    }

    setLoading(true);
    setError('');
    setAttemptsRemaining(null);

    const result = await login(
      { email: formData.email, password: formData.password },
      recaptchaToken
    );

    if (result.success) {
      if (!result.is_admin) {
        navigate('/dashboard');
      }
    } else {
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }

      if (result.locked) {
        const lockDuration = (result.retry_after || 300) * 1000;
        const newLockUntil = Date.now() + lockDuration;
        
        setIsLocked(true);
        setLockUntil(newLockUntil);
        setLockTimer(result.retry_after || 300);
        setError(result.error);
        
        localStorage.setItem('loginLockData', JSON.stringify({
          lockUntil: newLockUntil,
          email: formData.email,
          errorMessage: result.error
        }));
      } else {
        setError(result.error);
        if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
        }
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          gap: '1.5rem'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(255, 255, 255, 0.2)',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{
            color: '#fff',
            fontSize: '1.1rem',
            fontWeight: '500',
            margin: 0,
            textAlign: 'center'
          }}>
            Signing you in...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <div className={styles.page}>
        <div className={styles.container}>
          <button
            type="button"
            onClick={() => navigate('/introduction')}
            className={styles.homeButton}
            disabled={loading || isLocked}
            aria-label="Go to home page"
          >
            <HiHome />
            <span>Home</span>
          </button>

          <h1 className={styles.title}>Welcome Back</h1>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your SPCC email"
                required
                disabled={loading || isLocked}
                autoComplete="off"
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordInput}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={loading || isLocked}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isLocked}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <HiEyeSlash /> : <HiEye />}
                </button>
              </div>
            </div>

            <div className={styles.recaptchaContainer}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
                onExpired={() => setRecaptchaToken(null)}
                onErrored={() => {
                  setRecaptchaToken(null);
                  setError('reCAPTCHA error. Please try again.');
                }}
                theme="light"
              />
            </div>

            <div className={styles.forgotPassword}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || isLocked}
              >
                Forgot Password?
              </button>
            </div>

            <button 
              type="submit" 
              className={styles.button} 
              disabled={loading || isLocked || !recaptchaToken}
            >
              {loading ? 'Signing In...' : isLocked ? 'Locked' : 'Sign In'}
            </button>
          </form>

          {error && (
            <div className={`${styles.error} ${isLocked ? styles.errorLocked : ''}`}>
              {error}
              {isLocked && (
                <div className={styles.lockTimer}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Try again in {formatTime(lockTimer)}</span>
                </div>
              )}
            </div>
          )}

          {attemptsRemaining !== null && !isLocked && (
            <div className={styles.attemptsWarning}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>
                {attemptsRemaining === 0 
                  ? 'Account will be locked after next failed attempt' 
                  : `${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
          )}

          <div className={styles.switchPage}>
            Don't have an account?
            <button
              type="button"
              onClick={() => navigate('/register')}
              disabled={loading || isLocked}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;