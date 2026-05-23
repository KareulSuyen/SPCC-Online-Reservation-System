import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  FaTimes, 
  FaUser, 
  FaEnvelope, 
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaCamera,
  FaTrash,
  FaSpinner,
  FaCheck,
  FaUndo
} from 'react-icons/fa';
import styles from '../styles/profile.module.scss';

const Profile = ({ isOpen, onClose }) => {
  const { user, logout, uploadProfilePicture, removeProfilePicture } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [initialScale, setInitialScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  const handleLogout = () => {
    logout();
    onClose();
  };

  const getProfilePicture = () => {
    if (imageError) {
      return null;
    }
    
    if (user?.profile_picture_url) {
      return user.profile_picture_url;
    }
    
    return null;
  };

  const handleImageError = () => {
    console.error('Image failed to load');
    setImageError(true);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const circleSize = 280;
        const scale = Math.max(circleSize / img.width, circleSize / img.height) * 1.2; 
        setImageScale(scale);
        setImagePosition({ x: 0, y: 0 });
      };
      img.src = event.target.result;
      setSelectedImage(event.target.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - imagePosition.x,
      y: touch.clientY - imagePosition.y
    });
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setImagePosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta) => {
    setImageScale(prev => {
      const newScale = prev + delta;
      return Math.max(0.5, Math.min(3, newScale));
    });
  };

  const cropImageToCircle = (imageSrc) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const outputSize = 400; 
        canvas.width = outputSize;
        canvas.height = outputSize;
        
        const ctx = canvas.getContext('2d');
        
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        const previewSize = 280;
        const scaleFactor = outputSize / previewSize;
        
        const scaledWidth = img.width * imageScale * scaleFactor;
        const scaledHeight = img.height * imageScale * scaleFactor;
        
        const centerX = outputSize / 2;
        const centerY = outputSize / 2;
        
        const offsetX = centerX - (scaledWidth / 2) + (imagePosition.x * scaleFactor);
        const offsetY = centerY - (scaledHeight / 2) + (imagePosition.y * scaleFactor);
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png', 0.95);
      };
      img.src = imageSrc;
    });
  };

  const handleCropConfirm = async () => {
    if (!selectedImage) return;

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const croppedBlob = await cropImageToCircle(selectedImage);
      const croppedFile = new File([croppedBlob], 'profile.png', { type: 'image/png' });
      
      const result = await uploadProfilePicture(croppedFile);
      
      if (result.success) {
        setUploadSuccess('Profile picture updated successfully!');
        setImageError(false);
        setShowCropper(false);
        setSelectedImage(null);
        setTimeout(() => setUploadSuccess(''), 3000);
      } else {
        setUploadError(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('An error occurred while uploading');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setSelectedImage(null);
    setImagePosition({ x: 0, y: 0 });
    setImageScale(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) {
      return;
    }

    setUploadError('');
    setUploadSuccess('');
    setUploading(true);

    try {
      const result = await removeProfilePicture();
      
      if (result.success) {
        setUploadSuccess('Profile picture removed successfully!');
        setImageError(false);
        setTimeout(() => setUploadSuccess(''), 3000);
      } else {
        setUploadError(result.error || 'Failed to remove image');
      }
    } catch (error) {
      console.error('Remove error:', error);
      setUploadError('An error occurred while removing image');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const profilePicture = getProfilePicture();
  const hasCustomPicture = user?.profile_picture || user?.profile_picture_url;

  return (
    <>
      <div 
        className={styles.overlay}
        onClick={onClose}
      />

      <div className={styles.profilePanel}>
        <div className={styles.profileHeader}>
          <h2 className={styles.profileTitle}>Profile</h2>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close profile"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className={styles.profileContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              <div 
                className={styles.avatar}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {profilePicture && !imageError ? (
                  <img 
                    src={profilePicture} 
                    alt={`${user?.first_name} ${user?.last_name}`}
                    onError={handleImageError}
                    className={styles.profileImage}
                  />
                ) : (
                  <FaUser size={40} />
                )}
                
                <div className={`${styles.avatarOverlay} ${isHovering ? styles.visible : ''}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  
                  <button
                    className={styles.overlayButton}
                    onClick={handleFileSelect}
                    disabled={uploading}
                    title={hasCustomPicture ? "Change picture" : "Upload picture"}
                  >
                    {uploading ? <FaSpinner className={styles.spinning} size={24} /> : <FaCamera size={24} />}
                  </button>
                  
                  {hasCustomPicture && !imageError && !uploading && (
                    <button
                      className={`${styles.overlayButton} ${styles.deleteButton}`}
                      onClick={handleRemovePicture}
                      title="Remove picture"
                    >
                      <FaTrash size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <h3 className={styles.userName}>
              {user?.first_name} {user?.last_name}
            </h3>

            {uploadError && (
              <div className={styles.uploadError}>
                {uploadError}
              </div>
            )}
            
            {uploadSuccess && (
              <div className={styles.uploadSuccess}>
                {uploadSuccess}
              </div>
            )}
          </div>

          <div className={styles.infoSection}>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <FaUser />
              </div>
              <div className={styles.infoContent}>
                <label className={styles.infoLabel}>Full Name</label>
                <p className={styles.infoValue}>
                  {user?.first_name} {user?.last_name}
                </p>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <FaEnvelope />
              </div>
              <div className={styles.infoContent}>
                <label className={styles.infoLabel}>Email</label>
                <p className={styles.infoValue}>{user?.email}</p>
              </div>
            </div>
          </div>

          <div className={styles.themeSection}>
            <div className={styles.themeSectionHeader}>
              <h4 className={styles.sectionTitle}>Appearance</h4>
            </div>
            <div className={styles.themeToggle}>
              <div className={styles.themeInfo}>
                <div className={styles.themeIcon}>
                  {isDark ? <FaMoon /> : <FaSun />}
                </div>
                <div>
                  <p className={styles.themeLabel}>Theme Mode</p>
                  <p className={styles.themeValue}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </p>
                </div>
              </div>
              <button 
                className={styles.toggleButton}
                onClick={toggleTheme}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              >
                <div className={`${styles.toggleTrack} ${isDark ? styles.active : ''}`}>
                  <div className={styles.toggleThumb} />
                </div>
              </button>
            </div>
          </div>

          <div className={styles.actionsSection}>
            <button 
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {showCropper && (
        <div className={styles.cropperModal}>
          <div className={styles.cropperContent}>
            <h3 className={styles.cropperTitle}>Adjust Your Photo</h3>
            <p className={styles.cropperSubtitle}>Drag to reposition • Scroll to zoom</p>
            
            <div className={styles.cropperPreview}>
              <div 
                className={styles.cropperCircle}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {selectedImage && (
                  <img 
                    ref={imageRef}
                    src={selectedImage} 
                    alt="Preview" 
                    className={styles.cropperImage}
                    style={{
                      transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
                      cursor: isDragging ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    draggable={false}
                  />
                )}
              </div>
            </div>
            
            <div className={styles.zoomControls}>
              <button
                className={styles.zoomButton}
                onClick={() => handleZoom(-0.1)}
                disabled={uploading || imageScale <= 0.5}
                title="Zoom out"
              >
                −
              </button>
              <span className={styles.zoomLabel}>{Math.round(imageScale * 100)}%</span>
              <button
                className={styles.zoomButton}
                onClick={() => handleZoom(0.1)}
                disabled={uploading || imageScale >= 3}
                title="Zoom in"
              >
                +
              </button>
            </div>
            
            <div className={styles.cropperActions}>
              <button
                className={`${styles.cropperButton} ${styles.cancelButton}`}
                onClick={handleCropCancel}
                disabled={uploading}
              >
                <FaUndo />
                <span>Cancel</span>
              </button>
              <button
                className={`${styles.cropperButton} ${styles.confirmButton}`}
                onClick={handleCropConfirm}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <FaSpinner className={styles.spinning} />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FaCheck />
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
