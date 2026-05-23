import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import styles from '../styles/cart.module.scss';
import { MdOutlineRemoveShoppingCart } from "react-icons/md";

const MAX_ORDER_QTY = 5;
const DEBOUNCE_MS = 600;

const Cart = () => {
  const VITE_API_URL = import.meta.env.VITE_API_URL;
  const { cart, updateCartItem, removeFromCart, clearCart, fetchCart, initialized } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [localQty, setLocalQty] = useState({});

  const pendingQty = useRef({});
  const debounceTimers = useRef({});
  const submitting = useRef(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!cart?.items) return;
    setLocalQty(prev => {
      const next = {};
      cart.items.forEach(item => {
        if (!debounceTimers.current[item.id]) {
          next[item.id] = item.quantity;
        } else {
          next[item.id] = prev[item.id] ?? item.quantity;
        }
      });
      return next;
    });
  }, [cart]);

  useEffect(() => {
    if (initialized && !cart) fetchCart();
  }, [initialized]);

  useEffect(() => {
    const handleTokenChange = () => { if (initialized) fetchCart(); };
    const handleStorageChange = (e) => { if (e.key === 'accessToken' && initialized) fetchCart(); };
    window.addEventListener('tokenChanged', handleTokenChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('tokenChanged', handleTokenChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [initialized, fetchCart]);

  useEffect(() => {
    return () => { Object.values(debounceTimers.current).forEach(clearTimeout); };
  }, []);

  const showMsg = (type, text, ms = 4000) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), ms);
  };

  const getQty = (itemId, fallback) =>
    localQty[itemId] !== undefined ? localQty[itemId] : fallback;

  const getTotalDisplayed = (items) =>
    (items || []).reduce((sum, item) => sum + getQty(item.id, item.quantity), 0);

  const handleQuantityChange = (cartItem, newQty) => {
    if (newQty < 1) return;

    const currentDisplayed = getQty(cartItem.id, cartItem.quantity);
    const diff = newQty - currentDisplayed;

    if (diff > 0) {
      const currentTotal = getTotalDisplayed(cart?.items);
      const newTotal = currentTotal + diff;

      if (newTotal > MAX_ORDER_QTY) {
        const canAdd = MAX_ORDER_QTY - currentTotal;
        showMsg(
          'error',
          canAdd <= 0
            ? `Order is full! Max ${MAX_ORDER_QTY} items per order.`
            : `You can only add ${canAdd} more item${canAdd !== 1 ? 's' : ''} (max ${MAX_ORDER_QTY} per order).`
        );
        return;
      }
    }

    setLocalQty(prev => ({ ...prev, [cartItem.id]: newQty }));

    pendingQty.current[cartItem.id] = newQty;

    if (debounceTimers.current[cartItem.id]) {
      clearTimeout(debounceTimers.current[cartItem.id]);
    }

    debounceTimers.current[cartItem.id] = setTimeout(async () => {
      const finalQty = pendingQty.current[cartItem.id];
      delete debounceTimers.current[cartItem.id];
      delete pendingQty.current[cartItem.id];

      const result = await updateCartItem(cartItem.id, finalQty);
      if (!result.success) {
        showMsg('error', result.error || 'Failed to update quantity.');
        setLocalQty(prev => ({ ...prev, [cartItem.id]: cartItem.quantity }));
      }
    }, DEBOUNCE_MS);
  };

  const handleRemoveItem = async (cartItemId) => {
    if (debounceTimers.current[cartItemId]) {
      clearTimeout(debounceTimers.current[cartItemId]);
      delete debounceTimers.current[cartItemId];
    }
    delete pendingQty.current[cartItemId];
    setLocalQty(prev => {
      const next = { ...prev };
      delete next[cartItemId];
      return next;
    });
    await removeFromCart(cartItemId);
  };

  const handleCheckout = async () => {
    if (submitting.current) return;
    submitting.current = true;

    const items = cart?.items ?? [];
    const totalQty = getTotalDisplayed(items);

    if (items.length === 0) {
      showMsg('error', 'Your cart is empty!');
      submitting.current = false;
      return;
    }
    if (totalQty > MAX_ORDER_QTY) {
      showMsg('error', `Max ${MAX_ORDER_QTY} items per order. You have ${totalQty}.`, 5000);
      submitting.current = false;
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${VITE_API_URL}/api/core/reservations/`,
        { notes: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMsg('success', 'Order placed successfully!');
      await fetchCart();
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      showMsg('error', error.response?.data?.error || 'Failed to place order.');
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  const getImageUrl = (item_details) => {
    if (!item_details || !item_details.image) return null;
    const imageUrl = item_details.image;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    const base = VITE_API_URL.replace(/\/$/, '');
    const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${base}${path}`;
  };

  if (!initialized) {
    return <div className={styles.loading}>Loading cart...</div>;
  }

  const cartItems = cart?.items || [];
  const totalQty = getTotalDisplayed(cartItems);
  const overLimit = totalQty > MAX_ORDER_QTY;
  const slotsUsed = Math.min(totalQty, MAX_ORDER_QTY);
  const slotsLeft = Math.max(MAX_ORDER_QTY - totalQty, 0);

  const optimisticTotal = cartItems.reduce((sum, item) => {
    const price = parseFloat(item.size_price || item.item_price);
    return sum + price * getQty(item.id, item.quantity);
  }, 0).toFixed(2);

  return (
    <div className={styles.container}>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.pageHead}>
        <div>
          <h1>Shopping Cart</h1>
          <p className={styles.subtitle}>Review your items and proceed to checkout</p>
        </div>
        {cartItems.length > 0 && (
          <button className={styles.clearTopBtn} onClick={clearCart}>
            Clear Cart
          </button>
        )}
      </div>

      {overLimit && (
        <div className={styles.limitAlert}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            You have <strong>{totalQty}</strong> items — max is <strong>{MAX_ORDER_QTY}</strong> per order.
            Remove <strong>{totalQty - MAX_ORDER_QTY}</strong> item{totalQty - MAX_ORDER_QTY > 1 ? 's' : ''} to proceed.
          </span>
        </div>
      )}

      {cartItems.length > 0 ? (
        <div className={styles.layout}>

          <div className={styles.cartItems}>
            {cartItems.map((cartItem, i) => {
              const imgUrl = getImageUrl(cartItem.item_details);
              const displayedQty = getQty(cartItem.id, cartItem.quantity);
              const unitPrice = parseFloat(cartItem.size_price || cartItem.item_price);
              const displayedSubtotal = (unitPrice * displayedQty).toFixed(2);

              return (
                <div
                  key={cartItem.id}
                  className={styles.cartItem}
                  style={{ animationDelay: `${i * 55}ms` }}
                >
                  {cartItem.item_details?.image && imgUrl && (
                    <img
                      src={imgUrl}
                      alt={cartItem.display_name}
                      className={styles.itemImage}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}

                  <div className={styles.itemInfo}>
                    <h3>{cartItem.display_name}</h3>
                    {cartItem.size_name && (
                      <span className={styles.sizeTag}>Size: {cartItem.size_name}</span>
                    )}
                    <p className={styles.price}>₱{unitPrice.toFixed(2)}</p>
                  </div>

                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => handleQuantityChange(cartItem, displayedQty - 1)}
                      disabled={displayedQty <= 1}
                      aria-label="Decrease quantity"
                    >−</button>
                    <span className={styles.quantity}>{displayedQty}</span>
                    <button
                      onClick={() => handleQuantityChange(cartItem, displayedQty + 1)}
                      disabled={totalQty >= MAX_ORDER_QTY}
                      aria-label="Increase quantity"
                    >+</button>
                  </div>

                  <div className={styles.itemActions}>
                    <p className={styles.subtotal}>₱{displayedSubtotal}</p>
                    <button
                      onClick={() => handleRemoveItem(cartItem.id)}
                      className={styles.removeButton}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.cartSummary}>
            <h2 className={styles.summaryTitle}>Order Summary</h2>

            <div className={styles.slotSection}>
              <div className={styles.slotHeader}>
                <span>Order Slots</span>
                <span className={
                  overLimit ? styles.slotCountOver
                  : totalQty === MAX_ORDER_QTY ? styles.slotCountFull
                  : styles.slotCount
                }>
                  {totalQty} / {MAX_ORDER_QTY}
                </span>
              </div>
              <div className={styles.slotTrack}>
                {Array.from({ length: MAX_ORDER_QTY }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`${styles.slotSeg} ${
                      idx < slotsUsed
                        ? overLimit ? styles.slotOver : styles.slotFilled
                        : ''
                    }`}
                  />
                ))}
              </div>
              <p className={overLimit ? styles.slotMsgOver : styles.slotMsg}>
                {overLimit
                  ? `${totalQty - MAX_ORDER_QTY} item${totalQty - MAX_ORDER_QTY > 1 ? 's' : ''} over limit — remove to proceed`
                  : totalQty === MAX_ORDER_QTY
                  ? 'Order is full'
                  : `${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining`}
              </p>
            </div>

            <div className={styles.summaryDivider} />

            <div className={`${styles.summaryRow} ${styles.totalItems}`}>
              <span>Total Items:</span>
              <span>{totalQty}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.totalAmount}`}>
              <span>Total Amount:</span>
              <span className={styles.amount}>₱{optimisticTotal}</span>
            </div>

            <div className={styles.actions}>
              <button onClick={clearCart} className={styles.clearButton}>
                Clear Cart
              </button>
              <button
                onClick={handleCheckout}
                disabled={loading || overLimit}
                className={styles.checkoutButton}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>

            <p className={styles.disclaimer}>Max {MAX_ORDER_QTY} items per order</p>
          </div>
        </div>
      ) : (
        <div className={styles.emptyCart}>
          <div className={styles.emptyIcon}>
            <MdOutlineRemoveShoppingCart size={70} color={'gray'} />
          </div>
          <h2>Your Cart is Empty</h2>
          <p>Looks like you haven't added any items to your cart yet.<br />Start adding an item to fill it up!</p>
          <button onClick={() => navigate('/shop')}>View Items</button>
        </div>
      )}
    </div>
  );
};

export default Cart;