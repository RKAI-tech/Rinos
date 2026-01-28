import { useState, useEffect, useCallback } from 'react';
import { BasicAuthentication } from '../../../types/basic_auth';
import { BasicAuthService } from '../../../services/basic_auth';

interface UseBasicAuthProps {
  testcaseId: string | null;
  projectId?: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
  enableInitialLoad?: boolean;
}

export const useBasicAuth = ({
  testcaseId,
  projectId,
  onDirtyChange,
  enableInitialLoad = true,
}: UseBasicAuthProps) => {
  const [basicAuth, setBasicAuth] = useState<BasicAuthentication>();
  const [basicAuthStatus, setBasicAuthStatus] = useState<'idle' | 'success'>('idle');
  const [savedBasicAuthSnapshot, setSavedBasicAuthSnapshot] = useState<BasicAuthentication | undefined>(undefined);

  // Load basic authentication khi có testcase ID
  useEffect(() => {
    if (!enableInitialLoad) {
      return;
    }
    const loadBasicAuth = async () => {
      if (testcaseId) {
        try {
          const { BasicAuthService } = await import('../../../services/basic_auth');
          const basicAuthService = new BasicAuthService();
          const response = await basicAuthService.getBasicAuthenticationByTestcaseId(testcaseId, projectId || undefined);
          if (response.success && response.data) {
            setBasicAuth(response.data);
            setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(response.data)));
          } else {
            setBasicAuth(undefined);
            setSavedBasicAuthSnapshot(undefined);
          }
        } catch (error) {
          /* console.error('[useBasicAuth] Error loading basic auth:', error); */
          setBasicAuth(undefined);
          setSavedBasicAuthSnapshot(undefined);
        }
      } else {
        setBasicAuth(undefined);
        setSavedBasicAuthSnapshot(undefined);
      }
    };

    loadBasicAuth();
  }, [testcaseId, projectId, enableInitialLoad]);

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
        await basicAuthService.upsertBasicAuthentication(basicAuth, projectId || undefined);
        setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(basicAuth)));
        onDirtyChange?.(false);
      }
    } catch (error) {
      throw new Error('Failed to save basic authentication');
    }
  }, [testcaseId, projectId, basicAuth, onDirtyChange]);

  const reloadBasicAuth = useCallback(async () => {
    const basicAuthService = new BasicAuthService();
    const response = await basicAuthService.getBasicAuthenticationByTestcaseId(testcaseId || '', projectId || undefined);
    if (response.success && response.data) {
      setBasicAuth(response.data);
      setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(response.data)));
    } else {
      setBasicAuth(undefined);
      setSavedBasicAuthSnapshot(undefined);
    }
  }, [testcaseId, projectId]);

  const handleBasicAuthSaved = useCallback((auth: BasicAuthentication) => {
    setBasicAuth(auth);
    setBasicAuthStatus('success');
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  const applyBasicAuthFromBatch = useCallback((auth?: BasicAuthentication) => {
    if (auth) {
      setBasicAuth(auth);
      setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(auth)));
    } else {
      setBasicAuth(undefined);
      setSavedBasicAuthSnapshot(undefined);
    }
  }, []);

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
    applyBasicAuthFromBatch,
  };
};

