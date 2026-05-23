import React from 'react';
import styles from '../styles/loadingscreen.module.scss';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.spinner}></div>
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;