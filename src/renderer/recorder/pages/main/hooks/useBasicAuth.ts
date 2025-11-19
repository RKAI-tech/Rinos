import { useState, useEffect, useCallback } from 'react';
import { BasicAuthentication } from '../../../types/basic_auth';
import { BasicAuthService } from '../../../services/basic_auth';

interface UseBasicAuthProps {
  testcaseId: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const useBasicAuth = ({ testcaseId, onDirtyChange }: UseBasicAuthProps) => {
  const [basicAuth, setBasicAuth] = useState<BasicAuthentication>();
  const [basicAuthStatus, setBasicAuthStatus] = useState<'idle' | 'success'>('idle');
  const [savedBasicAuthSnapshot, setSavedBasicAuthSnapshot] = useState<BasicAuthentication | undefined>(undefined);

  // Load basic authentication khi có testcase ID
  useEffect(() => {
    const loadBasicAuth = async () => {
      if (testcaseId) {
        try {
          const { BasicAuthService } = await import('../../../services/basic_auth');
          const basicAuthService = new BasicAuthService();
          const response = await basicAuthService.getBasicAuthenticationByTestcaseId(testcaseId);
          if (response.success && response.data) {
            setBasicAuth(response.data);
            setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(response.data)));
          } else {
            setBasicAuth(undefined);
            setSavedBasicAuthSnapshot(undefined);
          }
        } catch (error) {
          console.error('[useBasicAuth] Error loading basic auth:', error);
          setBasicAuth(undefined);
          setSavedBasicAuthSnapshot(undefined);
        }
      } else {
        setBasicAuth(undefined);
        setSavedBasicAuthSnapshot(undefined);
      }
    };

    loadBasicAuth();
  }, [testcaseId]);

  const handleOpenBasicAuth = useCallback(() => {
    setBasicAuthStatus('idle');
  }, []);

  const handleBasicAuthStatusClear = useCallback(() => {
    setBasicAuthStatus('idle');
  }, []);

  const handleSaveBasicAuth = useCallback(async () => {
    try {
      const basicAuthService = new BasicAuthService();
      if (!basicAuth) {
        await basicAuthService.deleteBasicAuthentication(testcaseId || '');
        setSavedBasicAuthSnapshot(undefined);
        onDirtyChange?.(false);
      } else {
        await basicAuthService.upsertBasicAuthentication(basicAuth);
        setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(basicAuth)));
        onDirtyChange?.(false);
      }
    } catch (error) {
      throw new Error('Failed to save basic authentication');
    }
  }, [testcaseId, basicAuth, onDirtyChange]);

  const reloadBasicAuth = useCallback(async () => {
    const basicAuthService = new BasicAuthService();
    const response = await basicAuthService.getBasicAuthenticationByTestcaseId(testcaseId || '');
    if (response.success && response.data) {
      setBasicAuth(response.data);
      setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(response.data)));
    } else {
      setBasicAuth(undefined);
      setSavedBasicAuthSnapshot(undefined);
    }
  }, [testcaseId]);

  const handleBasicAuthSaved = useCallback((auth: BasicAuthentication) => {
    setBasicAuth(auth);
    setBasicAuthStatus('success');
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  return {
    basicAuth,
    setBasicAuth,
    basicAuthStatus,
    setBasicAuthStatus,
    savedBasicAuthSnapshot,
    handleOpenBasicAuth,
    handleBasicAuthStatusClear,
    handleSaveBasicAuth,
    reloadBasicAuth,
    handleBasicAuthSaved,
  };
};

