import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { IoClose } from 'react-icons/io5';
import { MdDashboard, MdShoppingCart } from 'react-icons/md';
import { FaClipboardList } from 'react-icons/fa';
import sidebarstyle from '../styles/sidebar.module.scss';
import { FaShop } from "react-icons/fa6";
import spcclogo from '../../public/images/spcc-logo.png';

const Sidebar = ({ toggleSidebar, isSidebarOpen }) => {
  const { theme, toggleTheme } = useTheme();
    useEffect(() => {
    if (isSidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isSidebarOpen]);
  
  return (
    <>
      {isSidebarOpen && (
        <div 
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
            animation: 'fadeIn 0.3s ease',
            cursor: 'pointer'
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
      
      <aside className={`${sidebarstyle.sidebar} ${isSidebarOpen ? sidebarstyle.open : sidebarstyle.closed}`}>
        <div className={sidebarstyle['sidebar-header']}>
          <img src={spcclogo} alt="SPCC Logo" />
          <span>
            <h2>SPCC-ORS</h2>
          </span>
          <button onClick={toggleSidebar} className={sidebarstyle['close-btn']} aria-label="Close sidebar">
            <IoClose />
          </button>
        </div>

        <nav className={sidebarstyle['sidebar-links']}>
          <NavLink to="/dashboard" onClick={toggleSidebar}>
            <MdDashboard />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/shop" onClick={toggleSidebar}>
            <FaShop />
            <span>Products</span>
          </NavLink>
          <NavLink to="/cart" onClick={toggleSidebar}>
            <MdShoppingCart />
            <span>My Cart</span>
          </NavLink>
          <NavLink to="/orders" onClick={toggleSidebar} className={sidebarstyle.orders}>
            <FaClipboardList />
            <span>My Orders</span>
          </NavLink>
        </nav>
        
        <div className={sidebarstyle['sidebar-footer']}>
          © {new Date().getFullYear()} 
          <span>
            &nbsp;
            <a href="https://spcc.edu.ph" target='_blank' rel="noopener noreferrer">
              Systems Plus Computer College
            </a>
          </span>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
