import React, { useState, useEffect } from 'react';
import Main from './pages/main/Main';

export default function App() {
  const [testcaseId, setTestcaseId] = useState<string | null>(null);

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
        }
      } catch (error) {
        console.warn('[Recorder App] Failed to sync token from electron store:', error);
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

    const id = getTestcaseId();
    if (id) {
      setTestcaseId(id);
      console.log('[Recorder App] Received testcase ID:', id);
    }
  }, []);

  return <Main testcaseId={testcaseId} />;
}
