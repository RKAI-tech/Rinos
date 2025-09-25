import React, { useState, useEffect } from 'react';
import Main from './pages/main/Main';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function App() {
  const [testcaseId, setTestcaseId] = useState<string | null>(null);
  const [isTokenSynced, setIsTokenSynced] = useState(false);


  useEffect(() => {
    console.log('[Recorder App] component mounted');
    
    // Sync token from electron store to apiRouter if available
    (async () => {
      try {
        const token = await (window as any).tokenStore?.get?.();
        if (token) {
          const { apiRouter } = await import('./services/baseAPIRequest');
          apiRouter.setAuthToken(token);
          console.log('[Recorder App] Token synced from electron store');
        } else {
          console.log('[Recorder App] No token found in electron store');
        }
        setIsTokenSynced(true);
      } catch (error) {
        console.warn('[Recorder App] Failed to sync token from electron store:', error);
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
      
      console.log('[Recorder App] Current URL:', window.location.href);
      console.log('[Recorder App] URL search params:', window.location.search);
      console.log('[Recorder App] testcaseId from URL:', idFromUrl);
      console.log('[Recorder App] testcaseId from window API:', idFromAPI);
      
      return idFromUrl || idFromAPI || null;
    };

    const id = getTestcaseId();
    if (id) {
      setTestcaseId(id);
      console.log('[Recorder App] Received testcase ID:', id);
    } else {
      console.log('[Recorder App] No testcase ID found');
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
      <Main testcaseId={testcaseId} />
      <ToastContainer position="top-right" autoClose={3000} newestOnTop closeOnClick pauseOnHover theme="colored" />
    </>
  );
}
