import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import styles from '../styles/shop.module.scss';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const Shop = () => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const { addToCart, loading: cartLoading } = useCart();
  const { theme } = useTheme();
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedSizes, setSelectedSizes] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [shakingItem, setShakingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchItems();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${VITE_API_URL}/api/core/categories/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    setSearching(true);
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      let url = `${VITE_API_URL}/api/core/items/?`;
      
      if (selectedCategory) {
        url += `category=${selectedCategory}&`;
      }
      
      if (searchQuery.trim()) {
        url += `search=${searchQuery.trim()}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let filteredItems = response.data;
      
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        filteredItems = response.data.filter(item => 
          item.name.toLowerCase().includes(query) ||
          item.category_name.toLowerCase().includes(query)
        );
      }
      
      setItems(filteredItems);
      
      if (searchQuery.trim() && filteredItems.length > 0) {
        const uniqueNames = [...new Set(filteredItems.map(item => item.name))];
        setSuggestions(uniqueNames.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    } finally {
      setLoading(false);
      setTimeout(() => setSearching(false), 300);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const handleSizeChange = (itemId, sizeId) => {
    setSelectedSizes(prev => ({
      ...prev,
      [itemId]: sizeId
    }));
  };

  const handleAddToCart = async (item) => {
    if (item.has_sizes) {
      if (!selectedSizes[item.id]) {
        setShakingItem(item.id);
        setTimeout(() => setShakingItem(null), 2000);
        
        setMessage({ type: 'error', text: 'Please select a size first!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        return;
      }
    }

    const result = await addToCart(item.id, 1, selectedSizes[item.id]);
    if (result.success) {
      const displayName = item.has_sizes 
        ? `${item.name} - ${item.sizes.find(s => s.id === parseInt(selectedSizes[item.id]))?.size}`
        : item.name;
      setMessage({ type: 'success', text: `✓ ${displayName} added to cart!` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: result.error });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    return `${VITE_API_URL}${imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl}`;
  };

  const getAvailableStock = (item) => {
    if (item.has_sizes) {
      const selectedSize = selectedSizes[item.id];
      if (selectedSize) {
        const size = item.sizes.find(s => s.id === parseInt(selectedSize));
        return size ? size.stock_quantity : 0;
      }
      return item.sizes.reduce((total, size) => total + (size.is_available ? size.stock_quantity : 0), 0);
    }
    return item.stock_quantity || 0;
  };

  const getCurrentPrice = (item) => {
    if (item.has_sizes) {
      if (!selectedSizes[item.id]) {
        return null;
      }
      const size = item.sizes.find(s => s.id === parseInt(selectedSizes[item.id]));
      return size ? parseFloat(size.price) : null;
    }
    return parseFloat(item.price || 0);
  };

  const isItemAvailable = (item) => {
    if (item.has_sizes) {
      if (!selectedSizes[item.id]) {
        return item.sizes.some(s => s.is_available && s.stock_quantity > 0);
      }
      const size = item.sizes.find(s => s.id === parseInt(selectedSizes[item.id]));
      return size && size.is_available && size.stock_quantity > 0;
    }
    return item.is_available && item.stock_quantity > 0;
  };

  const getStockDisplay = (item) => {
    if (item.has_sizes && !selectedSizes[item.id]) {
      return 'Pick a size first';
    }
    const stock = getAvailableStock(item);
    return stock > 0 ? `${stock} in stock` : 'Out of stock';
  };

  const getPriceDisplay = (item) => {
    if (item.has_sizes && !selectedSizes[item.id]) {
      return 'Pick a size first';
    }
    const price = getCurrentPrice(item);
    return price !== null ? `₱${price.toFixed(2)}` : 'Pick a size first';
  };

  const truncateName = (name, maxLength = 50) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  const getSizeOrder = (sizeName) => {
    const sizeMap = {
      'xs': 1, 'extra small': 1,
      's': 2, 'small': 2,
      'm': 3, 'medium': 3,
      'l': 4, 'large': 4,
      'xl': 5, 'extra large': 5,
      'xxl': 6, '2xl': 6,
      'xxxl': 7, '3xl': 7
    };
    const normalized = sizeName.toLowerCase().trim();
    return sizeMap[normalized] || 999;
  };

  const sortSizes = (sizes) => {
    return [...sizes].sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      if (priceA !== priceB) {
        return priceA - priceB;
      }
      return getSizeOrder(a.size) - getSizeOrder(b.size);
    });
  };

  return (
    <div className={styles.shopContainer}>
      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.filterSection}>
        <div className={styles.searchBar} ref={searchRef}>
          <div className={styles.searchInputWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery && setShowSuggestions(true)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className={styles.clearButton}
              >
                ✕
              </button>
            )}
            {searching && <div className={styles.searchSpinner}></div>}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.suggestions}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={styles.suggestionItem}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <svg className={styles.suggestionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.categoryFilter}>
          <label htmlFor="category">Category:</label>
          <select 
            id="category"
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loader}></div>
          <p className={styles.loadingText}>Loading items...</p>
        </div>
      ) : (
        <div className={`${styles.itemsGrid} ${searching ? styles.searching : ''}`}>
          {items.map(item => (
            <div 
              key={item.id} 
              className={`${styles.itemCard} ${shakingItem === item.id ? styles.shake : ''}`}
            >
              {item.image && (
                <div 
                  className={styles.imageWrapper}
                  onClick={() => handleItemClick(item)}
                >
                  <img 
                    src={getImageUrl(item.image)}
                    alt={item.name || 'Item'}
                    className={styles.itemImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className={styles.zoomOverlay}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                      <line x1="11" y1="8" x2="11" y2="14"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                  </div>
                </div>
              )}
              
              <h3 
                className={styles.itemName}
                onClick={() => handleItemClick(item)}
                title={item.name}
              >
                {truncateName(item.name)}
              </h3>
              
              <div className={`${styles.sizeSelector} ${shakingItem === item.id && item.has_sizes && !selectedSizes[item.id] ? styles.highlight : ''}`}>
                <label htmlFor={`size-${item.id}`}>
                  {item.has_sizes ? 'Select Size: *' : 'Size:'}
                </label>
                {item.has_sizes ? (
                  <select
                    id={`size-${item.id}`}
                    value={selectedSizes[item.id] || ''}
                    onChange={(e) => handleSizeChange(item.id, e.target.value)}
                    className={styles.sizeSelect}
                  >
                    <option value="">Choose a size</option>
                    {sortSizes(item.sizes.filter(s => s.is_available)).map(size => (
                      <option key={size.id} value={size.id}>
                        {size.size} - ₱{parseFloat(size.price).toFixed(2)} ({size.stock_quantity} available)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className={styles.noSizes}>No size options available</div>
                )}
              </div>
              
              <div className={styles.priceSection}>
                <p className={styles.price}>
                  {getPriceDisplay(item)}
                </p>
                <p className={`${styles.stock} ${
                  item.has_sizes && !selectedSizes[item.id] 
                    ? styles.selectSize 
                    : getAvailableStock(item) > 0 
                      ? styles.inStock 
                      : styles.outOfStock
                }`}>
                  {getStockDisplay(item)}
                </p>
              </div>
              
              <button
                onClick={() => handleAddToCart(item)}
                disabled={!isItemAvailable(item) || cartLoading}
                className={styles.addButton}
              >
                {cartLoading ? 'Adding...' : 'Add to Cart'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="11" y1="16" x2="11.01" y2="16"></line>
          </svg>
          <h3>No Items Found</h3>
          <p>
            {searchQuery.trim() 
              ? `No results for "${searchQuery.trim()}". Try different keywords.`
              : selectedCategory
              ? 'No items available in this category.'
              : 'No items available at the moment.'}
          </p>
          {searchQuery.trim() && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className={styles.clearSearchButton}
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {showModal && selectedItem && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeModal}>
              ✕
            </button>
            
            <div className={styles.modalGrid}>
              <div className={styles.modalImageSection}>
                {selectedItem.image && (
                  <img 
                    src={getImageUrl(selectedItem.image)}
                    alt={selectedItem.name || 'Item'}
                    className={styles.modalImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
              </div>
              
              <div className={styles.modalDetails}>
                <h2 className={styles.modalTitle}>{selectedItem.name}</h2>
                
                <div className={styles.modalCategory}>
                  <span className={styles.categoryBadge}>{selectedItem.category_name}</span>
                </div>

                {selectedItem.description && (
                  <p className={styles.modalDescription}>{selectedItem.description}</p>
                )}
                
                <div className={`${styles.sizeSelector} ${shakingItem === selectedItem.id && selectedItem.has_sizes && !selectedSizes[selectedItem.id] ? styles.highlight : ''}`}>
                  <label htmlFor={`modal-size-${selectedItem.id}`}>
                    {selectedItem.has_sizes ? 'Select Size: *' : 'Size:'}
                  </label>
                  {selectedItem.has_sizes ? (
                    <select
                      id={`modal-size-${selectedItem.id}`}
                      value={selectedSizes[selectedItem.id] || ''}
                      onChange={(e) => handleSizeChange(selectedItem.id, e.target.value)}
                      className={styles.sizeSelect}
                    >
                      <option value="">Choose a size</option>
                      {sortSizes(selectedItem.sizes.filter(s => s.is_available)).map(size => (
                        <option key={size.id} value={size.id}>
                          {size.size} - ₱{parseFloat(size.price).toFixed(2)} ({size.stock_quantity} available)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={styles.noSizes}>No size options available</div>
                  )}
                </div>
                
                <div className={styles.modalPriceSection}>
                  <p className={styles.modalPrice}>
                    {getPriceDisplay(selectedItem)}
                  </p>
                  <p className={`${styles.stock} ${
                    selectedItem.has_sizes && !selectedSizes[selectedItem.id] 
                      ? styles.selectSize 
                      : getAvailableStock(selectedItem) > 0 
                        ? styles.inStock 
                        : styles.outOfStock
                  }`}>
                    {getStockDisplay(selectedItem)}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    handleAddToCart(selectedItem);
                    if (isItemAvailable(selectedItem) && (!selectedItem.has_sizes || selectedSizes[selectedItem.id])) {
                      closeModal();
                    }
                  }}
                  disabled={!isItemAvailable(selectedItem) || cartLoading}
                  className={styles.modalAddButton}
                >
                  {cartLoading ? 'Adding...' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;