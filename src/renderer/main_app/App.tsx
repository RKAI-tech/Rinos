
import React, { useEffect, useState } from 'react';
import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/login/Login';
import Register from './pages/register/Register';
import Dashboard from './pages/dashboard/Dashboard';
import Testcases from './pages/testcases/Testcases';
import TestSuites from './pages/test_suites/TestSuites';
import Queries from './pages/queries/Queries';
import Variables from './pages/variables/Variables';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Databases from './pages/databases/Databases';
import BrowserStorage from './pages/browser_storage/BrowserStorage';
import ChangeLog from './pages/change_log/ChangeLog';
import ConfirmCloseModal from '../recorder/components/confirm_close/ConfirmCloseModal';
import LoadingScreen from './components/loading/LoadingScreen';
import VersionUpdateModal from './components/version/VersionUpdateModal';
import { versionCheckService } from './services/versionCheck';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

function App() {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [hasUnsavedDatas, setHasUnsavedDatas] = useState(true);
  
  // Version check state
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionInfo, setVersionInfo] = useState<{
    is_latest: boolean;
    latestVersion: string;
  } | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    // console.log('App component mounted');
    // Sync token from electron store to apiRouter if available
    (async () => {
      try {
        const token = await (window as any).tokenStore?.get?.();
        if (token) {
          const { apiRouter } = await import('./services/baseAPIRequest');
          apiRouter.setAuthToken(token);
        }
      } catch {}
    })();

    // Get app version
    (async () => {
      try {
        const appInfo = await (window as any).electronAPI?.app?.getAppInfo?.();
        if (appInfo?.appVersion) {
          console.log('appInfo.appVersion', appInfo.appVersion);
          setCurrentVersion(appInfo.appVersion);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const handleCloseRequest = async () => {
      // console.log('[App] Close request received, getting unsaved datas flag...');
      // Gọi main process để lấy unsaved flags từ child windows
      try {
        const hasUnsavedDatas = await (window as any).electronAPI?.window?.getUnsavedDatasFlag?.() || false;
        // console.log('[App] Got unsaved datas flag:', hasUnsavedDatas);
        setHasUnsavedDatas(hasUnsavedDatas);
      } catch (error) {
        // console.error('[App] Error getting unsaved datas flag:', error);
        // Nếu có lỗi, giả định có unsaved data để an toàn
        setHasUnsavedDatas(true);
      }
      setShowConfirmClose(true);
    };
    const removeListener = (window as any).electronAPI?.window?.onMainAppCloseRequested?.(handleCloseRequest);
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  const handleConfirmClose = (confirm: boolean, save: boolean) => {
    setShowConfirmClose(false);
    (window as any).electronAPI?.window?.sendMainAppCloseResult?.({ confirm, save });
  };

  // Version check on app start
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await versionCheckService.checkVersion(currentVersion || '');
        
        if (response.success && response.data) {
          const { is_latest,latest_version } = response.data;
          
          // So sánh version (so sánh đơn giản, có thể nâng cấp dùng semver sau)
          if (latest_version !== currentVersion) {
            setVersionInfo({
              is_latest: is_latest,
              latestVersion: latest_version
            });
            setShowVersionModal(true);
          }
        }
      } catch (error) {
        // Silent fail - không hiển thị lỗi nếu check version thất bại
        // console.error('Version check failed:', error);
      }
    };

    // Delay một chút để app load xong và có currentVersion
    if (currentVersion) {
      const timer = setTimeout(() => {
        checkVersion();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [currentVersion]);

  const handleDownloadClick = async () => {
    try {
      await (window as any).electronAPI?.system?.openExternalUrl?.('https://automation-test.rikkei.org/download');
    } catch (error) {
      console.error('Failed to open download URL:', error);
    }
  };

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/testcases/:projectId" element={
            <ProtectedRoute>
              <Testcases />
            </ProtectedRoute>
          } />
          <Route path="/test-suites/:projectId" element={
            <ProtectedRoute>
              <TestSuites />
            </ProtectedRoute>
          } />
          <Route path="/browser-storage/:projectId" element={
            <ProtectedRoute>
              <BrowserStorage />
            </ProtectedRoute>
          } />
          <Route path="/databases/:projectId" element={
            <ProtectedRoute>
              <Databases />
            </ProtectedRoute>
          } />
          <Route path="/queries/:projectId" element={
            <ProtectedRoute>
              <Queries />
            </ProtectedRoute>
          } />
          <Route path="/variables/:projectId" element={
            <ProtectedRoute>
              <Variables />
            </ProtectedRoute>
          } />
          <Route path="/change-log/:projectId" element={
            <ProtectedRoute>
              <ChangeLog />
            </ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="colored"
          style={{ zIndex: 2147483648 }}
        />
      </Router>
      <ConfirmCloseModal
        isOpen={showConfirmClose}
        hasUnsavedDatas={hasUnsavedDatas}
        onCancel={() => {
          handleConfirmClose(false, false);
        }}
        onSaveAndClose={() => {
          handleConfirmClose(true, true);
        }}
        onConfirm={() => {
          handleConfirmClose(true, false);
        }}
      />
      <VersionUpdateModal
        isOpen={showVersionModal}
        currentVersion={currentVersion || ''}
        latestVersion={versionInfo?.latestVersion || ''}
        onClose={() => setShowVersionModal(false)}
        onDownload={handleDownloadClick}
      />
    </AuthProvider>
  );
}

export default App;
