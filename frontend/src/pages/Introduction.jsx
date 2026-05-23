import { useState, useEffect } from 'react';
import styles from '../styles/introduction.module.scss';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants';
import { GiBookmarklet, GiFastArrow } from "react-icons/gi";
import { PiShirtFoldedFill } from "react-icons/pi";
import { BiSolidPaint } from "react-icons/bi";
import { LuPackageCheck } from "react-icons/lu";
import { MdOutlineSecurity, MdDevices, MdClose, MdEmail, MdPhone, MdExpandMore, MdShoppingCart, MdAccountCircle, MdPayment, MdChevronLeft, MdChevronRight } from "react-icons/md";
import spccLogo from '../../public/images/spcc-logo.png';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const Intro = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentText, setCurrentText] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [currentProduct, setCurrentProduct] = useState(0);
  const [productsLoading, setProductsLoading] = useState(false);
  
  const animatedTitles = [
    "Effortless",
    "Frictionless",
    "Seamless",
    "Streamlined",
    "Intuitive",
    "Simplified",
    "Hassle-Free",
    "Smooth",
    "Optimized",
    "Smart"
  ];
  
  const slides = [
    {
      title: "School Supplies",
      description: "Complete range of notebooks, pens, and essentials",
      icon: <GiBookmarklet size={100} />
    },
    {
      title: "Uniforms",
      description: "Tshirts, Type-A, and Blouses",
      icon: <PiShirtFoldedFill size={100} />
    },
    {
      title: "Art Materials",
      description: "Creative supplies for all your projects",
      icon: <BiSolidPaint size={100} />
    },
  ];

  const features = [
    {
      icon: <GiFastArrow size={70} />,
      title: "Quick Reservation",
      description: "Reserve your supplies in just a few clicks"
    },
    {
      icon: <LuPackageCheck size={70} />,
      title: "Easy Pickup",
      description: "Convenient pickup schedule at your campus"
    },
    {
      icon: <MdOutlineSecurity size={70} />,
      title: "Secure Payment",
      description: "Safe and reliable payment processing"
    },
    {
      icon: <MdDevices size={70} />,
      title: "Track Orders",
      description: "Real-time updates on your reservations"
    }
  ];

  const faqs = [
    {
      category: "Getting Started",
      icon: <MdAccountCircle size={24} />,
      questions: [
        {
          q: "How do I create an account?",
          a: "Click on 'Get Started' 'Create Your Account' button on the introduction page. Fill in your student information, email, create a secure password, and You'll receive a confirmation email to activate your account."
        },
        {
          q: "What information do I need to register?",
          a: "You'll need your full name and email address. Please make sure to use your official school email in order to verify your account."
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
          a: "Log in to your account, browse the available items, add them to your cart, review your order, and click 'Reserve'. You'll receive a confirmation with your reservation number and other details."
        },
        {
          q: "Can I modify my reservation after submitting?",
          a: "No, Our current system still don't allow to modify your orders after you submit a reservation, so please double check everything before you proceed."
        },
        {
          q: "How long is my reservation valid?",
          a: "Reservation validity depends on the admin decision, so always check your order status."
        },
        {
          q: "Is there a minimum or maximum order quantity?",
          a: "There's no minimum order. Maximum quantities depend on item availability and stock levels. If you need bulk orders, please contact us directly."
        }
      ]
    },
    {
      category: "Payment & Pricing",
      icon: <MdPayment size={24} />,
      questions: [
        {
          q: "What payment methods do you accept?",
          a: "We only accepts cash upon pickup. All online payments are currently disabled for security purposes."
        },
        {
          q: "When do I need to pay for my reservation?",
          a: "Payment should be completed within 48 hours after your reservation is marked as 'Ready for pickup'. You can only pay during pickup for cash payments."
        },
        {
          q: "Are prices the same as the physical store?",
          a: "Yes, all items are priced the same as our physical store. There are no additional fees for online reservations."
        },
        {
          q: "Do you offer student discounts?",
          a: "Special promotions and discounts are announced through the platform. Check the homepage regularly for current offers and seasonal sales."
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

  useEffect(() => {
    const fetchUserCount = async () => {
      try {
        const VITE_API_URL = import.meta.env.VITE_API_URL;
        const baseUrl = VITE_API_URL.endsWith('/') ? VITE_API_URL : `${VITE_API_URL}/`;
        const fullUrl = `${baseUrl}api/auth/user-count/`;
        const response = await fetch(fullUrl);
        const data = await response.json();
        setUserCount(data.total_users || 0);
      } catch (error) {
        console.error('Failed to fetch user count:', error);
        setUserCount(0);
      }
    };

    fetchUserCount();
  }, []);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await fetch(`${VITE_API_URL}/api/core/items/`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductsModalOpen = () => {
    setShowProductsModal(true);
    if (products.length === 0) {
      fetchProducts();
    }
  };

  const getDynamicDescription = () => {
    const getUserRange = (count) => {
      switch (true) {
        case count === 0:
          return 'zero';
        case count === 1:
          return 'one';
        case count <= 5:
          return 'small';
        case count <= 10:
          return 'growing';
        case count <= 25:
          return 'momentum';
        case count <= 50:
          return 'spreading';
        case count <= 100:
          return 'booming';
        case count <= 250:
          return 'movement';
        case count <= 500:
          return 'critical';
        default:
          return 'established';
      }
    };

    const range = getUserRange(userCount);

    switch (range) {
      case 'zero':
        return "Be the first to transform how you access educational resources. Every great community starts with one brave pioneer. Will it be you?";
      case 'one':
        return "Join 1 student already experiencing hassle-free school supply reservations. You won't be alone anymore, we're already building something amazing together!";
      case 'small':
        return `Join ${userCount} students already on board. Still small, but we're growing close! Be part of our founding community and shape the future together.`;
      case 'growing':
        return `${userCount} students are already simplifying their campus life. Our community is getting stronger! don't miss out on being an early adopter!`;
      case 'momentum':
        return `${userCount} students trust SPCC-ORS. We're picking up momentum! Join our thriving community and experience the difference.`;
      case 'spreading':
        return `${userCount} students have made the switch. The word is spreading fast! join our growing community and see why everyone's talking about us!`;
      case 'booming':
        return `Over ${userCount} students can't be wrong! Our community is booming. Experience seamless reservations, instant tracking, and stress-free pickups.`;
      case 'movement':
        return `${userCount}+ students are already ahead of the game. Join the movement and discover why we're becoming the go-to platform on campus!`;
      case 'critical':
        return `${userCount}+ students streamlining their school life daily. We've hit critical mass—experience the power of a thriving campus community!`;
      case 'established':
        return `Trusted by ${userCount}+ students campus-wide. The future of educational resource management is here—efficient, secure, and designed for you.`;
      default:
        return "Experience the future of educational resource management.";
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentTitle = animatedTitles[currentText];
    
    if (!isDeleting && displayedText === currentTitle) {
      const timeout = setTimeout(() => setIsDeleting(true), 1500);
      return () => clearTimeout(timeout);
    }
    
    if (isDeleting && displayedText === '') {
      setIsDeleting(false);
      setCurrentText((prev) => (prev + 1) % animatedTitles.length);
      return;
    }
    
    const timeout = setTimeout(() => {
      if (isDeleting) {
        setDisplayedText(currentTitle.substring(0, displayedText.length - 1));
      } else {
        setDisplayedText(currentTitle.substring(0, displayedText.length + 1));
      }
    }, isDeleting ? 20 : 50); 
    
    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, currentText, animatedTitles]);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
  };

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

  const nextProduct = () => {
    setCurrentProduct((prev) => (prev + 1) % products.length);
  };

  const prevProduct = () => {
    setCurrentProduct((prev) => (prev - 1 + products.length) % products.length);
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.logo}>
            <img src={spccLogo} className={styles['nav-logo']}/>
            <span className={styles.logoText}>
              SPCC-<span className={styles.logoAccent}>ORS</span>
            </span>
          </div>
          <div className={styles.navLinks}>
            <a onClick={handleLogout} href="/login" className={styles.navLink}>
              Login
            </a>
            <a onClick={handleLogout} href="/register" className={styles.navButton}>
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              Your Gateway to <span className={styles.heroTitleAccent}>{displayedText}</span>
              <br />
              School Supply Management
            </h1>
            <p className={styles.heroDescription}>
              {getDynamicDescription()}
            </p>
            <div className={styles.heroButtons}>
              <a href="/login" className={styles.primaryButton}>
                Start Reserving
                <span className={styles.buttonArrow}>→</span>
              </a>
              <a href="#features" className={styles.secondaryButton}>
                Learn More
              </a>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <div className={styles.statNumber}>24/7</div>
                <div className={styles.statLabel}>Online Reservation</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNumber}>100%</div>
                <div className={styles.statLabel}>Secured Process</div>
              </div>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.slideshow}>
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`${styles.slide} ${
                    index === currentSlide ? styles.slideActive : ''
                  }`}
                >
                  <div className={styles.slideIcon}>{slide.icon}</div>
                  <h3 className={styles.slideTitle}>{slide.title}</h3>
                  <p className={styles.slideDescription}>{slide.description}</p>
                </div>
              ))}
              <div className={styles.slideIndicators}>
                {slides.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.indicator} ${
                      index === currentSlide ? styles.indicatorActive : ''
                    }`}
                    onClick={() => setCurrentSlide(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <div className={styles.featuresContent}>
          <div className={styles.featuresHeader}>
            <h2 className={styles.featuresTitle}>Why Choose SPCC-ORS?</h2>
            <p className={styles.featuresSubtitle}>
              Experience the future of educational resource management
            </p>
          </div>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Get Started?</h2>
          <p className={styles.ctaDescription}>
            Be the one who has simplified their school supply management.
          </p>
          <a href="/register" className={styles.ctaButton}>
            Create Your Account
            <span className={styles.buttonArrow}>→</span>
          </a>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <div className={styles.footerSection}>
              <h4 className={styles.footerHeading}>Quick Links</h4>
              <button 
                onClick={handleProductsModalOpen} 
                className={styles.footerLink}
              >
                Products
              </button>
              <button 
                onClick={() => setShowContactModal(true)} 
                className={styles.footerLink}
              >
                Contact
              </button>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerHeading}>Support</h4>
              <button 
                onClick={() => setShowHelpModal(true)} 
                className={styles.footerLink}
              >
                FAQ
              </button>
              <button 
                onClick={() => setShowTermsModal(true)} 
                className={styles.footerLink}
              >
                Terms
              </button>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p className={styles.footerCopyright}>
            © {new Date().getFullYear()}{' '}
            <a 
              href="https://spcc.edu.ph/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.footerSchoolLink}
            >
              Systems Plus Computer College
            </a>
            {' '}Educational Resource System. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Products Modal */}
      {showProductsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProductsModal(false)}>
          <div className={styles.productsModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Our Products</h2>
              <button onClick={() => setShowProductsModal(false)} className={styles.closeButton}>
                <MdClose size={28} />
              </button>
            </div>
            <div className={styles.productsModalBody}>
              {productsLoading ? (
                <div className={styles.productsLoading}>
                  <div className={styles.productsSpinner}></div>
                  <p>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className={styles.productsEmpty}>
                  <p>No products available at the moment.</p>
                </div>
              ) : (
                <>
                  <div className={styles.productShowcase}>
                    <div className={styles.productImageContainer}>
                      {products[currentProduct].image ? (
                        <img 
                          src={products[currentProduct].image.startsWith('http') 
                            ? products[currentProduct].image 
                            : `${VITE_API_URL}${products[currentProduct].image}`
                          }
                          alt={products[currentProduct].name}
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.productImagePlaceholder}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p>No Image Available</p>
                        </div>
                      )}
                      
                      {products.length > 1 && (
                        <>
                          <button onClick={prevProduct} className={styles.productNavBtn} style={{ left: '1rem' }}>
                            <MdChevronLeft size={32} />
                          </button>
                          <button onClick={nextProduct} className={styles.productNavBtn} style={{ right: '1rem' }}>
                            <MdChevronRight size={32} />
                          </button>
                        </>
                      )}
                    </div>
                    
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{products[currentProduct].name}</h3>
                      {products[currentProduct].description && (
                        <p className={styles.productDescription}>{products[currentProduct].description}</p>
                      )}
                      <div className={styles.productCounter}>
                        {currentProduct + 1} / {products.length}
                      </div>
                      <a href="/login" className={styles.productReserveBtn}>
                        Reserve Now
                        <span>→</span>
                      </a>
                    </div>
                  </div>

                  {products.length > 1 && (
                    <div className={styles.productThumbnails}>
                      {products.map((product, index) => (
                        <button
                          key={product.id}
                          onClick={() => setCurrentProduct(index)}
                          className={`${styles.productThumbnail} ${index === currentProduct ? styles.productThumbnailActive : ''}`}
                        >
                          {product.image ? (
                            <img 
                              src={product.image.startsWith('http') 
                                ? product.image 
                                : `${VITE_API_URL}${product.image}`
                              }
                              alt={product.name}
                            />
                          ) : (
                            <div className={styles.thumbnailPlaceholder}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          <div className={styles.thumbnailLabel}>
                            <span>{product.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
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

      {showTermsModal && (
        <div className={styles.termsModalOverlay} onClick={() => setShowTermsModal(false)}>
          <div className={styles.termsModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.termsModalHeader}>
              <h2>Terms of Service</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                className={styles.termsCloseButton}
              >
                ✕
              </button>
            </div>
            <div className={styles.termsModalBody}>
              <p className={styles.effectiveDate}><strong>Effective Date:</strong> October 12, 2025</p>

              <section>
                <p><strong>System Name:</strong> Systems Plus Computer College Online Reservation System</p>
                <p><strong>Institution:</strong> Systems Plus Computer College – Caloocan Campus</p>
              </section>

              <h3>1. Acceptance of Terms</h3>
              <p>By accessing or using the SPCC Online Reservation System, you agree to comply with these Terms of Service. If you do not agree with these Terms, please refrain from using the System.</p>

              <h3>2. Purpose of the System</h3>
              <p>The SPCC Online Reservation System is designed to help students under the ICT strand reserve school supplies and services provided by the Business Center. The System aims to simplify the process of requesting, managing, and claiming supplies without the need for in-person transactions.</p>

              <h3>3. Eligibility</h3>
              <p>Only verified students and staffs of Systems Plus Computer College (SPCC) - Caloocan Campus are allowed to use the System. Users must register using their official SPCC email address (@spcc.edu.ph). Personal or non-SPCC emails are rejected.</p>

              <h3>4. Account Registration and Authentication</h3>
              <p>Users are required to register with their SPCC email. The System uses secure authentication mechanism. After successful registration, users must complete email verification before accessing any system feature. The verification link sent to your SPCC email is time-sensitive and will expire after 24 hours.</p>

              <h3>5. User Responsibilities</h3>
              <p>By using the System, you agree to the following:</p>
              <ul>
                <li>Provide accurate and truthful information during registration and reservation.</li>
                <li>Do not create multiple or fake accounts.</li>
                <li>Do not attempt to access, modify, or disrupt the system's database or security mechanisms.</li>
                <li>Respect other users and school personnel interacting with the system.</li>
                <li>Report any bugs, errors, or suspicious activity to the system administrators immediately.</li>
              </ul>

              <h3>6. Data Privacy and Security</h3>
              <p>The System collects minimal information, including your name, SPCC email, and reservation details. This data is used strictly for internal school purposes, such as confirming your reservation and improving service efficiency. Your data is encrypted and secured. JWT tokens are used for authentication, and no sensitive credentials (like passwords) are stored. The System will never share, sell, or disclose user information to third parties, except when required by law or by SPCC administration for official use.</p>

              <h3>7. Email Verification and Communication</h3>
              <p>You may receive emails related to verification, reservation status, or updates regarding your transaction. These communications are system-generated and part of the service process. By registering, you consent to receive these necessary emails.</p>

              <h3>8. Reservation Guidelines</h3>
              <p>Each reservation must be made through the official SPCC Online Reservation System. Items reserved must be claimed within the time period set by the Business Center. Unclaimed reservations may be automatically canceled. Abuse of the system (e.g., spam reservations or false information) can result in account suspension or permanent ban.</p>

              <h3>9. System Availability and Maintenance</h3>
              <p>The System may undergo periodic updates, security enhancements, or maintenance without prior notice. Temporary downtime may occur but will be minimized as much as possible. The developers and SPCC administration are not liable for any inconvenience caused by such downtime.</p>

              <h3>10. Limitation of Liability</h3>
              <p>While every effort is made to maintain data accuracy and system stability, SPCC and its developers are not responsible for any losses, data errors, or interruptions caused by unforeseen technical issues or misuse of the system.</p>

              <h3>11. Modification of Terms</h3>
              <p>SPCC reserves the right to update or modify these Terms at any time. Significant changes will be communicated through official SPCC channels or via email. Continued use of the System after such updates means you accept the revised Terms.</p>

              <h3>12. Contact Information</h3>
              <p>For questions, feedback, or technical concerns, you may contact:<br />
              <strong>Business Center – SPCC Caloocan Campus</strong><br />
              Systems Plus Computer College, Caloocan City, Philippines</p>

              <h3>13. Acknowledgment</h3>
              <p>By using this System, you confirm that you have read, understood, and agreed to the Terms stated above. Violation of these Terms may result in suspension, restriction, or termination of your account access.</p>
            </div>
            <div className={styles.termsModalFooter}>
              <button
                onClick={() => setShowTermsModal(false)}
                className={styles.closeTermsButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Intro;