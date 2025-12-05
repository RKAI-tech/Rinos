import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import chromeLogo from '../../../assets/chrome_logo.png';
import edgeLogo from '../../../assets/edge_logo.png';
import firefoxLogo from '../../../assets/firefox_logo.jpeg';
import safariLogo from '../../../assets/safari_logo.png';
import './BrowserManagerModal.css';

type BrowserId = 'chrome' | 'edge' | 'firefox' | 'safari';
type BrowserIcon = 'chrome' | 'edge' | 'firefox' | 'safari';
type SupportedPlatform = 'win32' | 'darwin' | 'linux';

interface BrowserInfo {
  id: BrowserId;
  label: string;
  status: 'not-installed' | 'installed' | 'system';
  installSource: 'playwright' | 'custom' | 'system' | null;
  paths: string[];
  updatedAt?: string;
  note?: string;
}

interface BrowserManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_SOURCES: Record<BrowserIcon, string> = {
  chrome: chromeLogo,
  edge: edgeLogo,
  firefox: firefoxLogo,
  safari: safariLogo,
};

const BROWSER_DEFINITIONS: Array<{
  id: BrowserId;
  label: string;
  description: string;
  icon: BrowserIcon;
  supportedPlatforms: SupportedPlatform[];
}> = [
  {
    id: 'chrome',
    label: 'Google Chrome',
    description: 'Chromium build used for Chrome automation.',
    icon: 'chrome',
    supportedPlatforms: ['win32', 'darwin', 'linux'],
  },
  {
    id: 'edge',
    label: 'Microsoft Edge',
    description: 'Custom Edge build or system Edge (if available).',
    icon: 'edge',
    supportedPlatforms: ['win32', 'darwin', 'linux'],
  },
  {
    id: 'firefox',
    label: 'Mozilla Firefox',
    description: 'Playwright Firefox build for Gecko engine.',
    icon: 'firefox',
    supportedPlatforms: ['win32', 'darwin', 'linux'],
  },
  {
    id: 'safari',
    label: 'Apple Safari',
    description: 'WebKit automation engine (supported on macOS only).',
    icon: 'safari',
    supportedPlatforms: ['darwin'],
  },
];

const MAIN_TABS = [
  { id: 'explorer', label: 'Explorer' },
  { id: 'installed', label: 'Installed' },
];

const ACTION_COPY = {
  install: {
    title: 'Install Confirm',
    verb: 'install',
    cta: 'Install',
    variant: 'primary',
  },
  remove: {
    title: 'Remove Confirm',
    verb: 'remove',
    cta: 'Remove',
    variant: 'danger',
  },
  update: {
    title: 'Update Confirm',
    verb: 'update',
    cta: 'Update',
    variant: 'primary',
  },
} as const;

const BrowserManagerModal: React.FC<BrowserManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'explorer' | 'installed'>('explorer');
  const [browserInfoMap, setBrowserInfoMap] = useState<Record<BrowserId, BrowserInfo>>({} as any);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<{ browserId: BrowserId; type: 'install' | 'remove' | 'update' } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{ browserId: BrowserId; type: 'install' | 'remove' | 'update' } | null>(null);
  const [installProgress, setInstallProgress] = useState<{ browser: string; progress: number; status: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;

  const fetchBrowserInfo = useCallback(async () => {
    if (!playwrightAPI?.getBrowsersInfo) {
      setErrorMessage('Playwright API not available');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const response = await playwrightAPI.getBrowsersInfo();
      if (response?.success && Array.isArray(response.data)) {
        const baseMap = BROWSER_DEFINITIONS.reduce((acc, browser) => {
          acc[browser.id] = {
            id: browser.id,
            label: browser.label,
            status: 'not-installed',
            installSource: null,
            paths: [],
          };
          return acc;
        }, {} as Record<BrowserId, BrowserInfo>);
        response.data.forEach((info: BrowserInfo) => {
          const id = info.id as BrowserId;
          if (baseMap[id]) {
            baseMap[id] = { ...baseMap[id], ...info };
          }
        });
        setBrowserInfoMap(baseMap);
      } else {
        throw new Error(response?.error || 'Failed to fetch browser information');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch browser information';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [playwrightAPI]);

  useEffect(() => {
    if (isOpen) {
      fetchBrowserInfo();
    }
  }, [isOpen, fetchBrowserInfo]);

  useEffect(() => {
    if (!isOpen || !playwrightAPI?.onInstallProgress) return;
    const unsubscribe = playwrightAPI.onInstallProgress((progress: { browser: string; progress: number; status: string }) => {
      setInstallProgress(progress);
      // Clear progress when installation completes (100% or success message)
      if (progress.progress >= 100 || progress.status.toLowerCase().includes('success')) {
        setTimeout(() => {
          setInstallProgress(null);
        }, 1000);
      }
    });
    return () => {
      unsubscribe?.();
      setInstallProgress(null);
    };
  }, [isOpen, playwrightAPI]);

  const closeModal = () => {
    if (currentAction) return;
    onClose();
    setActiveTab('explorer');
    setInstallProgress(null);
  };

  const updateStateAfterAction = async (browserId: BrowserId, successMsg: string) => {
    await fetchBrowserInfo();
    toast.success(successMsg);
    setCurrentAction(null);
    setInstallProgress(null);
  };

  const updateStateAfterActionSilent = async (browserId: BrowserId) => {
    await fetchBrowserInfo();
    setCurrentAction(null);
    setInstallProgress(null);
  };

  const handleInstall = async (browserId: BrowserId) => {
    // Trên Windows, Edge mở link web thay vì cài đặt
    if (browserId === 'edge' && normalizedPlatform === 'win32') {
      try {
        const edgeDownloadUrl = 'https://www.microsoft.com/edge';
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.system?.openExternalUrl) {
          await electronAPI.system.openExternalUrl(edgeDownloadUrl);
          toast.info('Edge download page opened in your browser');
        } else {
          // Fallback: mở bằng window.open
          window.open(edgeDownloadUrl, '_blank');
          toast.info('Edge download page opened in your browser');
        }
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open Edge download page';
        toast.error(message);
        return;
      }
    }
    
    // Các browser khác hoặc Edge trên Mac/Linux: cài đặt bình thường
    if (!playwrightAPI?.installBrowsers) return;
    setCurrentAction({ browserId, type: 'install' });
    try {
      // Map browser ID to playwright browser name
      const mapBrowserToPlaywright = (id: BrowserId): string => {
        switch (id) {
          case 'chrome':
            return 'chromium';
          case 'edge':
            return 'edge'; // Edge uses custom installation on Mac/Linux
          case 'firefox':
            return 'firefox';
          case 'safari':
            return 'webkit';
          default:
            return 'chromium';
        }
      };
      const payload = [mapBrowserToPlaywright(browserId)];
      const result = await playwrightAPI.installBrowsers(payload);
      if (!result?.success) {
        throw new Error(result?.error || 'Installation failed');
      }
      await updateStateAfterAction(browserId, `${browserId.toUpperCase()} installed successfully.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to install browser';
      toast.error(message);
      setCurrentAction(null);
      setInstallProgress(null);
    }
  };

  const handleRemove = async (browserId: BrowserId, silent: boolean = false) => {
    if (!playwrightAPI?.removeBrowser) return;
    setCurrentAction({ browserId, type: 'remove' });
    try {
      const result = await playwrightAPI.removeBrowser(browserId);
      if (!result?.success) {
        throw new Error(result?.error || 'Removal failed');
      }
      if (silent) {
        await updateStateAfterActionSilent(browserId);
      } else {
        await updateStateAfterAction(browserId, `${browserId.toUpperCase()} removed successfully.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove browser';
      toast.error(message);
      setCurrentAction(null);
      setInstallProgress(null);
    }
  };

  const handleUpdate = async (browserId: BrowserId) => {
    setCurrentAction({ browserId, type: 'update' });
    try {
      // Remove silently (no toast)
      await handleRemove(browserId, true);
      // Install with toast on success
      await handleInstall(browserId);
    } catch (error) {
      // handleRemove/install already logged errors
      setCurrentAction(null);
      setInstallProgress(null);
    }
  };

  const systemPlatformRaw =
    (window as any).electronAPI?.system?.platform || process?.platform || 'linux';
  const normalizedPlatform: SupportedPlatform = ['win32', 'darwin', 'linux'].includes(systemPlatformRaw)
    ? (systemPlatformRaw as SupportedPlatform)
    : 'linux';

  const availableBrowsers = useMemo(
    () =>
      BROWSER_DEFINITIONS.filter((browser) => (browserInfoMap[browser.id]?.status ?? 'not-installed') === 'not-installed'),
    [browserInfoMap]
  );

  const installedBrowsers = useMemo(
    () =>
      BROWSER_DEFINITIONS.filter((browser) => (browserInfoMap[browser.id]?.status ?? 'not-installed') !== 'not-installed'),
    [browserInfoMap]
  );

  const openConfirmModal = (browserId: BrowserId, type: 'install' | 'remove' | 'update') => {
    setPendingConfirm({ browserId, type });
  };

  const closeConfirmModal = () => setPendingConfirm(null);

  const proceedConfirmedAction = () => {
    if (!pendingConfirm) return;
    const { browserId, type } = pendingConfirm;
    setPendingConfirm(null);
    if (type === 'install') {
      handleInstall(browserId);
    } else if (type === 'remove') {
      handleRemove(browserId);
    } else {
      handleUpdate(browserId);
    }
  };

  const getBrowserLabel = (browserId: BrowserId) =>
    BROWSER_DEFINITIONS.find((browser) => browser.id === browserId)?.label || browserId.toUpperCase();

  const getBrowserDescription = (browserId: BrowserId) =>
    BROWSER_DEFINITIONS.find((browser) => browser.id === browserId)?.description || '';

  if (!isOpen) return null;

  return (
    <div className="browser-manager-modal-overlay" onClick={closeModal}>
      <div className="browser-manager-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="browser-manager-modal-header">
          <div>
            <h2>Browser Manager</h2>
            <p>Install, update or remove browsers for automation.</p>
          </div>
          <button className="browser-manager-close-btn" onClick={closeModal} disabled={!!currentAction}>
            ✕
          </button>
        </div>

        <div className="browser-manager-tabs">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`browser-manager-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              disabled={isLoading && tab.id !== activeTab}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {errorMessage && (
          <div className="browser-manager-error">
            {errorMessage}
          </div>
        )}

        <div className="browser-manager-body">
          {activeTab === 'explorer' && (
            <div className="browser-grid">
              {availableBrowsers.length === 0 && (
                <div className="browser-empty-state">
                  All supported browsers are installed.
                </div>
              )}
              {availableBrowsers.map((browser) => (
                <div key={browser.id} className="browser-card">
                  <div className="browser-icon">
                    <img src={ICON_SOURCES[browser.icon]} alt={`${browser.label} logo`} />
                  </div>
                  <div className="browser-card-content">
                    <div className="browser-card-header">
                      <h3>{browser.label}</h3>
                      <span
                        className={`browser-status badge ${
                          browser.supportedPlatforms.includes(normalizedPlatform)
                            ? 'badge-neutral'
                            : 'badge-unavailable'
                        }`}
                      >
                        {browser.supportedPlatforms.includes(normalizedPlatform) ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                    <p>{browser.supportedPlatforms.includes(normalizedPlatform) ? browser.description: 'Not supported on this platform.'}</p>
                    <button
                      className="browser-action-btn primary"
                      onClick={() => openConfirmModal(browser.id, 'install')}
                      disabled={!!currentAction || !browser.supportedPlatforms.includes(normalizedPlatform)}
                    >
                      {browser.supportedPlatforms.includes(normalizedPlatform)
                        ? currentAction?.browserId === browser.id && currentAction.type === 'install'
                          ? 'Installing...'
                          : 'Install'
                        : 'Unavailable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'installed' && (
            <div className="browser-grid">
              
              {installedBrowsers.map((browser) => {
                const info = browserInfoMap[browser.id];
                if (!info) return null;
                const disableRemoval = info.installSource === 'system';
                return (
                  <div key={browser.id} className="browser-card">
                    <div className="browser-icon">
                      <img src={ICON_SOURCES[browser.icon]} alt={`${browser.label} logo`} />
                    </div>
                    <div className="browser-card-content">
                      <div className="browser-card-header">
                        <h3>{browser.label}</h3>
                      </div>
                      {info.note && <p className="browser-installed-note">{info.note}</p>}
                      {!info.note && BROWSER_DEFINITIONS && (
                        <p className="browser-installed-note">
                          {BROWSER_DEFINITIONS.find((b) => b.id === browser.id)?.description}
                        </p>
                      )}
                      <div className="browser-card-actions">
                        <button
                          className="browser-action-btn ghost"
                          onClick={() => openConfirmModal(browser.id, 'update')}
                          disabled={!!currentAction || disableRemoval}
                        >
                          {currentAction?.browserId === browser.id && currentAction.type === 'update'
                            ? 'Updating...'
                            : 'Update'}
                        </button>
                        <button
                          className="browser-action-btn danger"
                          onClick={() => openConfirmModal(browser.id, 'remove')}
                          disabled={!!currentAction || disableRemoval}
                        >
                          {disableRemoval
                            ? 'System Managed'
                            : currentAction?.browserId === browser.id && currentAction.type === 'remove'
                              ? 'Removing...'
                              : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        <div className="browser-manager-footer">
          <button className="browser-manager-close-bottom-btn" onClick={closeModal} disabled={!!currentAction}>
            Close
          </button>
        </div>
        {pendingConfirm && (
          <div className="browser-confirm-modal-overlay" onClick={closeConfirmModal}>
            <div className="browser-confirm-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="browser-confirm-modal-header">
                <h2 className="browser-confirm-modal-title">{ACTION_COPY[pendingConfirm.type].title}</h2>
                <button className="browser-confirm-close-btn" onClick={closeConfirmModal}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <div className="browser-confirm-modal-content">
                <p className="browser-confirm-modal-message">
                  Are you sure you want to {ACTION_COPY[pendingConfirm.type].verb} {getBrowserLabel(pendingConfirm.browserId)}?
                </p>
              </div>
              <div className="browser-confirm-modal-actions">
                <button type="button" className="browser-confirm-btn-cancel" onClick={closeConfirmModal}>
                  Cancel
                </button>
                <button
                  type="button"
                  className={`browser-confirm-btn-${ACTION_COPY[pendingConfirm.type].variant}`}
                  onClick={proceedConfirmedAction}
                >
                  {ACTION_COPY[pendingConfirm.type].cta}
                </button>
              </div>
            </div>
          </div>
        )}
        {installProgress && (
          <div className="browser-download-overlay" onClick={() => {
            // Only allow closing if installation is complete (100% or success status)
            if (installProgress.progress >= 100 || installProgress.status.toLowerCase().includes('success')) {
              setInstallProgress(null);
            }
          }}>
            <div className="browser-download-dialog" onClick={(e) => e.stopPropagation()}>
              {(installProgress.progress >= 100 || installProgress.status.toLowerCase().includes('success')) && (
                <button 
                  className="browser-download-close-btn"
                  onClick={() => setInstallProgress(null)}
                  title="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <div className="browser-download-spinner-container">
                <div className="browser-download-spinner"></div>
              </div>
              <div className="browser-download-progress-header">
                <span className="browser-download-progress-browser">
                  Installing {installProgress.browser}...
                </span>
                <span className="browser-download-progress-percent">
                  {Math.round(installProgress.progress)}%
                </span>
              </div>
              <div className="browser-download-progress-bar-container">
                <div 
                  className="browser-download-progress-bar"
                  style={{ width: `${installProgress.progress}%` }}
                />
              </div>
             
              {installProgress.progress < 100 && !installProgress.status.toLowerCase().includes('success') && (
                <div className="browser-download-warning-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Please do not close the application while downloading browser.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserManagerModal;


