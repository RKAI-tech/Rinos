import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { BrowserType } from '../../../types/testcases';
import { TestCaseInSuite } from '../../../types/testsuites';
import { mapBrowserTypeToPlaywright, isBrowserSupported } from '../utils/suitesManagerUtils';

interface UseBrowserHandlersParams {
  projectId: string | undefined;
  testcases: TestCaseInSuite[];
  pendingRecorderTestcaseId: string | null;
  setPendingRecorderTestcaseId: (id: string | null) => void;
  setIsInstallBrowserModalOpen: (open: boolean) => void;
  setIsInstallingBrowsers: (installing: boolean) => void;
  setInstallProgress: (progress: { browser: string; progress: number; status: string } | null) => void;
  testSuiteId?: string | null;
}

export const useBrowserHandlers = ({
  projectId,
  testcases,
  pendingRecorderTestcaseId,
  setPendingRecorderTestcaseId,
  setIsInstallBrowserModalOpen,
  setIsInstallingBrowsers,
  setInstallProgress,
  testSuiteId,
}: UseBrowserHandlersParams) => {
  /**
   * Check if browser is installed
   */
  const checkBrowserInstalled = useCallback(async (browserType: string): Promise<boolean> => {
    try {
      const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;
      if (!playwrightAPI) {
        /* console.warn('[SuitesManager] Playwright API not available'); */
        return true; // Assume installed if API not available
      }
      
      const playwrightBrowser = mapBrowserTypeToPlaywright(browserType);
      const result = await playwrightAPI.checkBrowsers([browserType]);
      
      if (result?.success && result?.data) {
        return result.data[browserType] === true;
      }
      return false;
    } catch (err) {
      /* console.error('[SuitesManager] Error checking browser:', err); */
      return false;
    }
  }, []);

  /**
   * Open recorder after browser check
   */
  const openRecorderAfterCheck = useCallback(async (id: string) => {
    try {
      const token = await (window as any).tokenStore?.get?.();
      (window as any).browserAPI?.browser?.setAuthToken?.(token);
      
      const testcase = testcases.find(tc => tc.testcase_id === id);
      /* console.log('[SuitesManager] Testcase', testcase); */
      const testcaseName = testcase?.name || id;
      const browserType = testcase?.browser_type || BrowserType.chrome;

      // console.log('[SuitesManager] testcase evidence_id', testcase?.evidence_id);
      
      const result = await (window as any).screenHandleAPI?.openRecorder?.(id, projectId, testcaseName, browserType, testSuiteId, testcase?.evidence_id);
      if (result?.alreadyOpen) {
        toast.warning('Recorder for this testcase is already open.');
      } else if (result?.created) {
        // Recorder opened successfully
      }
    } catch (err) {
      /* console.error('[SuitesManager] openRecorder error:', err); */
      toast.error('Failed to open recorder');
    }
  }, [testcases, projectId, testSuiteId]);

  /**
   * Handle opening recorder with browser check
   */
  const handleOpenRecorder = useCallback(async (id: string) => {
    try {
      const testcase = testcases.find(tc => tc.testcase_id === id);
      const browserType = testcase?.browser_type || BrowserType.chrome;
      
      // First check if browser type is supported on current platform
      if (!isBrowserSupported(browserType)) {
        const browserName = browserType.charAt(0).toUpperCase() + browserType.slice(1);
        const systemPlatformRaw = (window as any).electronAPI?.system?.platform || process?.platform || 'linux';
        const platformName = systemPlatformRaw === 'win32' ? 'Windows' : systemPlatformRaw === 'darwin' ? 'macOS' : 'Linux';
        toast.error(`${browserName} is not supported on ${platformName}. Please use a different browser type.`);
        return;
      }
      
      // Check if browser is installed
      const isInstalled = await checkBrowserInstalled(browserType);
      
      if (!isInstalled) {
        // Show install modal
        setPendingRecorderTestcaseId(id);
        setIsInstallBrowserModalOpen(true);
      } else {
        // Browser is installed, open recorder directly
        await openRecorderAfterCheck(id);
      }
    } catch (err) {
      /* console.error('[SuitesManager] Error in handleOpenRecorder:', err); */
      toast.error('Failed to check browser installation');
    }
  }, [testcases, checkBrowserInstalled, openRecorderAfterCheck, setPendingRecorderTestcaseId, setIsInstallBrowserModalOpen]);

  /**
   * Handle browser installation
   */
  const handleInstallBrowsers = useCallback(async (browsers: string[]) => {
    try {
      setIsInstallingBrowsers(true);
      setInstallProgress(null);
      
      const playwrightAPI = (window as any).playwrightAPI || (window as any).electronAPI?.playwright;
      if (!playwrightAPI) {
        throw new Error('Playwright API not available');
      }
      
      // Set up progress listener
      const unsubscribe = playwrightAPI.onInstallProgress?.((progress: { browser: string; progress: number; status: string }) => {
        setInstallProgress(progress);
      });
      
      // Install browsers
      const result = await playwrightAPI.installBrowsers(browsers);
      
      // Clean up listener
      if (unsubscribe) unsubscribe();
      
      if (result?.success) {
        toast.success('Browsers installed successfully!');
        setIsInstallBrowserModalOpen(false);
        setIsInstallingBrowsers(false);
        setInstallProgress(null);
        
        // Open recorder after installation
        if (pendingRecorderTestcaseId) {
          await openRecorderAfterCheck(pendingRecorderTestcaseId);
          setPendingRecorderTestcaseId(null);
        }
      } else {
        throw new Error(result?.error || 'Installation failed');
      }
    } catch (err) {
      /* console.error('[SuitesManager] Error installing browsers:', err); */
      toast.error(err instanceof Error ? err.message : 'Failed to install browsers');
      setIsInstallingBrowsers(false);
      setInstallProgress(null);
      throw err;
    }
  }, [pendingRecorderTestcaseId, openRecorderAfterCheck, setIsInstallingBrowsers, setIsInstallBrowserModalOpen, setInstallProgress, setPendingRecorderTestcaseId]);

  return {
    checkBrowserInstalled,
    openRecorderAfterCheck,
    handleOpenRecorder,
    handleInstallBrowsers,
  };
};

