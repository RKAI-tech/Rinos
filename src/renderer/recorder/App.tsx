import React, { useState, useEffect } from 'react';
import Main from './pages/main/Main';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [testcaseId, setTestcaseId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isTokenSynced, setIsTokenSynced] = useState(false);


  useEffect(() => {
    // console.log('[Recorder App] component mounted');
    
    // Sync token from electron store to apiRouter if available
    (async () => {
      try {
        const token = await (window as any).tokenStore?.get?.();
        if (token) {
          const { apiRouter } = await import('./services/baseAPIRequest');
          apiRouter.setAuthToken(token);
          // console.log('[Recorder App] Token synced from electron store');
        } else {
          // console.log('[Recorder App] No token found in electron store');
        }
        setIsTokenSynced(true);
      } catch (error) {
        // console.warn('[Recorder App] Failed to sync token from electron store:', error);
        setIsTokenSynced(true);
      }
    })();

    // Lấy testcase ID từ URL parameters hoặc window API
    const getTestcaseId = () => {
      // Cách 1: Từ URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const idFromUrl = urlParams.get('testcaseId');
      // Cách 2: Từ window API (nếu có)
      const idFromAPI = (window as any).testcaseId;
      return idFromUrl || idFromAPI || null;
    };

    const getProjectId = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const projectIdFromUrl = urlParams.get('projectId');
      const projectIdFromAPI = (window as any).projectId;
      return projectIdFromUrl || projectIdFromAPI || null;
    };

    const id = getTestcaseId();
    if (id) {
      setTestcaseId(id);
      // console.log('[Recorder App] Received testcase ID:', id);
    } else {
      // console.log('[Recorder App] No testcase ID found');
    }

    const projectId = getProjectId();
    if (projectId) {
      setProjectId(projectId);
      // console.log('[Recorder App] Received project ID:', projectId);
    } else {
      // console.log('[Recorder App] No project ID found');
    }
  }, []);

  // Chỉ render Main khi token đã được sync
  if (!isTokenSynced) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Initializing...
      </div>
    );
  }

  return (
    <>
      <Main testcaseId={testcaseId} projectId={projectId} />
      <ToastContainer position="top-right" autoClose={3000} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </>
  );
}
