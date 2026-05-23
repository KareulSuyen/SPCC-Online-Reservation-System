import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdEmail } from 'react-icons/md';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from '../styles/forgotPass.module.scss';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

export const ForgotPassword = () => {
  const { requestPasswordReset } = useAuth();
  const recaptchaRef = useRef(null);
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    if (error && error.toLowerCase().includes('recaptcha')) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email.endsWith('@spcc.edu.ph')) {
      setError('Only @spcc.edu.ph email addresses are allowed');
      setLoading(false);
      return;
    }

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification');
      setLoading(false);
      return;
    }

    const result = await requestPasswordReset(email, recaptchaToken);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
      // Reset reCAPTCHA on error
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    }

    setLoading(false);
  };

  const handleOpenEmail = () => {
    setShowEmailWarning(true);
  };

  const confirmEmailRedirect = () => {
    const gmailUrl = 'https://mail.google.com/mail/u/0/#inbox';
    window.open(gmailUrl, '_blank');
    setShowEmailWarning(false);
  };

  const cancelEmailRedirect = () => {
    setShowEmailWarning(false);
  };

  if (success) {
    return (
      <>
        <div className={styles.page}>
          <div className={styles.successContainer}>
            <div className={styles.successBox}>
              <div className={styles.successIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className={styles.successContent}>
                <h3 className={styles.successTitle}>
                  Password reset email sent!
                </h3>
                <p className={styles.successText}>
                  Please check your inbox and click the link to reset your password.
                </p>
                <p className={styles.successNote}>
                  The link will expire in 24 hours.
                </p>
                
                <button 
                  onClick={handleOpenEmail}
                  className={styles.emailButton}
                >
                  <MdEmail size={20} />
                  Open Gmail
                </button>

                <div className={styles.successActions}>
                  <Link to="/login" className={styles.backLink}>
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showEmailWarning && (
          <div className={styles.modalOverlay} onClick={cancelEmailRedirect}>
            <div className={styles.warningModal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.warningHeader}>
                <MdEmail size={48} className={styles.warningIcon} />
                <h3 className={styles.warningTitle}>Open Email Client?</h3>
              </div>
              <div className={styles.warningBody}>
                <p className={styles.warningText}>
                  You will be redirected to Gmail to check your inbox.
                </p>
                <p className={styles.warningNote}>
                  A new tab will open with your Gmail inbox.
                </p>
              </div>
              <div className={styles.warningActions}>
                <button onClick={cancelEmailRedirect} className={styles.cancelButton}>
                  Cancel
                </button>
                <button onClick={confirmEmailRedirect} className={styles.confirmButton}>
                  Open Gmail
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

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
            Sending reset link...
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
          <div className={styles.header}>
            <h2 className={styles.title}>Reset your password</h2>
            <p className={styles.subtitle}>
              Enter your SPCC email address and we'll send you a reset link
            </p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="you@spcc.edu.ph"
                disabled={loading}
              />
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

            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !recaptchaToken}
              className={styles.button}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>

            <div className={styles.switchPage}>
              <Link to="/login">
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;