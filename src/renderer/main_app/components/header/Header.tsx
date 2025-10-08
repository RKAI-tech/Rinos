import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/auth';
import './Header.css';
import image from '../../assets/logo_user.png';
const Header: React.FC = () => {
  const { logout, isLoading } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const resp = await authService.getCurrentUser();
        if (mounted && resp.success && (resp as any).data) {
          const email = (resp as any).data.email || '';
          setUserEmail(email);
        }
      } catch (e) {
        // silent fail; keep placeholder
      }
    })();
    return () => { mounted = false; };
  }, []);

  const userEmailShort = useMemo(() => {
    if (!userEmail) return '';
    return userEmail.length > 16 ? `${userEmail.slice(0, 14)}...` : userEmail;
  }, [userEmail]);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserDropdown(false);
    } catch (error) {
      // console.error('Logout failed:', error);
    }
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  return (
    <header className="header">
      <div className="header-content">
        {/* Left side - App Logo */}
        <div className="header-left">
          <div className="app-logo">
            <span className="logo-text">Automation Test Execution</span>
          </div>
        </div>

        {/* Right side - User Profile */}
        <div className="header-right">
          <div className="user-profile" onClick={toggleUserDropdown}>
            <div className="user-avatar">
              <img 
                src={image} 
                alt="User Avatar" 
                className="avatar-image"
              />
            </div>
            <div className="user-info">
              <div className="user-email-short">{userEmailShort || '...'}</div>
              <div className="user-email-full">{userEmail || '...'}</div>
            </div>
            <div className="dropdown-chevron">
              <svg 
                width="12" 
                height="12" 
                viewBox="0 0 12 12" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className={`chevron-icon ${showUserDropdown ? 'rotated' : ''}`}
              >
                <path 
                  d="M3 4.5L6 7.5L9 4.5" 
                  stroke="#9CA3AF" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* User Dropdown Menu */}
          {showUserDropdown && (
            <div className="user-dropdown">
              <div 
                className={`dropdown-item ${isLoading ? 'disabled' : ''}`} 
                onClick={isLoading ? undefined : handleLogout}
              >
                
                <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
