import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

const VITE_API_URL = import.meta.env.VITE_API_URL;

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const fetchCart = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setCart(null);
      setInitialized(true);
      return;
    }
    
    try {
      const response = await axios.get(`${VITE_API_URL}/api/core/cart/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
      setInitialized(true);
    } catch (error) {
      setCart(null);
      setInitialized(true);
    }
  }; 

  const addToCart = async (itemId, quantity = 1, itemSizeId = null) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const payload = {
        item_id: itemId,
        quantity: quantity
      };

      if (itemSizeId) {
        payload.item_size_id = itemSizeId;
      }

      const response = await axios.post(
        `${VITE_API_URL}/api/core/cart/add_item/`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCart(response.data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to add item' 
      };
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (cartItemId, quantity) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken'); 
      const response = await axios.patch(
        `${VITE_API_URL}/api/core/cart/update_item/`,
        { cart_item_id: cartItemId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Cart item updated:', response.data);
      setCart(response.data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to update item' 
      };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartItemId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.delete(
        `${VITE_API_URL}/api/core/cart/remove_item/`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          data: { cart_item_id: cartItemId }
        }
      );
      setCart(response.data);
      return { success: true };
    } catch (error) {
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken'); 
      const response = await axios.delete(
        `${VITE_API_URL}/api/core/cart/clear/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCart(response.data);
      return { success: true };
    } catch (error) {
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const cartItemsCount = cart?.total_items || 0;

  useEffect(() => {    
    const timer = setTimeout(() => {
      const token = localStorage.getItem('accessToken'); 
      
      if (token) {
        fetchCart();
      } else {
        setInitialized(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        cartItemsCount,
        initialized,
        fetchCart,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
