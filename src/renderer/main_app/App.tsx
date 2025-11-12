
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
  const [hasUnsavedActions, setHasUnsavedActions] = useState(true);

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
  }, []);

  useEffect(() => {
    const handleCloseRequest = () => {
      setShowConfirmClose(true);
      // In this version, we assume there may be unsaved data in child windows
      setHasUnsavedActions(true);
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
        hasUnsavedActions={hasUnsavedActions}
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
    </AuthProvider>
  );
}

export default App;
