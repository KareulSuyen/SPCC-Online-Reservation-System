import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';
import styles from '../styles/resetPass.module.scss';

export const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [formData, setFormData] = useState({
    password: '',
    password2: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasMaxLength: true,
    hasUpperCase: false,
    hasNumber: false,
    isValid: false
  });

  const checkPasswordStrength = (password) => {
    const strength = {
      hasMinLength: password.length >= 12,
      hasMaxLength: password.length <= 128,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
    strength.isValid = strength.hasMinLength && strength.hasMaxLength && strength.hasUpperCase && strength.hasNumber;
    return strength;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value,
    });
    
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
    
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!passwordStrength.isValid) {
      setError('Please ensure your password meets all requirements');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await resetPassword(token, formData.password, formData.password2);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successContainer}>
          <div className={styles.successBox}>
            <div className={styles.successContent}>
              <h3 className={styles.successTitle}>
                Password reset successful!
              </h3>
              <p className={styles.successText}>
                Your password has been reset successfully.
              </p>
              <p className={styles.successText}>
                Redirecting to login...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Set new password</h2>
          <p className={styles.subtitle}>
            Enter your new password below
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            <div className={styles.formGroup}>
              <label htmlFor="password">New Password</label>
              <div className={styles.passwordInput}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 12 characters"
                  disabled={loading}
                  maxLength={128}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <HiEyeSlash /> : <HiEye />}
                </button>
              </div>
              {formData.password && (
                <div className={styles.passwordStrength}>
                  <div className={`${styles.requirement} ${passwordStrength.hasMinLength ? styles.met : ''}`}>
                    <span className={styles.checkmark}>{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                    At least 12 characters
                  </div>
                  <div className={`${styles.requirement} ${passwordStrength.hasMaxLength ? styles.met : ''}`}>
                    <span className={styles.checkmark}>{passwordStrength.hasMaxLength ? '✓' : '○'}</span>
                    Maximum 128 characters
                  </div>
                  <div className={`${styles.requirement} ${passwordStrength.hasUpperCase ? styles.met : ''}`}>
                    <span className={styles.checkmark}>{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                    At least one uppercase letter
                  </div>
                  <div className={`${styles.requirement} ${passwordStrength.hasNumber ? styles.met : ''}`}>
                    <span className={styles.checkmark}>{passwordStrength.hasNumber ? '✓' : '○'}</span>
                    At least one number
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password2">Confirm New Password</label>
              <div className={styles.passwordInput}>
                <input
                  id="password2"
                  name="password2"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password2}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  disabled={loading}
                  maxLength={128}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <HiEyeSlash /> : <HiEye />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !passwordStrength.isValid}
            className={styles.button}
          >
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>

          <div className={styles.switchPage}>
            <Link to="/login">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;