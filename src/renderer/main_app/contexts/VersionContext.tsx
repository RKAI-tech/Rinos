import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import VersionUpdateModal from '../components/version/VersionUpdateModal';
import { versionCheckService } from '../services/versionCheck';

interface VersionContextValue {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  isChecking: boolean;
  openVersionModal: () => void;
}

const VersionContext = createContext<VersionContextValue | undefined>(undefined);

export const VersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [hasUpdate, setHasUpdate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const appInfo = await (window as any).electronAPI?.app?.getAppInfo?.();
        if (mounted && appInfo?.appVersion) {
          setCurrentVersion(appInfo.appVersion);
        }
      } catch {
        // silent fail
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentVersion) return;
    let cancelled = false;
    setIsChecking(true);

    const timer = setTimeout(async () => {
      try {
        const response = await versionCheckService.checkVersion(currentVersion);
        if (!cancelled && response.success && response.data) {
          const { is_latest, latest_version } = response.data;
          const isNewer = !is_latest;
          setLatestVersion(latest_version || '');
          setHasUpdate(Boolean(isNewer));
          if (isNewer) {
            setShowModal(true);
          }
        }
      } catch {
        // silent fail
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [currentVersion]);

  const openVersionModal = () => {
    if (hasUpdate) {
      setShowModal(true);
    }
  };

  const closeVersionModal = () => setShowModal(false);

  const handleDownloadClick = async () => {
    try {
      await (window as any).electronAPI?.system?.openExternalUrl?.('https://automation-test.rikkei.org/download');
    } catch (error) {
      console.error('Failed to open download URL:', error);
    }
  };

  const value = useMemo(
    () => ({
      currentVersion,
      latestVersion,
      hasUpdate,
      isChecking,
      openVersionModal,
    }),
    [currentVersion, latestVersion, hasUpdate, isChecking],
  );

  return (
    <VersionContext.Provider value={value}>
      {children}
      <VersionUpdateModal
        isOpen={showModal}
        currentVersion={currentVersion}
        latestVersion={latestVersion}
        onClose={closeVersionModal}
        onDownload={handleDownloadClick}
      />
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
};


