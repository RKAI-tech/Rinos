import React, { useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useVersion } from '../../contexts/VersionContext';
import BrowserManagerModal from '../browser/install_browser/BrowserManagerModal';
import ProfileModal from './ProfileModal';
import './Header.css';
import image from '../../assets/logo_user.png';
import rikkeiLogo from '../../assets/logoRikkeisoft.png';
const Header: React.FC = () => {
  const { logout, isLoading, userEmail, userUsername } = useAuth();
  const { currentVersion, hasUpdate, openVersionModal } = useVersion();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isBrowserManagerOpen, setIsBrowserManagerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Keep a conservative fallback: if username isn't available, derive from email prefix.
  const displayName = useMemo(() => {
    const trimmedUsername = (userUsername || '').trim();
    if (trimmedUsername) return trimmedUsername;
    const email = (userEmail || '').trim();
    if (!email) return '';
    return email.split('@')[0] || '';
  }, [userEmail, userUsername]);

  const displayNameShort = useMemo(() => {
    if (!displayName) return '';
    return displayName.length > 16 ? `${displayName.slice(0, 14)}...` : displayName;
  }, [displayName]);

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
            <img 
              src={rikkeiLogo} 
              alt="Rikkei Logo" 
              className="rikkei-logo"
            />
            <span className="logo-text">Rinos</span>
          </div>
        </div>

        {/* Right side - Version Badge & User Profile */}
        <div className="header-right">
          <button
            className={`version-pill ${hasUpdate ? 'version-pill--active' : ''}`}
            disabled={!hasUpdate}
            onClick={(e) => {
              e.stopPropagation();
              if (hasUpdate) {
                openVersionModal();
              }
            }}
          >
            <span className="version-pill-text">
              VERSION {currentVersion || '--'}
            </span>
            {hasUpdate && <span className="version-pill-indicator" aria-label="New version available" />}
          </button>
          <div className="user-profile" onClick={toggleUserDropdown}>
            <div className="user-avatar">
              <img 
                src={image} 
                alt="User Avatar" 
                className="avatar-image"
              />
            </div>
            <div className="user-info">
              <div className="user-email-short">{displayNameShort || '...'}</div>
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
                className="dropdown-item"
                onClick={() => {
                  setIsProfileOpen(true);
                  setShowUserDropdown(false);
                }}
              >
                <span>Profile</span>
              </div>
              <div className="dropdown-separator" />
              <div 
                className="dropdown-item" 
                onClick={() => {
                  setIsBrowserManagerOpen(true);
                  setShowUserDropdown(false);
                }}
              >
                <span>Browser Manager</span>
              </div>
              <div className="dropdown-separator" />
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

      {/* Browser Manager Modal */}
      <BrowserManagerModal
        isOpen={isBrowserManagerOpen}
        onClose={() => setIsBrowserManagerOpen(false)}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
};

export default Header;
