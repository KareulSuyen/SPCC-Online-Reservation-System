import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      // Body theme.
      document.documentElement.style.setProperty('--body-bg', '#1a1d23');
      
      // NavBar theme.
      document.documentElement.style.setProperty('--nav-bg', '#1a1d23');
      document.documentElement.style.setProperty('--nav-borderBottom', 'rgb(49, 40, 29)');
      
      // Border theme.
      document.documentElement.style.setProperty('--nav-borderBottom', 'rgba(39, 38, 38, 1)');
      document.documentElement.style.setProperty('--order-border', 'rgba(30, 30, 30, 1)');
      document.documentElement.style.setProperty('--statcard-border', 'rgba(49, 49, 49, 1)');
      
      // Sidebar theme
      document.documentElement.style.setProperty('--sidebar-hoverlink', '#ffff');
      document.documentElement.style.setProperty('--sidebar-hovercolor', '#000000ff');
      document.documentElement.style.setProperty('--sidebar-bg', '#161616ff');
      document.documentElement.style.setProperty('--sidebar-border', 'rgba(68, 68, 68, 1)');
      document.documentElement.style.setProperty('--sidebar-linkColor', 'white');
      document.documentElement.style.setProperty('--sidebar-linkHover',  'rgba(151, 191, 247, 1)');
      document.documentElement.style.setProperty('--footer-color',  'rgba(202, 202, 202, 1)');
      document.documentElement.style.setProperty('--footer-hover',  'rgba(181, 170, 254, 1)');
      document.documentElement.style.setProperty('--sidebar-HoverLine',  'rgb(113, 113, 113)');
      
      // Order_status theme
      document.documentElement.style.setProperty('--order-textColor', '#d5d5d5ff');
      document.documentElement.style.setProperty('--order-amountColor', '#e4e2e2ff');
      document.documentElement.style.setProperty('--order-itemBg', '#262626ff');
      document.documentElement.style.setProperty('--item-bgcolor', '#252525ff');
      document.documentElement.style.setProperty('--school-statusBG', '#2c2f33');
      
      // Mobile only alert theme
      document.documentElement.style.setProperty('--mobileonly-alertbg', '#252525ff');
      
      // Profile Theme
      document.documentElement.style.setProperty('--profile-header', '#151515ff');
      document.documentElement.style.setProperty('--profile-bg', '#151515ff');
      document.documentElement.style.setProperty('--profile-switch', '#3f3f3fff');
      document.documentElement.style.setProperty('--profile-appearance', '#000000ff');
      
      // Ai theme
      document.documentElement.style.setProperty('--ai-border', 'rgba(151, 151, 151, 1)');
      document.documentElement.style.setProperty('--ai-color', 'rgba(255, 255, 255, 1)');
      document.documentElement.style.setProperty('--ai-bg', 'rgba(79, 79, 79, 1)');
      document.documentElement.style.setProperty('--profile-switch', '#151515ff');
      document.documentElement.style.setProperty('--ai-chatbg', '#151515ff');      
      document.documentElement.style.setProperty('--ai-chatcolor', 'rgb(255, 255, 255)');      

      // Core theme
      document.documentElement.style.setProperty('--text-primary', '#ffffff');
      document.documentElement.style.setProperty('--text-secondary', '#cccccc');
      document.documentElement.style.setProperty('--primary-color', '#4a90e2');
      document.documentElement.style.setProperty('--primary-light', '#357abd');
      document.documentElement.style.setProperty('--border-color', '#333333');
      document.documentElement.style.setProperty('--card-bg', '#2c2f33');
      document.documentElement.style.setProperty('--order-bg', '#2c2f33');
      document.documentElement.style.setProperty('--order-bg', 'linear-gradient(120deg, rgba(27, 26, 26, 1), rgba(31, 31, 31, 1)');
      document.documentElement.style.setProperty('--order-primary', 'white');
      document.documentElement.style.setProperty('--order-secondary', 'rgba(185, 185, 185, 1)');
      document.documentElement.style.setProperty('--schooldeg-primary', 'rgba(227, 227, 227, 1)');
      document.documentElement.style.setProperty('--noSize-txt', 'rgba(227, 227, 227, 1)');
      document.documentElement.style.setProperty('--itemPrice', 'rgba(51, 131, 206, 1)');

    } else {
      // Body theme.
      document.documentElement.style.setProperty('--body-bg', '#dbdbdbff');
      
      // NavBar theme.
      document.documentElement.style.setProperty('--nav-bg', 'rgb(1, 5, 67)');
      document.documentElement.style.setProperty('--nav-borderBottom', 'rgb(146, 112, 26)');
      
      // Border theme.
      document.documentElement.style.setProperty('--order-border', 'rgba(203, 203, 203, 1)');
      document.documentElement.style.setProperty('--statcard-border', '#574625ff');
      
      // Sidebar theme
      document.documentElement.style.setProperty('--sidebar-hoverlink', '#272727ff');
      document.documentElement.style.setProperty('--sidebar-hovercolor', '#ffffffff');
      document.documentElement.style.setProperty('--sidebar-bg', 'rgb(1, 5, 67)');
      document.documentElement.style.setProperty('--sidebar-border', 'rgba(175, 171, 159, 1)');
      document.documentElement.style.setProperty('--sidebar-linkColor',  'rgba(0, 0, 0, 1)');
      document.documentElement.style.setProperty('--sidebar-linkHover',  'rgba(0, 0, 0, 1)');
      document.documentElement.style.setProperty('--footer-color',  'rgba(0, 0, 0, 1)');
      document.documentElement.style.setProperty('--footer-hover',  'rgba(181, 170, 254, 1)');
      document.documentElement.style.setProperty('--sidebar-HoverLine',  'rgba(255, 255, 255, 1)');
      
      // Ai theme
      document.documentElement.style.setProperty('--ai-border', 'rgba(132, 132, 132, 1)');
      document.documentElement.style.setProperty('--ai-color', 'rgb(0, 0, 0)');
      document.documentElement.style.setProperty('--ai-bg', 'rgb(231, 231, 231)');
      document.documentElement.style.setProperty('--ai-chatbg', 'rgb(255, 255, 255)');
      document.documentElement.style.setProperty('--ai-chatcolor', 'rgb(0, 0, 0)');

      // Order_status theme
      document.documentElement.style.setProperty('--order-textColor', '#393939ff');
      document.documentElement.style.setProperty('--order-amountColor', '#252525ff');
      document.documentElement.style.setProperty('--order-itemBg', 'rgb(1, 5, 67)');
      document.documentElement.style.setProperty('--item-bgcolor', '#7c9be6ff');
      document.documentElement.style.setProperty('--school-statusBG', 'rgb(1, 5, 67)');
      document.documentElement.style.setProperty('--mobileonly-alertbg', '#ffffffff');
      
      // Profile theme
      document.documentElement.style.setProperty('--profile-header', 'rgb(1, 5, 67)');
      document.documentElement.style.setProperty('--profile-bg', '#ffffffff');
      document.documentElement.style.setProperty('--profile-switch', 'rgba(183, 139, 29, 1)');
      document.documentElement.style.setProperty('--profile-appearance', 'rgb(1, 5, 67)');
      
      // Core theme
      document.documentElement.style.setProperty('--text-primary', '#1c1b1bff');
      document.documentElement.style.setProperty('--text-secondary', '#313131ff');
      document.documentElement.style.setProperty('--primary-color', '#4a90e2');
      document.documentElement.style.setProperty('--primary-light', '#87ceeb');
      document.documentElement.style.setProperty('--border-color', '#8b8b8bff');
      document.documentElement.style.setProperty('--card-bg', 'rgb(1, 5, 67)');
      document.documentElement.style.setProperty('--order-bg', 'linear-gradient(60deg, rgba(244, 201, 92, 1),rgba(78, 115, 238, 1))');
      document.documentElement.style.setProperty('--order-primary', 'rgba(2, 10, 89, 1)');
      document.documentElement.style.setProperty('--order-secondary', 'rgba(0, 6, 71, 1)');
      document.documentElement.style.setProperty('--schooldeg-primary', 'rgb(59, 59, 69)');
      document.documentElement.style.setProperty('--noSize-txt', 'black');
      document.documentElement.style.setProperty('--itemPrice', 'rgba(29, 36, 103, 1)');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;