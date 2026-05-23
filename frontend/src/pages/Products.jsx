import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../styles/products.module.scss';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${VITE_API_URL}/api/core/items/`);
        setProducts(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch products:', err);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!products.length) return;
    
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrent(curr => (curr + 1) % products.length);
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [products]);

  const goToSlide = (index) => {
    setCurrent(index);
    setProgress(0);
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev + 1) % products.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setCurrent((prev) => (prev - 1 + products.length) % products.length);
    setProgress(0);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingContent}>
          <p>No products available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <button 
            className={styles.homeBtn}
            onClick={() => window.location.href = '/introduction'}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          
          <div className={styles.counter}>
            {current + 1} / {products.length}
          </div>
        </div>

        <div className={styles.slideshowContainer}>
          <div className={styles.slideshowInner}>
            {products.map((product, index) => (
              <div
                key={product.id}
                className={`${styles.slide} ${index === current ? styles.slideActive : ''}`}
              >
                {product.image ? (
                  <img 
                    src={product.image.startsWith('http') ? product.image : `${VITE_API_URL}${product.image}`}
                    alt={product.name}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    <div className={styles.placeholderContent}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p>No Image Available</p>
                    </div>
                  </div>
                )}
                
                <div className={styles.overlay}></div>
                
                <div className={styles.content}>
                  <h2>{product.name}</h2>
                  {product.description && (
                    <p>{product.description}</p>
                  )}
                  
                  <button 
                    className={styles.reserveBtn}
                    onClick={() => window.location.href = '/login'}
                  >
                    <span>
                      Reserve Now
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>

                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill}
                    style={{ width: index === current ? `${progress}%` : '0%' }}
                  ></div>
                </div>
              </div>
            ))}

            <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={prevSlide}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={nextSlide}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.dotIndicators}>
          {products.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={index === current ? styles.dotActive : ''}
            ></button>
          ))}
        </div>

        <div className={styles.thumbnails}>
          {products.map((product, index) => (
            <button
              key={product.id}
              onClick={() => goToSlide(index)}
              className={index === current ? styles.thumbnailActive : ''}
            >
              {product.image ? (
                <img 
                  src={product.image.startsWith('http') ? product.image : `${VITE_API_URL}${product.image}`}
                  alt={product.name}
                />
              ) : (
                <div className={styles.thumbnailPlaceholder}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className={styles.thumbnailOverlay}>
                <p>{product.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Products;