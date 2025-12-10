import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { BrowserType } from '../../../types/testcases';
import './InstallBrowserModal.css';

interface InstallBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (browsers: string[]) => Promise<void>;
  defaultBrowserType?: string | null;
  isInstalling?: boolean;
  installProgress?: {
    browser: string;
    progress: number;
    status: string;
  } | null;
}

// Map browser type to playwright browser name for installation
const mapBrowserTypeToPlaywright = (browserType: string): string => {
  const normalized = browserType.toLowerCase();
  switch (normalized) {
    case 'chrome':
      return 'chromium';
    case 'edge':
      return 'msedge'; // Edge uses custom installation
    case 'firefox':
      return 'firefox';
    case 'safari':
      return 'webkit';
    default:
      return 'chromium';
  }
};

type SupportedPlatform = 'win32' | 'darwin' | 'linux';

const ALL_BROWSERS = [
  { value: BrowserType.chrome, label: 'Chrome', playwrightName: 'chromium', supportedPlatforms: ['win32', 'darwin', 'linux'] as SupportedPlatform[] },
  { value: BrowserType.edge, label: 'Edge', playwrightName: 'msedge', supportedPlatforms: ['win32', 'darwin', 'linux'] as SupportedPlatform[] },
  { value: BrowserType.firefox, label: 'Firefox', playwrightName: 'firefox', supportedPlatforms: ['win32', 'darwin', 'linux'] as SupportedPlatform[] },
  { value: BrowserType.safari, label: 'Safari', playwrightName: 'webkit', supportedPlatforms: ['darwin'] as SupportedPlatform[] },
];

const InstallBrowserModal: React.FC<InstallBrowserModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  defaultBrowserType,
  isInstalling = false,
  installProgress = null,
}) => {
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>([]);
  const [installedBrowsers, setInstalledBrowsers] = useState<Set<string>>(new Set());
  const [installError, setInstallError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get current platform
  const systemPlatformRaw = (window as any).electronAPI?.system?.platform || process?.platform || 'linux';
  const normalizedPlatform: SupportedPlatform = useMemo(() => {
    return ['win32', 'darwin', 'linux'].includes(systemPlatformRaw)
      ? (systemPlatformRaw as SupportedPlatform)
      : 'linux';
  }, [systemPlatformRaw]);

  // Filter browsers based on platform support
  const availableBrowsers = useMemo(() => {
    return ALL_BROWSERS.filter(browser => 
      browser.supportedPlatforms.includes(normalizedPlatform)
    );
  }, [normalizedPlatform]);

  // Check which browsers are already installed
  useEffect(() => {
    if (isOpen) {
      const checkInstalledBrowsers = async () => {
        try {
          const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;
          if (!playwrightAPI) {
            return;
          }

          // Check only supported browser types for current platform
          const browserTypes = availableBrowsers.map(b => b.value);
          const result = await playwrightAPI.checkBrowsers(browserTypes);
          
          if (result?.success && result?.data) {
            const installed = new Set<string>();
            Object.entries(result.data).forEach(([browserType, isInstalled]) => {
              if (isInstalled) {
                installed.add(browserType);
              }
            });
            setInstalledBrowsers(installed);
          }
        } catch (err) {
          console.error('[InstallBrowserModal] Error checking installed browsers:', err);
        }
      };
      
      checkInstalledBrowsers();
    }
  }, [isOpen, availableBrowsers]);

  // Set default browser based on browser_type
  useEffect(() => {
    if (isOpen && defaultBrowserType) {
      const defaultBrowser = availableBrowsers.find(b => b.value === defaultBrowserType);
      if (defaultBrowser && !installedBrowsers.has(defaultBrowser.value) && !selectedBrowsers.includes(defaultBrowser.value)) {
        setSelectedBrowsers([defaultBrowser.value]);
      }
    } else if (isOpen && !defaultBrowserType) {
      // If no default, select first available browser
      const firstAvailable = availableBrowsers.find(b => !installedBrowsers.has(b.value));
      if (firstAvailable && selectedBrowsers.length === 0) {
        setSelectedBrowsers([firstAvailable.value]);
      }
    }
  }, [isOpen, defaultBrowserType, installedBrowsers, availableBrowsers, selectedBrowsers]);

  const handleBrowserToggle = (browserValue: string) => {
    setSelectedBrowsers(prev => {
      if (prev.includes(browserValue)) {
        return prev.filter(b => b !== browserValue);
      } else {
        return [...prev, browserValue];
      }
    });
  };

  const handleInstall = useCallback(async () => {
    if (selectedBrowsers.length === 0) return;
    setInstallError(null);
    
    // Map browser types to playwright browser names
    // Group by playwright name to avoid installing same browser multiple times
    const playwrightBrowsers = new Set<string>();
    selectedBrowsers.forEach(browserType => {
      const browser = availableBrowsers.find(b => b.value === browserType);
      if (browser) {
        playwrightBrowsers.add(browser.playwrightName);
      }
    });
    
    try {
      await onInstall(Array.from(playwrightBrowsers));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install browsers';
      console.error('[InstallBrowserModal] Install error:', error);
      setInstallError(message);
    }
  }, [selectedBrowsers, onInstall]);

  const handleClose = useCallback(() => {
    if (!isInstalling) {
      setSelectedBrowsers([]);
      setInstallError(null);
      onClose();
    }
  }, [isInstalling, onClose]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isInstalling) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isInstalling, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="install-browser-modal-overlay">
      <div 
        className="install-browser-modal-container" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
      >
        {/* Header */}
        <div className="install-browser-modal-header">
          <h2 className="install-browser-modal-title">
            {isInstalling ? 'Installing Browsers' : 'Install Playwright Browsers'}
          </h2>
          {!isInstalling && (
            <button className="install-browser-modal-close-btn" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Instructions */}
        {!isInstalling && (
          <p className="install-browser-modal-instructions">
            Select the browsers you want to install. Required browsers will be pre-selected.
          </p>
        )}
        {!isInstalling && installError && (
          <div className="install-browser-error-message">
            {installError}
          </div>
        )}

        {/* Content */}
        <div className="install-browser-modal-content">
          {isInstalling ? (
            <div className="install-browser-progress-section">
              <div className="install-browser-spinner-container">
                <div className="install-browser-spinner"></div>
              </div>
              {installProgress && (
                <>
                  <div className="install-browser-progress-header">
                    <span className="install-browser-progress-browser">
                      Installing {installProgress.browser}...
                    </span>
                    <span className="install-browser-progress-percent">
                      {Math.round(installProgress.progress)}%
                    </span>
                  </div>
                  <div className="install-browser-progress-bar-container">
                    <div 
                      className="install-browser-progress-bar"
                      style={{ width: `${installProgress.progress}%` }}
                    />
                  </div>
                  
                </>
              )}
              {!installProgress && (
                <div className="install-browser-progress-status">
                  Preparing installation...
                </div>
              )}
              <div className="install-browser-warning-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Please do not close the application while downloading browser.
              </div>
            </div>
          ) : (
            <div className="install-browser-selection-section">
              {availableBrowsers.map(browser => {
                // Skip browsers that are already installed
                if (installedBrowsers.has(browser.value)) {
                  return null;
                }
                
                return (
                  <label 
                    key={browser.value}
                    className={`install-browser-checkbox-label ${
                      selectedBrowsers.includes(browser.value) ? 'checked' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrowsers.includes(browser.value)}
                      onChange={() => handleBrowserToggle(browser.value)}
                      className="install-browser-checkbox"
                    />
                    <span className="install-browser-checkbox-custom" />
                    <span className="install-browser-checkbox-text">{browser.label}</span>
                  </label>
                );
              })}
              {availableBrowsers.length === 0 && (
                <div className="install-browser-all-installed">
                  <p>No browsers available for this platform.</p>
                </div>
              )}
              {availableBrowsers.length > 0 && availableBrowsers.every(b => installedBrowsers.has(b.value)) && (
                <div className="install-browser-all-installed">
                  <p>All available browsers are already installed!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isInstalling && (
          <div className="install-browser-modal-actions">
            <button 
              type="button" 
              className="install-browser-btn-cancel" 
              onClick={handleClose}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="install-browser-btn-install"
              onClick={handleInstall}
              disabled={selectedBrowsers.length === 0}
            >
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallBrowserModal;

