import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Profile from '../components/Profile';
import Ai from '../components/Ai';

const ProtectedLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  
  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <div>
      <Navbar 
        onProfileClick={toggleProfile}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      
      <div>
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
        />
        
        <main>
          <Outlet />
        </main>
      </div>

      <Profile 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <Ai />
    </div>
  );
};

export default ProtectedLayout;