import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiEye, HiEyeSlash, HiHome } from 'react-icons/hi2';
import ReCAPTCHA from 'react-google-recaptcha';
import styles from '../styles/register.module.scss';

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const recaptchaRef = useRef(null);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: ''
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [successEmail, setSuccessEmail] = useState('');
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [nameValidationLoading, setNameValidationLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSoftWarning, setIsSoftWarning] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [banTimeRemaining, setBanTimeRemaining] = useState(null);
  const [banUntil, setBanUntil] = useState(null);

  // ID verification states
  const [idFrontImage, setIdFrontImage] = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState(null);
  const [idBackImage, setIdBackImage] = useState(null);
  const [idBackPreview, setIdBackPreview] = useState(null);
  const [idVerificationResult, setIdVerificationResult] = useState(null);
  const [idVerifying, setIdVerifying] = useState(false);

  // Camera states
  const [activeCameraFor, setActiveCameraFor] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);

  useEffect(() => {
    const updateTimer = () => {
      if (banUntil) {
        const now = Date.now() / 1000;
        const remaining = Math.max(0, Math.floor(banUntil - now));
        if (remaining > 0) {
          setBanTimeRemaining(remaining);
        } else {
          setIsBanned(false);
          setBanTimeRemaining(null);
          setBanUntil(null);
          setError('');
          checkBanStatus();
        }
      }
    };
    if (banUntil) {
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banUntil]);

  useEffect(() => {
    checkBanStatus();
    const interval = setInterval(checkBanStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, activeCameraFor]);

  const checkBanStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/check-ban/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.banned) {
        setIsBanned(true);
        setBanUntil(result.banUntil);
        setBanTimeRemaining(result.timeRemaining);
        const minutes = Math.floor(result.timeRemaining / 60);
        const seconds = result.timeRemaining % 60;
        setError(`Too many inappropriate registration attempts. Please wait ${minutes}m ${seconds}s before trying again.`);
      } else {
        setIsBanned(false);
        setBanTimeRemaining(null);
        setBanUntil(null);
        if (error && error.includes('inappropriate registration attempts')) setError('');
      }
    } catch (err) {
      console.error('Error checking ban status:', err);
    }
  };

  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasMaxLength: true,
    hasUpperCase: false,
    hasNumber: false,
    isValid: false
  });

  const capitalizeWords = (str) =>
    str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

  const checkPasswordStrength = (password) => {
    const s = {
      hasMinLength: password.length >= 12,
      hasMaxLength: password.length <= 128,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
    s.isValid = s.hasMinLength && s.hasMaxLength && s.hasUpperCase && s.hasNumber;
    return s;
  };

  // ── Image helpers ────────────────────────────────────────────

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Compress image to reduce payload size sent to backend
  const compressImage = (dataUrl, maxWidth = 900, quality = 0.82) =>
    new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const scale  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });

  const handleImageUpload = async (e, side) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image size must be less than 5MB'); return; }
    const dataUrl = await readFileAsDataURL(file);
    if (side === 'front') { setIdFrontImage(dataUrl); setIdFrontPreview(dataUrl); }
    else { setIdBackImage(dataUrl); setIdBackPreview(dataUrl); }
    setIdVerificationResult(null);
    setError('');
  };

  const removeImage = (side) => {
    if (side === 'front') { setIdFrontImage(null); setIdFrontPreview(null); }
    else { setIdBackImage(null); setIdBackPreview(null); }
    setIdVerificationResult(null);
  };

  // ── Camera helpers ───────────────────────────────────────────

  const startCamera = async (side) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStream(stream);
      setActiveCameraFor(side);
    } catch (err) {
      setError('Unable to access camera. Please check permissions or upload a photo instead.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) { cameraStream.getTracks().forEach(t => t.stop()); setCameraStream(null); }
    setActiveCameraFor(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    if (activeCameraFor === 'front') { setIdFrontImage(imageData); setIdFrontPreview(imageData); }
    else { setIdBackImage(imageData); setIdBackPreview(imageData); }
    setIdVerificationResult(null);
    stopCamera();
  };

  // ── ID Verification ──────────────────────────────────────────

  const verifyIDWithAI = async () => {
    if (!idFrontImage) { setError('Please upload or capture the FRONT of your Student ID'); return false; }
    if (!idBackImage)  { setError('Please upload or capture the BACK of your Student ID');  return false; }

    setIdVerifying(true);
    try {
      // Compress both images before sending — reduces payload ~85-95%
      const [compressedFront, compressedBack] = await Promise.all([
        compressImage(idFrontImage),
        compressImage(idBackImage),
      ]);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/verify-id/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_front_image: compressedFront,
          id_back_image:  compressedBack,
          first_name: formData.first_name,
          last_name:  formData.last_name,
        })
      });

      const result = await response.json();

      // Early rejection cases — don't set idVerificationResult to avoid duplicate error display
      if (result.same_side_detected) {
        setError('Both images appear to be the same side of your ID. Please upload the FRONT and BACK separately.');
        setIdFrontImage(null); setIdFrontPreview(null);
        setIdBackImage(null);  setIdBackPreview(null);
        return false;
      }

      if (result.different_ids_detected) {
        setError('The front and back appear to be from different ID cards. Please upload both sides of your own single ID card.');
        setIdFrontImage(null); setIdFrontPreview(null);
        setIdBackImage(null);  setIdBackPreview(null);
        return false;
      }

      if (result.expired_id_detected) {
        setError(result.message || `Your ID has expired. Please use your current ${result.current_school_year || ''} ID.`);
        setIdFrontImage(null); setIdFrontPreview(null);
        setIdBackImage(null);  setIdBackPreview(null);
        return false;
      }

      if (response.status === 503) {
        setError('The verification service is temporarily busy. Please wait a few seconds and try again.');
        return false;
      }

      // Only set verification result for the final AI verdict (shows badge under images)
      setIdVerificationResult(result);

      if (!result.is_valid_id) {
        setError(result.message || 'ID verification failed. Please ensure you uploaded a valid SPCC Student ID.');
        return false;
      }

      if (!result.matches_input && !result.name_matches) {
        setError(
          result.message ||
          `The name on your ID doesn't match the name you entered. Please check your entries.`
        );
        return false;
      }

      if (result.confidence === 'low' || result.image_quality === 'poor') {
        setError('ID image quality is too low. Please upload clearer photos or retake the pictures.');
        return false;
      }

      return true;

    } catch (err) {
      console.error('ID verification error:', err);
      setError('ID verification failed. Please try again.');
      return false;
    } finally {
      setIdVerifying(false);
    }
  };

  // ── Name Validation ──────────────────────────────────────────

  // Returns: 'ok' | 'warning' | 'blocked' | 'banned' | 'error'
  const validateNameWithAI = async () => {
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()) return 'ok';
    setNameValidationLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ai/validate-name/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email
        })
      });
      const result = await response.json();
      if (response.status === 429 || result.banned) {
        setIsBanned(true); setBanUntil(result.banUntil); setBanTimeRemaining(result.timeRemaining || 300);
        setError(result.message); return 'banned';
      }
      if (result.blocked) {
        setIsBlocked(true); setIsSoftWarning(false);
        setRemainingAttempts(result.remainingAttempts);
        setAiMessage(result.message); setShowNameWarning(true); return 'blocked';
      }
      if (result.softWarning || (result.hasIssue && result.severity === 'warning')) {
        setIsBlocked(false); setIsSoftWarning(true);
        setAiMessage(result.message); setShowNameWarning(true); return 'warning';
      }
      return 'ok';
    } catch (err) {
      console.error('AI validation error:', err);
      return 'ok'; // fail open — don't block registration on AI error
    } finally {
      setNameValidationLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'first_name' || name === 'last_name')
      setFormData({ ...formData, [name]: capitalizeWords(value) });
    else if (name === 'password') {
      setFormData({ ...formData, [name]: value });
      setPasswordStrength(checkPasswordStrength(value));
    } else {
      setFormData({ ...formData, [name]: value });
    }
    if (error) setError('');
  };

  const handleRecaptchaChange = (token) => {
    setRecaptchaToken(token);
    if (error && error.toLowerCase().includes('recaptcha')) setError('');
  };

  const handleInitialSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    if (isBanned && banTimeRemaining !== null) {
      const m = Math.floor(banTimeRemaining / 60), s = banTimeRemaining % 60;
      setError(`You are temporarily banned. Please wait ${m}m ${s}s`); return;
    }
    if (!passwordStrength.isValid)            { setError('Please ensure your password meets all requirements.'); return; }
    if (formData.password !== formData.password2) { setError('Passwords do not match.'); return; }
    if (!acceptedTerms)                        { setError('You must accept the Terms and Conditions to continue.'); return; }
    if (!recaptchaToken)                       { setError('Please complete the reCAPTCHA verification'); return; }

    // Step 1: Validate name FIRST — catches fake/celebrity names before any image upload
    const nameResult = await validateNameWithAI();

    // Stop here if banned, blocked, or warning shown — user must respond to modal first
    // ID verification will be triggered by handleProceedAnyway after user confirms
    if (nameResult !== 'ok') return;

    // Step 2: Name is clean — now verify the ID
    const idVerified = await verifyIDWithAI();
    if (!idVerified) return;

    // Step 3: Both passed — show confirmation modal
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    setLoading(true); setShowConfirmation(false); setShowNameWarning(false);
    try {
      const res = await register(formData, recaptchaToken);
      if (res.success) {
        setSuccessEmail(formData.email); setRegistrationSuccess(true);
        setFormData({ email: '', password: '', password2: '', first_name: '', last_name: '' });
        setPasswordStrength({ hasMinLength: false, hasMaxLength: true, hasUpperCase: false, hasNumber: false, isValid: false });
        setAcceptedTerms(false); setRecaptchaToken(null);
        setIdFrontImage(null); setIdFrontPreview(null);
        setIdBackImage(null);  setIdBackPreview(null);
        setIdVerificationResult(null);
        if (recaptchaRef.current) recaptchaRef.current.reset();
      } else {
        setError(res.error);
        if (recaptchaRef.current) { recaptchaRef.current.reset(); setRecaptchaToken(null); }
      }
    } catch {
      setError('Registration failed. Please try again.');
      if (recaptchaRef.current) { recaptchaRef.current.reset(); setRecaptchaToken(null); }
    } finally { setLoading(false); }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false); setShowNameWarning(false);
    setIsBlocked(false); setIsSoftWarning(false);
  };

  const handleProceedAnyway = async () => {
    if (isBlocked) { setShowNameWarning(false); setIsBlocked(false); return; }
    // User acknowledged the name warning — now run ID verification
    setShowNameWarning(false); setIsSoftWarning(false);
    const idVerified = await verifyIDWithAI();
    if (!idVerified) return;
    setShowConfirmation(true);
  };

  // ── ID Upload Panel ──────────────────────────────────────────

  const IDSidePanel = ({ side, label, preview, disabled }) => (
    <div className={styles.idSidePanel}>
      <p className={styles.idSideLabel}>{label}</p>

      {!preview && activeCameraFor !== side && (
        <div className={styles.idUploadBox}>
          <label htmlFor={`id_${side}`} className={styles.uploadInnerLabel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={styles.uploadSvgIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Upload photo</span>
            <input
              id={`id_${side}`} type="file" accept="image/*"
              onChange={(e) => handleImageUpload(e, side)}
              disabled={disabled} style={{ display: 'none' }}
            />
          </label>
          <div className={styles.orDivider}><span>OR</span></div>
          <button type="button" onClick={() => startCamera(side)} className={styles.cameraButton} disabled={disabled}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Camera</span>
          </button>
        </div>
      )}

      {activeCameraFor === side && (
        <div className={styles.cameraContainer}>
          <video ref={videoRef} autoPlay playsInline className={styles.cameraVideo} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className={styles.cameraControls}>
            <button type="button" onClick={capturePhoto} className={styles.captureButton}>
              <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
              <span>Capture</span>
            </button>
            <button type="button" onClick={stopCamera} className={styles.cancelCameraButton}>Cancel</button>
          </div>
        </div>
      )}

      {preview && activeCameraFor !== side && (
        <div className={styles.imagePreviewContainer}>
          <img src={preview} alt={`${label} Preview`} className={styles.idPreview} />
          <button
            type="button" onClick={() => removeImage(side)}
            className={styles.removeImageX} disabled={disabled}
            aria-label={`Remove ${label}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {idVerificationResult && (
            <div className={`${styles.verificationBadge} ${idVerificationResult.is_valid_id ? styles.verified : styles.failed}`}>
              {idVerificationResult.is_valid_id ? '✓ Verified' : '✗ Failed'}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Success screen ───────────────────────────────────────────

  if (registrationSuccess) {
    return (
      <div className={styles.page}>
        <div className={styles.successContainer}>
          <div className={styles.successBox}>
            <button type="button" onClick={() => navigate('/introduction')} className={styles.homeButtonSuccess}>
              <HiHome /><span>Home</span>
            </button>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={styles.successContent}>
              <h3 className={styles.successTitle}>Registration successful!</h3>
              <p className={styles.successText}>Check your email to verify your account.</p>
              <p className={styles.successText}>We've sent a verification link to <strong>{successEmail}</strong></p>
            </div>
            <div className={styles.successActions}>
              <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className={styles.gmailButton}>Open Gmail</a>
              <button type="button" onClick={() => navigate('/login')} className={styles.backToLoginButton}>Back to Login</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────

  return (
    <>
      {(loading || nameValidationLoading || idVerifying) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, gap: '1.5rem'
        }}>
          <div style={{
            width: '60px', height: '60px',
            border: '4px solid rgba(255,255,255,0.2)',
            borderTop: '4px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500', margin: 0, textAlign: 'center' }}>
            {idVerifying
              ? 'Verifying your ID...'
              : nameValidationLoading
                ? 'Validating your information...'
                : 'Creating your account...'}
          </p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <div className={styles.page}>
        <div className={styles.container}>
          <button type="button" onClick={() => navigate('/')} className={styles.homeButton} disabled={loading || isBanned}>
            <HiHome /><span>Home</span>
          </button>

          <h1 className={styles.title}>Sign Up</h1>

          <form onSubmit={handleInitialSubmit}>

            {/* Name row */}
            <div className={styles.nameRow}>
              <div className={styles.formGroup}>
                <label htmlFor="first_name">First Name</label>
                <input id="first_name" name="first_name" type="text" value={formData.first_name}
                  onChange={handleChange} placeholder="First name"
                  required disabled={loading || isBanned} autoComplete="off" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="last_name">Last Name</label>
                <input id="last_name" name="last_name" type="text" value={formData.last_name}
                  onChange={handleChange} placeholder="Last name"
                  required disabled={loading || isBanned} autoComplete="off" />
              </div>
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input id="email" name="email" type="email" value={formData.email}
                onChange={handleChange} placeholder="Enter your email address"
                required disabled={loading || isBanned} autoComplete="off" />
            </div>

            {/* ID Upload */}
            <div className={styles.formGroup}>
              <label>
                Student ID — Front &amp; Back <span className={styles.required}>*</span>
              </label>
              <p className={styles.idHint}>
                Upload or capture both sides of your SPCC Student ID so we can verify your name and school year.
              </p>
              <div className={styles.idTwoPanel}>
                <IDSidePanel side="front" label="Front" preview={idFrontPreview} disabled={loading || isBanned || idVerifying} />
                <IDSidePanel side="back"  label="Back"  preview={idBackPreview}  disabled={loading || isBanned || idVerifying} />
              </div>

              {idVerificationResult && !idVerificationResult.is_valid_id && (
                <div className={styles.verificationError}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{idVerificationResult.message}</span>
                </div>
              )}

              {idVerificationResult && idVerificationResult.is_valid_id && (
                <div className={styles.verificationSuccess}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    ID verified ✓
                    {idVerificationResult.extracted_year   && ` — ${idVerificationResult.extracted_year}`}
                    {idVerificationResult.extracted_strand && ` · ${idVerificationResult.extracted_strand}`}
                  </span>
                </div>
              )}
            </div>

            {/* Password */}
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordInput}>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  value={formData.password} onChange={handleChange}
                  placeholder="Enter your password"
                  required disabled={loading || isBanned} autoComplete="off" maxLength={128} />
                <button type="button" className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)} disabled={loading || isBanned}>
                  {showPassword ? <HiEyeSlash /> : <HiEye />}
                </button>
              </div>
              {formData.password && (
                <div className={styles.passwordStrength}>
                  {[
                    ['hasMinLength', 'At least 12 characters'],
                    ['hasMaxLength', 'Maximum 128 characters'],
                    ['hasUpperCase', 'At least one uppercase letter'],
                    ['hasNumber',   'At least one number'],
                  ].map(([key, text]) => (
                    <div key={key} className={`${styles.requirement} ${passwordStrength[key] ? styles.met : ''}`}>
                      <span className={styles.checkmark}>{passwordStrength[key] ? '✓' : '○'}</span>{text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className={styles.formGroup}>
              <label htmlFor="password2">Confirm Password</label>
              <div className={styles.passwordInput}>
                <input id="password2" name="password2" type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.password2} onChange={handleChange}
                  placeholder="Confirm your password"
                  required disabled={loading || isBanned} autoComplete="new-password" maxLength={128} />
                <button type="button" className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading || isBanned}>
                  {showConfirmPassword ? <HiEyeSlash /> : <HiEye />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <div className={styles.termsGroup}>
              <label className={styles.termsCheckbox}>
                <input type="checkbox" checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)} disabled={loading || isBanned} />
                <span>I accept the{' '}
                  <button type="button" onClick={() => setShowTermsModal(true)}
                    className={styles.termsLink} disabled={loading || isBanned}>
                    Terms and Conditions
                  </button>
                </span>
              </label>
            </div>

            {/* reCAPTCHA */}
            <div className={styles.recaptchaContainer}>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleRecaptchaChange}
                onExpired={() => setRecaptchaToken(null)}
                onErrored={() => { setRecaptchaToken(null); setError('reCAPTCHA error. Please try again.'); }}
                theme="light"
              />
            </div>

            <button type="submit" className={styles.button}
              disabled={loading || !passwordStrength.isValid || !acceptedTerms || !recaptchaToken || isBanned || !idFrontImage || !idBackImage}>
              {loading
                ? 'Creating Account...'
                : isBanned && banTimeRemaining !== null
                  ? `Banned — ${Math.floor(banTimeRemaining / 60)}m ${banTimeRemaining % 60}s`
                  : 'Get Started'}
            </button>
          </form>

          {message && <p className={styles.message}>{message}</p>}
          {error   && <p className={styles.error}>{error}</p>}

          <div className={styles.switchPage}>
            Already have an account?
            <button type="button" onClick={() => navigate('/login')} disabled={loading || isBanned}>Sign In</button>
          </div>
        </div>

        {/* ── Terms Modal ── */}
        {showTermsModal && (
          <div className={styles.modalOverlay} onClick={() => setShowTermsModal(false)}>
            <div className={styles.termsModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.termsModalHeader}>
                <h2>Terms of Service</h2>
                <button onClick={() => setShowTermsModal(false)} className={styles.termsCloseButton}>✕</button>
              </div>
              <div className={styles.termsModalBody}>
                <p className={styles.effectiveDate}><strong>Effective Date:</strong> October 12, 2025</p>
                <section style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}><strong>System Name:</strong> Systems Plus Computer College Online Reservation System</p>
                  <p style={{ margin: 0 }}><strong>Institution:</strong> Systems Plus Computer College – Caloocan Campus</p>
                </section>
                <h3>1. Acceptance of Terms</h3>
                <p>By accessing or using the SPCC Online Reservation System, you agree to comply with these Terms of Service.</p>
                <h3>2. Purpose of the System</h3>
                <p>The SPCC Online Reservation System is designed to help students under the ICT strand reserve school supplies and services provided by the Business Center.</p>
                <h3>3. Eligibility</h3>
                <p>Only verified students and staffs of Systems Plus Computer College (SPCC) - Caloocan Campus are allowed to use their official SPCC email address (@spcc.edu.ph).</p>
                <h3>4. Account Registration and Authentication</h3>
                <p>Users are required to register with their SPCC email. After successful registration, users must complete email verification before accessing any system feature. The verification link expires after 24 hours.</p>
                <h3>5. User Responsibilities</h3>
                <ul>
                  <li>Provide accurate and truthful information during registration and reservation.</li>
                  <li>Do not create multiple or fake accounts.</li>
                  <li>Do not attempt to access, modify, or disrupt the system's database or security mechanisms.</li>
                  <li>Respect other users and school personnel interacting with the system.</li>
                  <li>Report any bugs, errors, or suspicious activity to the system administrators immediately.</li>
                </ul>
                <h3>6. Data Privacy and Security</h3>
                <p>The System collects minimal information, including your name, SPCC email, and reservation details. Your data is encrypted and secured. The System will never share, sell, or disclose user information to third parties.</p>
                <h3>7. Email Verification and Communication</h3>
                <p>You may receive emails related to verification, reservation status, or updates. By registering, you consent to receive these necessary emails.</p>
                <h3>8. Reservation Guidelines</h3>
                <p>Each reservation must be made through the official SPCC Online Reservation System. Unclaimed reservations may be automatically canceled. Abuse of the system can result in account suspension or permanent ban.</p>
                <h3>9. System Availability and Maintenance</h3>
                <p>The System may undergo periodic updates or maintenance without prior notice.</p>
                <h3>10. Limitation of Liability</h3>
                <p>SPCC and its developers are not responsible for any losses, data errors, or interruptions caused by unforeseen technical issues or misuse of the system.</p>
                <h3>11. Modification of Terms</h3>
                <p>SPCC reserves the right to update or modify these Terms at any time. Continued use means you accept the revised Terms.</p>
                <h3>12. Contact Information</h3>
                <p><strong>Business Center – SPCC Caloocan Campus</strong><br />Systems Plus Computer College, Caloocan City, Philippines</p>
                <h3>13. Acknowledgment</h3>
                <p>By using this System, you confirm that you have read, understood, and agreed to the Terms stated above.</p>
              </div>
              <div className={styles.termsModalFooter}>
                <button onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }} className={styles.acceptTermsButton}>Accept &amp; Continue</button>
                <button onClick={() => setShowTermsModal(false)} className={styles.closeTermsButton}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Name Warning Modal ── */}
        {showNameWarning && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalIcon} style={{
                  background: isBlocked
                    ? 'linear-gradient(135deg,#dc2626 0%,#b91c1c 100%)'
                    : 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)'
                }}>
                  {isBlocked ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <h2 className={styles.modalTitle}>{isBlocked ? 'Registration Blocked' : 'Please Verify Your Name'}</h2>
                <p className={styles.modalSubtitle}>
                  {isBlocked
                    ? `${remainingAttempts} attempt(s) remaining before temporary ban`
                    : 'We noticed something unusual about your registration entry.'}
                </p>
              </div>
              <div className={styles.confirmationNote} style={{
                borderColor: isBlocked ? '#fecaca' : '#fed7aa',
                background: isBlocked ? '#fef2f2' : '#fffbeb'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  style={{ stroke: isBlocked ? '#dc2626' : '#f59e0b' }}>
                  {isBlocked
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                </svg>
                <p style={{ color: isBlocked ? '#991b1b' : '#92400e' }}>{aiMessage}</p>
              </div>
              {!isBlocked && (
                <div className={styles.confirmationDetails} style={{ background: '#f9fafb', padding: '1rem 2rem' }}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Name Entered:</span>
                    <span className={styles.detailValue}>{formData.first_name} {formData.last_name}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email Address:</span>
                    <span className={styles.detailValue}>{formData.email}</span>
                  </div>
                </div>
              )}
              <div className={styles.modalActions}>
                <button type="button" onClick={handleCancelConfirmation} className={styles.cancelButton} disabled={loading}>
                  {isBlocked ? 'Close' : 'Go Back & Edit'}
                </button>
                {!isBlocked && (
                  <button type="button" onClick={handleProceedAnyway} className={styles.confirmButton} disabled={loading}>
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Confirm Registration Modal ── */}
        {showConfirmation && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <div className={styles.modalIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className={styles.modalTitle}>Confirm Your Registration</h2>
                <p className={styles.modalSubtitle}>Please review your information before proceeding</p>
              </div>
              <div className={styles.confirmationDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Full Name:</span>
                  <span className={styles.detailValue}>{formData.first_name} {formData.last_name}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Email Address:</span>
                  <span className={styles.detailValue}>{formData.email}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Password:</span>
                  <span className={styles.detailValue}>••••••••••••</span>
                </div>
              </div>
              <div className={styles.confirmationNote}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>A verification email will be sent to <strong>{formData.email}</strong>. Please check your inbox to activate your account.</p>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={handleCancelConfirmation} className={styles.cancelButton} disabled={loading}>
                  Go Back
                </button>
                <button type="button" onClick={handleConfirmedSubmit} className={styles.confirmButton} disabled={loading}>
                  {loading ? 'Creating Account...' : 'Confirm & Register'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Register;