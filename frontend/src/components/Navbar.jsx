import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { RxHamburgerMenu } from "react-icons/rx";
import { FaUserCircle } from 'react-icons/fa';
import { MdShoppingCart, MdExpandMore, MdClose, MdEmail, MdPhone, MdAccountCircle, MdDownload, MdCheckCircle } from "react-icons/md";
import { MdOutlineQuestionAnswer, MdOutlineSupportAgent } from "react-icons/md";
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { RiContactsBook2Line } from "react-icons/ri";
import spcclogo from '../../public/images/spcc-logo.png';
import styles from '../styles/navbar.module.scss';

const Navbar = ({ onProfileClick, toggleSidebar }) => {
  const { cartItemsCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallSuccess, setShowInstallSuccess] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const checkIfInstalled = () => {
      const installed = window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;
      setIsInstalled(installed);
    };

    checkIfInstalled();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallSuccess(true);
      setShowInstallModal(false);
      setTimeout(() => setShowInstallSuccess(false), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDownloadClick = () => {
    setShowInstallModal(true);
    setShowResourcesDropdown(false);
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
              
        if (outcome === 'accepted') {
          setShowInstallSuccess(true);
          setShowInstallModal(false);
          setTimeout(() => setShowInstallSuccess(false), 3000);
        }
        
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error showing install prompt:', error);
      }
    }
  };

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
    setShowResourcesDropdown(false);
    setShowHelpDropdown(false);
  };

  const handleProfileOption = (callback) => {
    setShowProfileDropdown(false);
    callback();
  };

  const faqs = [
    {
      category: "Getting Started",
      icon: <MdAccountCircle size={24} />,
      questions: [
        {
          q: "How do I create an account?",
          a: "Click on 'Get Started' or 'Register' button on the homepage. Fill in your student information, email, and create a secure password. You'll receive a confirmation email to activate your account."
        },
        {
          q: "What information do I need to register?",
          a: "You'll need your full name and email address. Make sure to use your official school email for verification purposes."
        },
        {
          q: "I forgot my password. What should I do?",
          a: "Click on 'Forgot Password' on the login page. Enter your registered email address, and we'll send you a password reset link. Follow the instructions in the email to create a new password."
        }
      ]
    },
    {
      category: "Making Reservations",
      icon: <MdShoppingCart size={24} />,
      questions: [
        {
          q: "How do I reserve school supplies?",
          a: "Log in to your account, browse the available items, add them to your cart, review your order, and click 'Reserve'. You'll receive a confirmation with your reservation number and pickup details."
        },
        {
          q: "Can I modify my reservation after submitting?",
          a: "Yes, you can modify your reservation before payment is processed. Go to 'My Orders', select the reservation, and click 'Modify'. Changes after payment require contacting Student Services."
        },
        {
          q: "How long is my reservation valid?",
          a: "Reservations are valid for 7 days from the date of confirmation. Please complete payment and pickup within this timeframe, or your reservation will be automatically cancelled."
        },
        {
          q: "Is there a minimum or maximum order quantity?",
          a: "There's no minimum order. Maximum quantities depend on item availability and stock levels. If you need bulk orders, please contact us directly."
        }
      ]
    }
  ];

  const contactInfo = [
    {
      department: "General Inquiries",
      email: "cares@spcc.edu.ph",
      phone: "8367-7501"
    },
    {
      department: "Marketing",
      email: "marketing@spcc.edu.ph",
      phone: "0945-753-9670"
    },
    {
      department: "Technical Support",
      email: "academics@spcc.edu.ph",
      phone: "8330-2952"
    },
    {
      department: "Accounting Office",
      email: "accountingoffice@spcc.edu.ph",
      phone: "8367-7502"
    },
  ];


  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleEmailClick = (e, email) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedEmail(email);
    setShowEmailWarning(true);
  };

  const confirmEmailRedirect = () => {
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedEmail}`;
    window.open(gmailComposeUrl, '_blank');
    setShowEmailWarning(false);
    setSelectedEmail('');
  };

  const cancelEmailRedirect = () => {
    setShowEmailWarning(false);
    setSelectedEmail('');
  };

  const handleTermsClick = (e) => {
    e.preventDefault();
    setShowResourcesDropdown(false);
    navigate('/terms', { state: { from: location.pathname } });
  };
  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.navbarContainer}>
          <div className={styles.navbarLeft}>
            <button 
              className={styles.menuButton}
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <RxHamburgerMenu size={33} />
            </button>
            
            <Link to="/dashboard" className={styles.logo}>
              <img src={spcclogo} alt="SPCC Logo" />
              <span className={styles.logoText}>SPCC-ORS</span>
            </Link>
          </div>

          <div className={styles.navbarRight}>
            <div className={styles.dropdownWrapper}>
              <button 
                className={styles.dropdownButton}
                onClick={() => {
                  setShowResourcesDropdown(!showResourcesDropdown);
                  setShowHelpDropdown(false);
                }}
              >
                <span className={styles['resources-btn']}>Resources</span>
                <MdExpandMore 
                  size={20} 
                  className={`${styles.dropdownIcon} ${showResourcesDropdown ? styles.dropdownIconActive : ''}`}
                />
              </button>
              {showResourcesDropdown && (
                <div className={styles.dropdownMenu}>
                  <button 
                    onClick={() => {
                      setShowContactModal(true);
                      setShowResourcesDropdown(false);
                    }} 
                    className={styles.dropdownItem}
                  >
                   <RiContactsBook2Line size={24} style={{ marginRight: '8px'}}/>Contacts
                  </button>
                </div>
              )}
            </div>

            <div className={styles.dropdownWrapper}>
              <button 
                className={styles.dropdownButton}
                onClick={() => {
                  setShowHelpDropdown(!showHelpDropdown);
                  setShowResourcesDropdown(false);
                }}
              >
                <span className={styles['help-btn']}>Help</span>
                <MdExpandMore 
                  size={20} 
                  className={`${styles.dropdownIcon} ${showHelpDropdown ? styles.dropdownIconActive : ''}`}
                />
              </button>
              
              {showHelpDropdown && (
                <div className={styles.dropdownMenu}>
                  <button 
                    onClick={() => {
                      setShowHelpModal(true);
                      setShowHelpDropdown(false);
                    }} 
                    className={styles.dropdownItem}
                  >
                    <MdOutlineQuestionAnswer size={24} style={{ marginRight: '8px'}}/>FAQ
                  </button>
                  <Link 
                    to="/support"
                    className={styles.dropdownItem}>
                    <MdOutlineSupportAgent
                      size={24}
                      style={{ marginRight: '8px'}}/>
                    Support
                  </Link>
                </div>
              )}
            </div>
            <Link to="/cart" className={styles.cartButton}>
              <MdShoppingCart size={32} color={'white'} />
              {cartItemsCount > 0 && (
                <span className={styles.cartBadge}>{cartItemsCount}</span>
              )}
            </Link>
            
            <button 
              className={styles.profileButton}
              onClick={onProfileClick}
              aria-label="Open profile"
            >
              {user?.profile_picture_url && !imageError ? (
                <img 
                  src={user.profile_picture_url} 
                  alt="Profile" 
                  className={styles.profileImage}
                  onError={() => {
                    console.error('Failed to load profile image in navbar');
                    setImageError(true);
                  }}
                  onLoad={() => {
                    console.log('Profile image loaded successfully in navbar');
                    setImageError(false);
                  }}
                />
              ) : (
                <FaUserCircle size={38} />
              )}
              <MdExpandMore 
                size={14} 
                className={`${styles.profileArrow}`}
              />
            </button>
          </div>
        </div>
      </nav>

      {showInstallSuccess && (
        <div className={styles.successToast}>
          <MdCheckCircle size={24} />
          <span>App installed successfully!</span>
        </div>
      )}

      {showInstallModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInstallModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Install SPCC-ORS App</h2>
              <button onClick={() => setShowInstallModal(false)} className={styles.closeButton}>
                <MdClose size={28} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.installIntro}>
                <MdDownload size={64} className={styles.installIcon} />
                <p className={styles.installDescription}>
                  Install this app on your device for quick and easy access!
                </p>
                <p className={styles.installBrowser}>
                  Detected: {installInstructions.browser}
                </p>
              </div>

              <div className={styles.installStepsContainer}>
                <h3 className={styles.installStepsTitle}>
                  How to Install:
                </h3>
                <ol className={styles.installStepsList}>
                  {installInstructions.steps.map((step, index) => (
                    <li key={index} className={styles.installStep}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {installInstructions.canAutoInstall && deferredPrompt && (
                <div className={styles.installButtonContainer}>
                  <button onClick={handleInstallApp} className={styles.installAppButton}>
                    <MdDownload size={24} />
                    Install App
                  </button>
                </div>
              )}

              <div className={styles.installBenefits}>
                <strong>Benefits:</strong>
                <ul className={styles.benefitsList}>
                  <li>Faster loading times</li>
                  <li>Easy access from your home screen</li>
                  <li>Native app-like experience</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className={styles.modalOverlay} onClick={() => setShowHelpModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Frequently Asked Questions</h2>
              <button onClick={() => setShowHelpModal(false)} className={styles.closeButton}>
                <MdClose size={28} />
              </button>
            </div>
            <div className={styles.modalBody}>              
              {faqs.map((category, catIndex) => (
                <div key={catIndex} className={styles.faqCategory}>
                  <div className={styles.categoryHeader}>
                    {category.icon}
                    <h3 className={styles.categoryTitle}>{category.category}</h3>
                  </div>
                  {category.questions.map((item, qIndex) => {
                    const index = `${catIndex}-${qIndex}`;
                    return (
                      <div key={qIndex} className={styles.accordionItem}>
                        <button
                          onClick={() => toggleAccordion(index)}
                          className={styles.accordionButton}
                        >
                          <span className={styles.accordionQuestion}>{item.q}</span>
                          <MdExpandMore 
                            size={24} 
                            className={`${styles.accordionIcon} ${
                              activeAccordion === index ? styles.accordionIconActive : ''
                            }`}
                          />
                        </button>
                        {activeAccordion === index && (
                          <div className={styles.accordionAnswer}>
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className={styles.helpFooter}>
                <p className={styles.helpFooterText}>Still need help?</p>
                <button onClick={() => {
                  setShowHelpModal(false);
                  setShowContactModal(true);
                }} className={styles.contactUsButton}>
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showContactModal && (
        <div className={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Contact Us</h2>
              <button onClick={() => setShowContactModal(false)} className={styles.closeButton}>
                <MdClose size={28} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalIntro}>Get in touch with the right department for your needs</p>
              
              <div className={styles.contactGrid}>
                {contactInfo.map((contact, index) => (
                  <div key={index} className={styles.contactCard}>
                    <h3 className={styles.contactDepartment}>{contact.department}</h3>
                    <div className={styles.contactDetails}>
                      <div className={styles.contactItem}>
                        <MdEmail size={20} className={styles.contactIcon} />
                        <a 
                          href={`mailto:${contact.email}`} 
                          className={styles.contactLink}
                          onClick={(e) => handleEmailClick(e, contact.email)}
                        >
                          {contact.email}
                        </a>
                      </div>
                      <div className={styles.contactItem}>
                        <MdPhone size={20} className={styles.contactIcon} />
                        <a href={`tel:${contact.phone}`} className={styles.contactLink}>
                          {contact.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailWarning && (
        <div className={styles.modalOverlay} onClick={cancelEmailRedirect}>
          <div className={styles.warningModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.warningHeader}>
              <MdEmail size={48} className={styles.warningIcon} />
              <h3 className={styles.warningTitle}>Open Email Client?</h3>
            </div>
            <div className={styles.warningBody}>
              <p className={styles.warningText}>
                You will be redirected to Gmail to send an email to:
              </p>
              <p className={styles.warningEmail}>{selectedEmail}</p>
              <p className={styles.warningNote}>
                A new tab will open with Gmail compose window ready.
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
};

export default Navbar;