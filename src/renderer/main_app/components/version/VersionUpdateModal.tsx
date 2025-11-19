import React from 'react';
import './VersionUpdateModal.css';

interface VersionUpdateModalProps {
  isOpen: boolean;
  currentVersion: string;
  latestVersion: string;
  onClose: () => void;
  onDownload: () => void;
}

const VersionUpdateModal: React.FC<VersionUpdateModalProps> = ({
  isOpen,
  currentVersion,
  latestVersion,
  onClose,
  onDownload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="version-update-overlay" onClick={onClose}>
      <div className="version-update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="version-update-header">
          <h2 className="version-update-title">
            <span className="version-update-icon">⚠️</span>
            New Version Available
          </h2>
          <button 
            className="version-update-close-btn" 
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="version-update-content">
          <div className="version-update-info">
            <p className="version-update-text">
              You are currently using version <strong>{currentVersion}</strong>
            </p>
            <p className="version-update-text">
              Latest version: <strong className="version-latest">{latestVersion}</strong>
            </p>
            <div className="version-update-warning">
              <p className="version-update-warning-text">
                ⚠️ Warning: Using an outdated version may cause errors and compatibility issues. 
                We recommend updating to the latest version for the best experience.
              </p>
            </div>
          </div>
        </div>

        <div className="version-update-footer">
          <button 
            className="version-update-btn-secondary" 
            onClick={onClose}
          >
            Later
          </button>
          <button 
            className="version-update-btn-primary" 
            onClick={onDownload}
          >
            Download New Version
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionUpdateModal;

