import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/emailverification.module.scss';

export const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('verifying'); 
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      const result = await verifyEmail(token);

      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    };

    verify();
  }, [token]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'verifying' && (
          <div className={styles.content}>
            <div className={styles.spinner}></div>
            <h2 className={styles.title}>Verifying your email...</h2>
            <p className={styles.subtitle}>Please wait while we confirm your email address</p>
          </div>
        )}

        {status === 'success' && (
          <div className={`${styles.content} ${styles.success}`}>
            <div className={styles.iconWrapper}>
              <svg
                className={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className={styles.title}>Email verified successfully!</h3>
            <p className={styles.subtitle}>Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className={`${styles.content} ${styles.error}`}>
            <div className={styles.iconWrapper}>
              <svg
                className={styles.icon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className={styles.title}>Verification failed</h3>
            <p className={styles.subtitle}>{message}</p>
            <button
              onClick={() => navigate('/login')}
              className={styles.button}
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;