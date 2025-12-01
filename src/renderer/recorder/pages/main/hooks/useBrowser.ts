import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Action, ActionType } from '../../../types/actions';
import { BasicAuthentication } from '../../../types/basic_auth';
import { receiveAction } from '../../../utils/receive_action';

interface UseBrowserProps {
  url: string;
  actions: Action[];
  testcaseId: string | null;
  basicAuth?: BasicAuthentication;
  browserType?: string;
  selectedInsertPosition: number;
  setSelectedInsertPosition: (pos: number) => void;
  setDisplayInsertPosition: (pos: number) => void;
  setActions: React.Dispatch<React.SetStateAction<Action[]>>;
  setIsDirty: (dirty: boolean) => void;
  setRecordingFromActionIndex: (index: number | null) => void;
  setExecutingActionIndex: (index: number | null) => void;
  setFailedActionIndex: (index: number | null) => void;
  setSelectedAssert: (assert: string | null) => void;
  setIsAssertDropdownOpen: (open: boolean) => void;
  setAssertSearch: (search: string) => void;
  setIsAssertMode: (mode: boolean) => void;
}

export const useBrowser = ({
  url,
  actions,
  testcaseId,
  basicAuth,
  browserType = 'chrome',
  selectedInsertPosition,
  setSelectedInsertPosition,
  setDisplayInsertPosition,
  setActions,
  setIsDirty,
  setRecordingFromActionIndex,
  setExecutingActionIndex,
  setFailedActionIndex,
  setSelectedAssert,
  setIsAssertDropdownOpen,
  setAssertSearch,
  setIsAssertMode,
}: UseBrowserProps) => {
  const [isPaused, setIsPaused] = useState(true);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [runResult, setRunResult] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isRunningScript, setIsRunningScript] = useState(false);
  
  // These states are managed by parent via setters
  // We just track them locally for return value
  const [recordingFromActionIndexLocal, setRecordingFromActionIndexLocal] = useState<number | null>(null);
  const [executingActionIndexLocal, setExecutingActionIndexLocal] = useState<number | null>(null);
  const [failedActionIndexLocal, setFailedActionIndexLocal] = useState<number | null>(null);
  
  // Sync with parent setters
  useEffect(() => {
    setRecordingFromActionIndex(recordingFromActionIndexLocal);
  }, [recordingFromActionIndexLocal, setRecordingFromActionIndex]);
  
  useEffect(() => {
    setExecutingActionIndex(executingActionIndexLocal);
  }, [executingActionIndexLocal, setExecutingActionIndex]);
  
  useEffect(() => {
    setFailedActionIndex(failedActionIndexLocal);
  }, [failedActionIndexLocal, setFailedActionIndex]);

  // Check browser compatibility with platform
  const checkBrowserCompatibility = useCallback((browserType: string): { supported: boolean; warning?: string } => {
    const platform = (window as any).electronAPI?.system?.platform || process.platform;
    const normalizedBrowserType = (browserType || 'chrome').toLowerCase();
    
    // Safari (WebKit) is not well supported on Linux
    if (normalizedBrowserType === 'safari' && platform === 'linux') {
      return {
        supported: false,
        warning: 'Safari (WebKit) is not well supported on Linux. Some features may not work correctly. Consider using Chrome, Edge, Firefox instead.'
      };
    }
    
    // Firefox on some platforms might have issues
    if (normalizedBrowserType === 'firefox' && platform === 'win32') {
      return {
        supported: true,
        warning: 'Firefox may have limited support on Windows. If you encounter issues, try using Chrome or Edge instead.'
      };
    }
    
    return { supported: true };
  }, []);

  const startBrowser = useCallback(async (url: string, executeUntilIndex?: number | null) => {
    if (isBrowserOpen) {
      return;
    }

    if (actions.length === 0 && !url) {
      toast.error('Please enter a URL to start recording');
      return;
    }

    // Check browser compatibility
    const compatibility = checkBrowserCompatibility(browserType);
    if (!compatibility.supported) {
      toast.error(compatibility.warning || 'This browser is not supported on your platform');
      return;
    }
    
    if (compatibility.warning) {
      toast.warning(compatibility.warning, { autoClose: 5000 });
    }

    try {
      setIsBrowserOpen(true);
      setIsPaused(true);
      let basicAuthentication = {
        username: basicAuth?.username || '',
        password: basicAuth?.password || '',
      };
      await (window as any).browserAPI?.browser?.start(basicAuthentication, browserType);
      
      if (actions.length > 0) {
        const limit = (typeof executeUntilIndex === 'number' && executeUntilIndex >= 0)
          ? Math.min(executeUntilIndex, actions.length)
          : actions.length;
        const toExecute = actions.slice(0, limit);
        if (toExecute.length > 0) {
          await (window as any).browserAPI?.browser?.executeActions(toExecute);
          setIsPaused(false);
        }
      } else {
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        
        await (window as any).browserAPI?.browser?.navigate(url);
        setSelectedInsertPosition(selectedInsertPosition + 1);
        setDisplayInsertPosition(selectedInsertPosition + 1);
        setActions(prev => {
          const next = receiveAction(
            testcaseId || '', 
            prev, 
            { 
              action_type: ActionType.navigate, 
              action_datas: [{ value: { value: url } },{ value: { page_index: 0 } }] 
            }
          );
          setIsDirty(true);
          return next;
        });
        setIsPaused(false);
      }
    } catch (error) {
      setIsBrowserOpen(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if error is related to browser compatibility
      if (errorMessage.includes('Unknown option') || errorMessage.includes('Cannot parse arguments')) {
        const compatibility = checkBrowserCompatibility(browserType);
        if (!compatibility.supported) {
          toast.error(compatibility.warning || 'This browser is not supported on your platform. Please use a different browser.');
        } else {
          toast.error(`Failed to start browser: ${errorMessage}. This browser may not be fully compatible with your platform.`);
        }
      } else {
        toast.error(`Failed to start browser: ${errorMessage}`);
      }
      throw error;
    }
  }, [isBrowserOpen, actions.length, basicAuth, browserType, selectedInsertPosition, setSelectedInsertPosition, setDisplayInsertPosition, setActions, setIsDirty, testcaseId, checkBrowserCompatibility]);

  const pauseBrowser = useCallback(async () => {
    setIsPaused(!isPaused);
  }, [isPaused]);

  const stopBrowser = useCallback(async () => {
    setIsBrowserOpen(false);
    setIsPaused(false);
    setSelectedAssert(null);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(false);
    await (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
      setRecordingFromActionIndexLocal(null);
      setExecutingActionIndexLocal(null);
      setFailedActionIndexLocal(null);
    await (window as any).browserAPI?.browser?.stop();
  }, [setSelectedAssert, setIsAssertDropdownOpen, setAssertSearch, setIsAssertMode]);

  const handleStartRecordingFromAction = useCallback(async (actionIndex: number) => {
    try {
      if (recordingFromActionIndexLocal === actionIndex) {
        if (isBrowserOpen) {
          toast.warning('Browser is open: recording position reset to end of actions');
        }
        setRecordingFromActionIndex(null);
        setSelectedInsertPosition(actions.length);
        setDisplayInsertPosition(actions.length);
        if (!isBrowserOpen) {
          toast.info('Recording position reset to end of actions');
        }
        return;
      }

      const insertPosition = actionIndex + 1;
      setSelectedInsertPosition(insertPosition);
      setDisplayInsertPosition(insertPosition);
      setRecordingFromActionIndexLocal(actionIndex);
      
      if (!isBrowserOpen) {
        await startBrowser(url, insertPosition);
      } else {
        toast.warning(`Browser is opened`);
      }
    } catch (error) {
      toast.error('Failed to start recording from this action');
    }
  }, [recordingFromActionIndexLocal, isBrowserOpen, actions.length, url, startBrowser, setSelectedInsertPosition, setDisplayInsertPosition]);

  const handleRunScript = useCallback(async () => {
    if (isRunningScript) return;
    setIsRunningScript(true);
    // Clear log cũ khi bắt đầu run test mới
    // Clear old log when starting new test run
    setRunResult('');
    try {
      const { ExecuteScriptsService } = await import('../../../services/executeScripts');
      const service = new ExecuteScriptsService();
      const payload = {
        actions: actions,
        testcase_id: testcaseId || '',
        basic_auth: basicAuth,
      };
      const resp = await service.executeActions(payload);
      if (resp.success) {
        setRunResult((resp as any).logs || 'Executed successfully');
        toast.success('Run succeeded', { autoClose: 2000 });
      } else {
        setRunResult((resp as any).logs || 'Run failed');
        toast.error(resp.error || 'Run failed', { autoClose: 3000 });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setRunResult(message || 'Unknown error');
      toast.error(message);
    } finally {
      setIsRunningScript(false);
    }
  }, [isRunningScript, actions, testcaseId, basicAuth, recordingFromActionIndexLocal, isBrowserOpen, url, startBrowser, setSelectedInsertPosition, setDisplayInsertPosition]);

  // Listen for browser close events
  useEffect(() => {
    const handleBrowserClose = async () => {
      setIsBrowserOpen(false);
      setIsPaused(false);
      setSelectedAssert(null);
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
      setIsAssertMode(false);
      await (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
      setRecordingFromActionIndexLocal(null);
      setExecutingActionIndexLocal(null);
      setFailedActionIndexLocal(null);
    };

    const removeListener = (window as any).browserAPI?.browser?.onBrowserClose?.(handleBrowserClose);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [setSelectedAssert, setIsAssertDropdownOpen, setAssertSearch, setIsAssertMode, setRecordingFromActionIndex, setExecutingActionIndex, setFailedActionIndex]);

  // Listen for action execution events
  useEffect(() => {
    const handleActionExecuting = (data: { index: number }) => {
      if (data.index === -1) {
        setExecutingActionIndexLocal(null);
        setFailedActionIndexLocal(null);
      } else {
        setExecutingActionIndexLocal(data.index);
        setFailedActionIndexLocal(null);
      }
    };

    const handleActionFailed = (data: { index: number }) => {
      setFailedActionIndexLocal(data.index);
      setExecutingActionIndexLocal(null);
    };

    const removeExecutingListener = (window as any).browserAPI?.browser?.onActionExecuting?.(handleActionExecuting);
    const removeFailedListener = (window as any).browserAPI?.browser?.onActionFailed?.(handleActionFailed);
    
    return () => {
      if (removeExecutingListener) {
        removeExecutingListener();
      }
      if (removeFailedListener) {
        removeFailedListener();
      }
    };
  }, []);

  return {
    isPaused,
    setIsPaused,
    isBrowserOpen,
    setIsBrowserOpen,
    runResult,
    setRunResult,
    recordingFromActionIndex: recordingFromActionIndexLocal,
    setRecordingFromActionIndex: setRecordingFromActionIndexLocal,
    executingActionIndex: executingActionIndexLocal,
    setExecutingActionIndex: setExecutingActionIndexLocal,
    failedActionIndex: failedActionIndexLocal,
    setFailedActionIndex: setFailedActionIndexLocal,
    isGeneratingCode,
    setIsGeneratingCode,
    isRunningScript,
    startBrowser,
    pauseBrowser,
    stopBrowser,
    handleStartRecordingFromAction,
    handleRunScript,
  };
};

