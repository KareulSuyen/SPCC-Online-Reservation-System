import { useState, useEffect } from 'react';
import axios from 'axios';
import { TiWeatherCloudy } from "react-icons/ti";
import styles from '../styles/dashboard.module.scss';

const Dashboard = () => {

  const VITE_API_URL = import.meta.env.VITE_API_URL;

  const [currentUser, setCurrentUser] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    reservedValue: 0
  });
  
  const [schoolStatus, setSchoolStatus] = useState({
    status: 'open',   
    message: 'Loading status...',
    lastUpdated: new Date().toISOString(),
    weather: null,
    schedule: null
  });

  const [weatherLoading, setWeatherLoading] = useState(true);

  const getUserFromToken = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${VITE_API_URL}/api/core/reservations/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservations(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolStatus = async () => {
    try {
      setWeatherLoading(true);
      const response = await fetch(`${VITE_API_URL}/api/school-status/?city=Quezon City`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch school status');
      }
      
      const data = await response.json();
      setSchoolStatus(data);
    } catch (error) {
      console.error('Error fetching school status:', error);
      setSchoolStatus({
        status: 'open',
        message: 'Unable to fetch current status',
        lastUpdated: new Date().toISOString(),
        weather: null,
        schedule: null
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  const featuredProducts = [
    {
      id: 1,
      title: 'School Supplies Sale',
      gradient: 'linear-gradient(135deg, #343537ff 0%, #35251aff 100%)',
      image: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&h=300&fit=crop'
    },
    {
      id: 2,
      title: 'New Arrivals',
      subtitle: 'Check out our latest products',
      gradient: 'linear-gradient(135deg, #232323ff 0%, #583328ff 100%)',
      image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop'
    },
    {
      id: 3,
      title: 'Back to School Essentials',
      subtitle: 'Everything you need for the semester',
      gradient: 'linear-gradient(135deg, #0c0808ff 0%, #8c7235ff 100%)',
      image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=300&fit=crop'
    },
    {
      id: 4,                                             
      title: 'Limited items',
      subtitle: "Don't miss out!",
      gradient: 'linear-gradient(135deg, #0c0808ff 0%, rgb(39, 80, 128) 100%)',
      image: 'https://images.unsplash.com/photo-1770219792238-3e2aed99c22c?fm=jpg&amp;q=60&amp;w=3000&amp;auto=format&amp;fit=crop&amp;ixlib=rb-4.1.0&amp;ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
    }
  ];

  useEffect(() => {
    const user = getUserFromToken();
    setCurrentUser(user);
    
    setReservations([]);
    setStats({
      total: 0,
      pending: 0,
      completed: 0,
      reservedValue: 0
    });
    
    fetchReservations();
    fetchSchoolStatus();

    const statusInterval = setInterval(fetchSchoolStatus, 300000);
    
    return () => clearInterval(statusInterval);
  }, []); 

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken') {
        const user = getUserFromToken();
        setCurrentUser(user);
        setReservations([]);
        setStats({ total: 0, pending: 0, completed: 0, reservedValue: 0 });
        fetchReservations();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleTokenChange = () => {
      const user = getUserFromToken();
      setCurrentUser(user);
      setReservations([]);
      setStats({ total: 0, pending: 0, completed: 0, reservedValue: 0 });
      fetchReservations();
    };

    window.addEventListener('tokenChanged', handleTokenChange);
    return () => window.removeEventListener('tokenChanged', handleTokenChange);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const calculateStats = (data) => {
    const pending = data.filter(r => ['pending', 'confirmed', 'ready'].includes(r.status)).length;
    const completed = data.filter(r => r.status === 'completed').length;
    const reservedValue = data
      .filter(r => !['completed', 'cancelled'].includes(r.status))
      .reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
    
    setStats({
      total: data.length,
      pending,
      completed,
      reservedValue
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      'pending': { color: '#a97f00ff', label: 'Pending' },
      'confirmed': { color: '#007bff', label: 'Confirmed' },
      'ready': { color: '#17a2b8', label: 'Ready for Pickup' },
      'completed': { color: '#28a745', label: 'Completed' },
      'cancelled': { color: '#dc3545', label: 'Cancelled' }
    };
    return configs[status] || { color: '#6c757d', label: status };
  };

  const handleDeleteClick = (reservation) => {
    setOrderToDelete(reservation);
    setShowDeleteModal(true);
  };

  const deleteOrder = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${VITE_API_URL}/api/core/reservations/${orderToDelete.id}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedReservations = reservations.filter(r => r.id !== orderToDelete.id);
      setReservations(updatedReservations);
      calculateStats(updatedReservations);
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const clearOrders = async () => {
    setIsClearing(true);
    try {
      const token = localStorage.getItem('accessToken');
      
      const deletePromises = reservations.map(reservation =>
        axios.delete(`${VITE_API_URL}/api/core/reservations/${reservation.id}/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      
      await Promise.all(deletePromises);
      
      setReservations([]);
      calculateStats([]);
      setShowClearModal(false);
    } catch (error) {
      console.error('Error clearing orders:', error);
      alert('Failed to clear orders. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
  };

  const handleShopNow = () => {
    window.location.href = '/shop';
  };

  const getSchoolStatusConfig = () => {
    const configs = {
      'open': {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: '#28a745',
        bgColor: 'rgba(40, 167, 69, 0.1)',
        label: 'School Open'
      },
      'closed': {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        color: '#dc3545',
        bgColor: 'rgba(220, 53, 69, 0.1)',
        label: 'School Closed'
      },
      'warning': {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        ),
        color: '#ffc107',
        bgColor: 'rgba(255, 193, 7, 0.1)',
        label: 'Weather Warning'
      }
    };
    return configs[schoolStatus.status] || configs['open'];
  };

  const displayedOrders = showAllOrders ? reservations : reservations.slice(0, 1);
  const hasMoreOrders = reservations.length > 1;
  const displayName = currentUser?.email?.split('@')[0] || 'Student';
  
  return (
    <div className={styles.dashboardContainer}>
      {showDeleteModal && (
        <div className={styles.modalOverlay} onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Delete Order?</h3>
            </div>
            <p className={styles.modalMessage}>
              Are you sure you want to delete Order #{orderToDelete?.id}? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn} 
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className={styles.modalConfirmBtn} 
                onClick={deleteOrder}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Order'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearModal && (
        <div className={styles.modalOverlay} onClick={() => !isClearing && setShowClearModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Clear All Orders?</h3>
            </div>
            <p className={styles.modalMessage}>
              Are you sure you want to delete all {reservations.length} orders? This action cannot be undone and will permanently remove all order data from the database.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn} 
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
              >
                Cancel
              </button>
              <button 
                className={styles.modalConfirmBtn} 
                onClick={clearOrders}
                disabled={isClearing}
              >
                {isClearing ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    Clearing...
                  </>
                ) : (
                  'Clear All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className={styles.ordersSection}>
        <div className={styles.ordersSectionHeader}>
          <div className={styles.headerLeft}>
            <h2>My Orders</h2>
            <span className={styles.orderCount}>{reservations.length}</span>
          </div>
          {reservations.length > 0 && (
            <button 
              className={styles.clearOrdersBtn} 
              onClick={() => setShowClearModal(true)}
              title="Clear all orders"
            >
              <h3>Clear orders</h3>
            </button>
          )}
        </div>

        <div className={`${styles.ordersContainer} ${showAllOrders ? styles.showingAll : ''}`}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading orders...</p>
            </div>
          ) : reservations.length > 0 ? (
            <>
              <div className={styles.ordersList}>
                {displayedOrders.map(reservation => {
                  const statusConfig = getStatusConfig(reservation.status);
                  return (
                    <div key={reservation.id} className={styles.orderCard}>
                      <div className={styles.orderHeader}>
                        <div className={styles.orderInfo}>
                          <h3>Order #{reservation.id}</h3>
                          <p className={styles.orderDate}>
                            {new Date(reservation.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className={styles.orderActions}>
                          <span 
                            className={styles.statusBadge}
                            style={{ backgroundColor: statusConfig.color }}
                          >
                            {statusConfig.label}
                          </span>
                          <button 
                            className={styles.deleteOrderBtn}
                            onClick={() => handleDeleteClick(reservation)}
                            title="Delete order"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className={styles.orderItems}>
                        {reservation.items.map(item => (
                          <div key={item.id} className={styles.orderItem}>
                            <div className={styles.itemIcon}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div className={styles.itemDetails}>
                              <p className={styles.itemName}>{item.display_name}</p>
                              <p className={styles.itemQuantity}>
                                {item.quantity} × ₱{parseFloat(item.price_at_time).toFixed(2)}
                              </p>
                            </div>
                            <div className={styles.itemPrice}>
                              ₱{parseFloat(item.subtotal).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {reservation.notes && (
                        <div className={styles.orderNotes}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{reservation.notes}</span>
                        </div>
                      )}

                      <div className={styles.orderTotal}>
                        <span>Total</span>
                        <span className={styles.totalAmount}>
                          ₱{parseFloat(reservation.total_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {hasMoreOrders && (
                <button 
                  className={styles.viewAllBtn}
                  onClick={() => setShowAllOrders(!showAllOrders)}
                >
                  {showAllOrders ? (
                    <>
                      Show Less
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </>
                  ) : (
                    <>
                      View All ({reservations.length})
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No orders yet</p>
              <span>Start reserving to see your orders here</span>
            </div>
          )}
        </div>

        <div className={styles.schoolStatus}>
          {weatherLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading status...</p>
            </div>
          ) : (
            <>
              <div className={styles.statusHeader}>
                <div className={styles.statusIconWrapper} style={{ backgroundColor: getSchoolStatusConfig().bgColor }}>
                  <div className={styles.statusIcon} style={{ color: getSchoolStatusConfig().color }}>
                    {getSchoolStatusConfig().icon}
                  </div>
                </div>
                <div className={styles.statusInfo}>
                  <h3 className={styles.statusLabel}>{getSchoolStatusConfig().label}</h3>
                  <p className={styles.statusMessage}>{schoolStatus.message}</p>
                </div>
              </div>

              {schoolStatus.weather && (
                <div className={styles.weatherInfo}>
                  <div className={styles.weatherMain}>
                    <TiWeatherCloudy color='gray' size={35}/>
                    <div className={styles.weatherDetails}>
                      <div className={styles.temperature}>{schoolStatus.weather.temperature}°C</div>
                      <div className={styles.weatherDescription}>
                        {schoolStatus.weather.description.charAt(0).toUpperCase() + 
                         schoolStatus.weather.description.slice(1)}
                      </div>
                    </div>
                  </div>
                  <div className={styles.weatherStats}>
                    <div className={styles.weatherStat}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Humidity: {schoolStatus.weather.humidity}%</span>
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.statusFooter}>
                <span className={styles.statusTimestamp}>
                  Last updated: {new Date(schoolStatus.lastUpdated).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <button className={styles.refreshBtn} onClick={fetchSchoolStatus} disabled={weatherLoading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.welcomeSection}>
          <h1>Welcome back, {displayName}!</h1>
          <hr />
          <p>Manage your school supply reservations and track your orders</p>
        </div>

        <div className={styles.slideshowContainer}>
          <div className={styles.slideshow}>
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className={`${styles.slide} ${index === currentSlide ? styles.active : ''}`}
                style={{ background: product.gradient }}
              >
                <div className={styles.slideContent}>
                  <h2>{product.title}</h2>
                  <p>{product.subtitle}</p>
                  <button className={styles.shopNowBtn} onClick={handleShopNow}>Reserve Now</button>
                </div>
                <div className={styles.slideImage}>
                  <img src={product.image} alt={product.title} />
                </div>
              </div>
            ))}
          </div>
          
          <button className={styles.prevBtn} onClick={prevSlide} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button className={styles.nextBtn} onClick={nextSlide} aria-label="Next slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className={styles.slideIndicators}>
            {featuredProducts.map((_, index) => (
              <button
                key={index}
                className={`${styles.indicator} ${index === currentSlide ? styles.activeIndicator : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#5a72dfff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Total Orders</p>
              <h3 className={styles.statValue}>{stats.total}</h3>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#c19613ff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Pending Orders</p>
              <h3 className={styles.statValue}>{stats.pending}</h3>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#1c9037ff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Completed Orders</p>
              <h3 className={styles.statValue}>{stats.completed}</h3>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon} style={{ backgroundColor: '#0f7686ff' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Reserved Value</p>
              <h3 className={styles.statValue}>₱{stats.reservedValue.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className={styles.recentActivity}>
          <div className={styles.sectionHeader}>
            <h2>Recent Activity</h2>
          </div>
          <div className={styles.activityList}>
            {reservations.slice(0, 5).map(reservation => {
              const statusConfig = getStatusConfig(reservation.status);
              return (
                <div key={reservation.id} className={styles.activityItem}>
                  <div className={styles.activityIconWrapper}>
                    <div 
                      className={styles.activityStatusDot}
                      style={{ backgroundColor: statusConfig.color }}
                    />
                  </div>
                  <div className={styles.activityDetails}>
                    <p className={styles.activityTitle}>
                      Order #{reservation.id} - {statusConfig.label}
                    </p>
                    <p className={styles.activityTime}>
                      {new Date(reservation.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={styles.activityAmount}>
                    ₱{parseFloat(reservation.total_amount).toFixed(2)}
                  </span>
                </div>
              );
            })}
            {reservations.length === 0 && (
              <p className={styles.noActivity}>No recent activity</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;