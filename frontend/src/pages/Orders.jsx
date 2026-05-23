import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../styles/orders.module.scss';
import { AiOutlineDropbox } from "react-icons/ai";

const VITE_API_URL = import.meta.env.VITE_API_URL

const Orders = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [schoolStatus, setSchoolStatus] = useState({
    status: 'open', 
    message: 'Loading status...',
    lastUpdated: new Date().toISOString(),
    weather: null,
    schedule: null
  });
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchReservations();
    fetchSchoolStatus();

    const statusInterval = setInterval(fetchSchoolStatus, 300000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${VITE_API_URL}/api/core/reservations/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
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
      
      setReservations(reservations.filter(r => r.id !== orderToDelete.id));
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
      setShowClearModal(false);
    } catch (error) {
      console.error('Error clearing orders:', error);
      alert('Failed to clear orders. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'confirmed': '#007bff',
      'ready': '#17a2b8',
      'completed': '#28a745',
      'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'ready': 'Ready for Pickup',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
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

  const getWeatherIcon = (iconCode) => {
    if (!iconCode) return null;
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const getImageUrl = (item_details) => {
    if (!item_details || !item_details.image) {
      console.log('No image in item_details');
      return null;
    }
    
    const imageUrl = item_details.image;
    console.log('Image URL from item_details:', imageUrl);
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    return `${VITE_API_URL}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
  };
  
  if (!isMobile) {
    return (
      <div className={styles.desktopError}>
        <div className={styles.errorContent}>
          <svg className={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h1>Mobile Only Page</h1>
          <p>This orders page is optimized for mobile devices. Please use the dashboard sidebar on desktop to view your orders.</p>
          <button className={styles.backButton} onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading orders...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>My Orders</h1>
            <p className={styles.subtitle}>Track and manage your reservations</p>
          </div>
          {reservations.length > 0 && (
            <button 
              className={styles.clearAllBtn}
              onClick={() => setShowClearModal(true)}
              title="Clear all orders"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
        </div>
      </div>
    
      {reservations.length > 0 ? (
        <div className={styles.ordersList}>
          {reservations.map(reservation => (
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
                <div className={styles.orderHeaderActions}>
                  <div 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(reservation.status) }}
                  >
                    {getStatusLabel(reservation.status)}
                  </div>
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
                    {item.item_details?.image && (
                      <img 
                        src={getImageUrl(item.item_details)}
                        alt={item.item_name}
                        className={styles.itemImage}
                        onError={(e) => {
                          console.error('Image failed to load:', item.item_details?.image);
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className={styles.itemDetails}>
                      <p className={styles.itemName}>{item.item_name}</p>
                      {item.size_name && (
                        <p className={styles.itemSize}>Size: {item.size_name}</p>
                      )}
                      <p className={styles.itemQuantity}>
                        {item.quantity} × ₱{parseFloat(item.price_at_time).toFixed(2)}
                      </p>
                    </div>
                    <div className={styles.itemPrice}>
                      <p className={styles.subtotal}>
                        ₱{parseFloat(item.subtotal).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {reservation.notes && (
                <div className={styles.orderNotes}>
                  <strong>Notes:</strong> {reservation.notes}
                </div>
              )}

              <div className={styles.orderFooter}>
                <span className={styles.totalLabel}>Total Amount:</span>
                <span className={styles.totalAmount}>
                  ₱{parseFloat(reservation.total_amount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}><AiOutlineDropbox size={50} /></div>
          <h2>No orders yet</h2>
          <p>Start reserving school supplies to see your orders here</p>
          <button className={styles.startShoppingButton} onClick={() => window.location.href = '/shop'}>
            Start Shopping
          </button>
        </div>
      )}

      <div className={styles.schoolStatus}>
        {weatherLoading ? (
          <div className={styles.statusLoading}>
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
                  {getWeatherIcon(schoolStatus.weather.icon) && (
                    <img 
                      src={getWeatherIcon(schoolStatus.weather.icon)} 
                      alt={schoolStatus.weather.description}
                      className={styles.weatherIcon}
                    />
                  )}
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
                  <div className={styles.weatherStat}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    <span>Wind: {schoolStatus.weather.wind_speed} m/s</span>
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
    </div>
  );
};

export default Orders;