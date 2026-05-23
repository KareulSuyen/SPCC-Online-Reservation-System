import styles from '../styles/notfound.module.scss';
import { BiError } from "react-icons/bi";
import { NavLink } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.errorIcon}>
                    <BiError />
                </div>
                <h1 className={styles.errorCode}>404</h1>
                <h2 className={styles.title}>Page Not Found</h2>
                <p className={styles.description}>
                    The page you're looking for doesn't exist or has been moved.
                    Please check the URL or return to the dashboard.
                </p>
                
                <div className={styles.illustration}>
                    <div className={styles.circle}></div>
                    <div className={styles.circle}></div>
                    <div className={styles.circle}></div>
                </div>

                <div className={styles.actions}>
                        <NavLink to='/dashboard'>
                            <button className={styles.primaryButton}>
                                Take me home
                            </button>
                        </NavLink>
                    <button 
                        onClick={() => window.history.back()} 
                        className={styles.secondaryButton}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
