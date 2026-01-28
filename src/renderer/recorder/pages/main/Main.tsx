import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import './Main.css';
import ActionTab, { ActionOperationResult } from '../../components/action_tab/ActionTab';
import ActionDetailModal from '../../components/action_detail/ActionDetailModal';
import TestScriptTab from '../../components/code_convert/TestScriptTab';
import ActionToCodeTab from '../../components/action_to_code_tab/ActionToCodeTab';
import AiAssertModal from '../../components/asserts/ai_assert/AiAssertModal';
import AssertWithValueModal from '../../components/asserts/assert_with_value/AssertWithValueModal';
import BasicAuthModal from '../../components/basic_auth/BasicAuthModal';
import DeleteAllActions from '../../components/delete_all_action/DeleteAllActions';
import ConfirmCloseModal from '../../components/confirm_close/ConfirmCloseModal';
import URLInputModal from '../../components/asserts/url_input_modal/URLInputModal';
import TitleInputModal from '../../components/asserts/title_input_modal/TitleInputModal';
import CSSAssertModal from '../../components/asserts/css_input_modal/CSSAssertModal';
import { Action, ActionBatch, AssertType, TestCaseDataVersion } from '../../types/actions';
import { ExecuteScriptsService } from '../../services/executeScripts';
import { toast } from 'react-toastify';
import { GenerationCodeRequest } from '../../types/executeScripts';

// Hooks
import { useActions } from './hooks/useActions';
import { useBrowser } from './hooks/useBrowser';
import { useModals } from './hooks/useModals';
import { useAssert } from './hooks/useAssert';
import { useBasicAuth } from './hooks/useBasicAuth';
import { useAiAssert } from './hooks/useAiAssert';
import { useAssertWithValue } from './hooks/useAssertWithValue';
import { usePageSelection } from './hooks/usePageSelection';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';
import { useActionListener } from './hooks/useActionListener';
import { useDuplicateElementCheck } from './hooks/useDuplicateElementCheck';
import CheckDuplicateElementModal from '../../components/check_duplicate_element/CheckDuplicateElementModal';
import { findActiveVersionInActions, syncGenerationsBetweenActionsAndVersions } from '../../components/data_versions/versionSyncUtils';
import { TestCaseService } from '../../services/testcase';
import { TestCaseDataVersion as TestCaseDataVersionFromAPI } from '../../types/testcase';

interface MainProps {
  projectId?: string | null;
  testcaseId?: string | null;
  browserType?: string | null;
  testSuiteId?: string | null;
  evidenceId?: string | undefined;
}

const Main: React.FC<MainProps> = ({ projectId, testcaseId, browserType, testSuiteId, evidenceId }) => {  
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'actions' | 'script'>('actions');
  const [customScript, setCustomScript] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [testcaseDataVersions, setTestCaseDataVersions] = useState<TestCaseDataVersionFromAPI[]>([]);
  const service = new ExecuteScriptsService();
  const testCaseService = useMemo(() => new TestCaseService(), []);
  
  // Helper function to reload testcase data versions
  const reloadTestCaseDataVersions = useCallback(async () => {
    if (!testcaseId) {
      setTestCaseDataVersions([]);
      return;
    }

    try {
      const response = await testCaseService.getTestCaseDataVersions(testcaseId, projectId || undefined);      
      // Check if testcase was deleted (404 or Not Found error)
      if (!response.success && response.error) {
        const errorLower = response.error.toLowerCase();
        if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
          /* console.info(`[Main] Testcase ${testcaseId} not found (likely deleted), clearing data versions`); */
          setTestCaseDataVersions([]);
          return;
        }
      }
      
      if (response.success && response.data) {
        // Keep API format when loading
        const versions: TestCaseDataVersionFromAPI[] = Array.isArray(response.data.testcase_data_versions) 
          ? response.data.testcase_data_versions 
          : Array.isArray(response.data) 
            ? response.data 
            : [];
        setTestCaseDataVersions(versions);
      } else {
        setTestCaseDataVersions([]);
      }
    } catch (error: any) {
      // console.error('[Main] Error reloading testcase data versions:', error);
      setTestCaseDataVersions([]);
    }
  }, [testcaseId, testCaseService]);
  
  // Hooks
  const modals = useModals();
  const pageSelection = usePageSelection();
  
  // Tạo ref để lưu setIsDirty từ actionsHook
  const setIsDirtyRef = useRef<((dirty: boolean) => void) | null>(null);
  
  // Ổn định callback để tránh reload liên tục
  const handleActionsDirtyChange = useCallback((isDirty: boolean) => {
    // Will be set after hook initialization
  }, []);

  // Ổn định callback để tránh reload liên tục
  const handleBasicAuthDirtyChange = useCallback((isDirty: boolean) => {
    setIsDirtyRef.current?.(isDirty);
  }, []);

  const basicAuthHook = useBasicAuth({
    testcaseId: testcaseId || null,
    projectId: projectId || null,
    onDirtyChange: handleBasicAuthDirtyChange,
    enableInitialLoad: false,
  });

  const handleBatchLoaded = useCallback((batch: ActionBatch) => {
    const versions = (batch.testcase_data_versions || []) as unknown as TestCaseDataVersionFromAPI[];
    setTestCaseDataVersions(versions);
    basicAuthHook.applyBasicAuthFromBatch(batch.basic_authentication);
  }, [basicAuthHook.applyBasicAuthFromBatch]);

  const actionsHook = useActions({
    projectId: projectId || null,
    testcaseId: testcaseId || null,
    onDirtyChange: handleActionsDirtyChange,
    testcaseDataVersions: testcaseDataVersions,
    onBatchLoaded: handleBatchLoaded,
  });

  // Cập nhật ref khi actionsHook thay đổi
  useEffect(() => {
    setIsDirtyRef.current = actionsHook.setIsDirty;
  }, [actionsHook.setIsDirty]);

  useEffect(() => {
    if (!testcaseDataVersions || testcaseDataVersions.length === 0) {
      return;
    }
    if (!actionsHook.actions || actionsHook.actions.length === 0) {
      return;
    }

    const activeVersionName = findActiveVersionInActions(actionsHook.actions);
    const { updatedVersions } = syncGenerationsBetweenActionsAndVersions(
      actionsHook.actions,
      testcaseDataVersions,
      activeVersionName
    );

    const currentVersionsString = JSON.stringify(testcaseDataVersions);
    const updatedVersionsString = JSON.stringify(updatedVersions);
    if (currentVersionsString !== updatedVersionsString) {
      setTestCaseDataVersions(updatedVersions as TestCaseDataVersionFromAPI[]);
    }
  }, [actionsHook.actions, testcaseDataVersions]);

  useEffect(() => {
    if (!testcaseId) {
      setTestCaseDataVersions([]);
      basicAuthHook.applyBasicAuthFromBatch(undefined);
    }
  }, [testcaseId, basicAuthHook.applyBasicAuthFromBatch]);

  // Browser state - managed by hook but we need local refs for UI
  const [browserIsPaused, setBrowserIsPaused] = useState(true);
  const [browserIsOpen, setBrowserIsOpen] = useState(false);
  const [browserRunResult, setBrowserRunResult] = useState<string>('');
  const [browserRecordingFromActionIndex, setBrowserRecordingFromActionIndex] = useState<number | null>(null);
  const [browserExecutingActionIndex, setBrowserExecutingActionIndex] = useState<number | null>(null);
  const [browserFailedActionIndex, setBrowserFailedActionIndex] = useState<number | null>(null);
  const [browserIsGeneratingCode, setBrowserIsGeneratingCode] = useState(false);
  const [browserIsRunningScript, setBrowserIsRunningScript] = useState(false);

  const assertHook = useAssert({
    testcaseId: testcaseId || null,
    isBrowserOpen: browserIsOpen,
    setActions: actionsHook.handleActionsChange,
    setIsDirty: (dirty) => actionsHook.setIsDirty(dirty),
    setIsAiModalOpen: modals.setIsAiModalOpen,
    setIsUrlInputOpen: modals.setIsUrlInputOpen,
    setIsTitleInputOpen: modals.setIsTitleInputOpen,
    setIsCssInputOpen: modals.setIsCssInputOpen,
    setIsAssertWithValueModalOpen: modals.setIsAssertWithValueModalOpen,
  });

  const browserHook = useBrowser({
    url,
    actions: actionsHook.actions,
    testcaseId: testcaseId || null,
    basicAuth: basicAuthHook.basicAuth,
    browserType: browserType || 'chrome',
    testSuiteId: testSuiteId || null,
    selectedInsertPosition: actionsHook.selectedInsertPosition,
    setSelectedInsertPosition: actionsHook.setSelectedInsertPosition,
    setDisplayInsertPosition: actionsHook.setDisplayInsertPosition,
    setActions: actionsHook.handleActionsChange,
    setIsDirty: (dirty) => actionsHook.setIsDirty(dirty),
    setRecordingFromActionIndex: setBrowserRecordingFromActionIndex,
    setExecutingActionIndex: setBrowserExecutingActionIndex,
    setFailedActionIndex: setBrowserFailedActionIndex,
    setSelectedAssert: assertHook.setSelectedAssert,
    setIsAssertDropdownOpen: assertHook.setIsAssertDropdownOpen,
    setAssertSearch: assertHook.setAssertSearch,
    setIsAssertMode: assertHook.setIsAssertMode,
    evidenceId: evidenceId,
  });

  const aiAssertHook = useAiAssert({
    testcaseId: testcaseId || null,
    selectedInsertPosition: actionsHook.selectedInsertPosition,
    setSelectedInsertPosition: actionsHook.setSelectedInsertPosition,
    setDisplayInsertPosition: actionsHook.setDisplayInsertPosition,
    setActions: actionsHook.handleActionsChange,
    setIsDirty: (dirty) => actionsHook.setIsDirty(dirty),
    setSelectedAssert: assertHook.setSelectedAssert,
    setIsAssertMode: assertHook.setIsAssertMode,
    selectedPageInfo: pageSelection.aiAssertSelectedPageInfo,
  });

  const assertWithValueHook = useAssertWithValue({
    testcaseId: testcaseId || null,
    assertType: (assertHook.selectedAssert as any) || AssertType.toHaveText,
    selectedInsertPosition: actionsHook.selectedInsertPosition,
    setSelectedInsertPosition: actionsHook.setSelectedInsertPosition,
    setDisplayInsertPosition: actionsHook.setDisplayInsertPosition,
    setActions: actionsHook.handleActionsChange,
    setIsDirty: (dirty) => actionsHook.setIsDirty(dirty),
    setSelectedAssert: assertHook.setSelectedAssert,
    setIsAssertMode: assertHook.setIsAssertMode,
    selectedPageInfo: pageSelection.assertWithValueSelectedPageInfo,
  });

  const unsavedChanges = useUnsavedChanges({
    testcaseId: testcaseId || null,
    isDirty: actionsHook.isDirty,
    actions: actionsHook.actions,
    savedActionsSnapshot: actionsHook.savedActionsSnapshot,
    basicAuth: basicAuthHook.basicAuth,
    savedBasicAuthSnapshot: basicAuthHook.savedBasicAuthSnapshot,
  });

  const duplicateCheck = useDuplicateElementCheck({
    onDuplicateResolved: (updatedActions) => {
      // Cập nhật actions sau khi xử lý duplicate
      actionsHook.handleActionsChange(updatedActions);
    },
  });

  // Computed state để track xem có modal/popup nào đang mở không
  const isAnyModalOpen = useMemo(() => {
    return modals.isAddActionOpen || 
           modals.isDatabaseExecutionOpen || 
           modals.isAiModalOpen || 
           modals.isUrlInputOpen || 
           modals.isTitleInputOpen || 
           modals.isCssInputOpen ||
           modals.isAssertWithValueModalOpen ||
           modals.isBasicAuthOpen || 
           modals.isDetailOpen ||
           modals.isConfirmCloseOpen ||
           modals.isActionTabWaitOpen ||
           modals.isActionTabNavigateOpen ||
           modals.isActionTabApiRequestOpen ||
           modals.isActionTabAddBrowserStorageOpen ||
           modals.isActionTabBrowserActionOpen;
  }, [
    modals.isAddActionOpen, 
    modals.isDatabaseExecutionOpen, 
    modals.isAiModalOpen, 
    modals.isUrlInputOpen, 
    modals.isTitleInputOpen, 
    modals.isCssInputOpen,
    modals.isAssertWithValueModalOpen,
    modals.isBasicAuthOpen, 
    modals.isDetailOpen, 
    modals.isConfirmCloseOpen,
    modals.isActionTabWaitOpen,
    modals.isActionTabNavigateOpen,
    modals.isActionTabApiRequestOpen,
    modals.isActionTabAddBrowserStorageOpen,
    modals.isActionTabBrowserActionOpen
  ]);

  // Sync browser hook state with local state
  useEffect(() => {
    setBrowserIsPaused(browserHook.isPaused);
    setBrowserIsOpen(browserHook.isBrowserOpen);
    setBrowserRunResult(browserHook.runResult);
    setBrowserRecordingFromActionIndex(browserHook.recordingFromActionIndex);
    setBrowserExecutingActionIndex(browserHook.executingActionIndex);
    setBrowserFailedActionIndex(browserHook.failedActionIndex);
    setBrowserIsGeneratingCode(browserHook.isGeneratingCode);
    setBrowserIsRunningScript(browserHook.isRunningScript);
  }, [
    browserHook.isPaused,
    browserHook.isBrowserOpen,
    browserHook.runResult,
    browserHook.recordingFromActionIndex,
    browserHook.executingActionIndex,
    browserHook.failedActionIndex,
    browserHook.isGeneratingCode,
    browserHook.isRunningScript,
  ]);

  // Hàm generate code (tách riêng để có thể tái sử dụng)
  // Function to generate code (extracted for reusability)
  const generateCode = useCallback(async () => {
    if (actionsHook.actions.length === 0) {
      return;
    }
    
    setBrowserIsGeneratingCode(true);
    try {
      const request: GenerationCodeRequest = { 
        testcase_id: testcaseId || '', 
        actions: actionsHook.actions as Action[],
        basic_auth: basicAuthHook.basicAuth,
      };
      const response = await service.generateCode(request);
      
      if (response.success && response.data?.code) {
        setCustomScript(response.data.code);
      } else {
        // console.error('[Main] Server code generation failed:', response.error);
        setCustomScript('// Failed to generate code from server. Please try again.');
        toast.error(response.error || 'Failed to generate code from server');
      }
    } catch (error) {
      // console.error('[Main] Error generating code:', error);
      setCustomScript('// Error generating code. Please try again.');
      toast.error('Error generating code from server');
    } finally {
      setBrowserIsGeneratingCode(false);
    }
  }, [actionsHook.actions, testcaseId, basicAuthHook.basicAuth]);

  const handleTabSwitch = async () => {
    const newTab = activeTab === 'actions' ? 'script' : 'actions';
    
    if (newTab === 'script' && actionsHook.actions.length > 0) {
      await generateCode();
    }
    
    setActiveTab(newTab);
  };

  // Tự động chuyển sang tab code sau khi test hoàn thành (dù pass hay fail)
  // Auto switch to code tab after test completes (whether pass or fail)
  const prevIsRunningScript = useRef(browserIsRunningScript);
  useEffect(() => {
    // Kiểm tra khi test chuyển từ đang chạy sang đã hoàn thành
    // Check when test transitions from running to completed
    if (prevIsRunningScript.current === true && browserIsRunningScript === false) {
      // Test đã hoàn thành, generate code và chuyển sang tab code nếu có kết quả
      // Test completed, generate code and switch to code tab if there's a result
      if (browserRunResult && browserRunResult.trim() !== '') {
        // Generate code trước khi chuyển tab
        // Generate code before switching tab
        generateCode().then(() => {
          setActiveTab('script');
        });
      }
    }
    prevIsRunningScript.current = browserIsRunningScript;
  }, [browserIsRunningScript, browserRunResult, generateCode]);

  // Action listener
  useActionListener({
    testcaseId,
    isPaused: browserHook.isPaused,
    selectedInsertPosition: actionsHook.selectedInsertPosition,
    isAssertMode: assertHook.isAssertMode,
    isAnyModalOpen,
    actions: actionsHook.actions,
    setActions: actionsHook.handleActionsChange,
    setSelectedInsertPosition: actionsHook.setSelectedInsertPosition,
    setIsDirty: (dirty) => actionsHook.setIsDirty(dirty),
    setExecutingActionIndex: setBrowserExecutingActionIndex,
    setFailedActionIndex: setBrowserFailedActionIndex,
    isActionTabWaitOpen: modals.isActionTabWaitOpen,
    isActionTabNavigateOpen: modals.isActionTabNavigateOpen,
    isActionTabBrowserActionOpen: modals.isActionTabBrowserActionOpen,
    isActionTabAddBrowserStorageOpen: modals.isActionTabAddBrowserStorageOpen,
    isActionTabApiRequestOpen: modals.isActionTabApiRequestOpen,
    isUrlInputOpen: modals.isUrlInputOpen,
    isTitleInputOpen: modals.isTitleInputOpen,
    isCssInputOpen: modals.isCssInputOpen,
    isAiAssertOpen: modals.isAiModalOpen,
    isAssertWithValueModalOpen: modals.isAssertWithValueModalOpen,
    setNavigateSelectedPageInfo: pageSelection.setNavigateSelectedPageInfo,
    setBrowserActionSelectedPageInfo: pageSelection.setBrowserActionSelectedPageInfo,
    setAddBrowserStorageSelectedPageInfo: pageSelection.setAddBrowserStorageSelectedPageInfo,
    setApiRequestSelectedPageInfo: pageSelection.setApiRequestSelectedPageInfo,
    setUrlInputSelectedPageInfo: pageSelection.setUrlInputSelectedPageInfo,
    setTitleInputSelectedPageInfo: pageSelection.setTitleInputSelectedPageInfo,
    setCssInputSelectedPageInfo: pageSelection.setCssInputSelectedPageInfo,
    setCssInputSelectedElement: pageSelection.setCssInputSelectedElement,
    aiAssertSelectedPageInfo: pageSelection.aiAssertSelectedPageInfo,
    setAiAssertSelectedPageInfo: pageSelection.setAiAssertSelectedPageInfo,
    setAiElements: aiAssertHook.setAiElements,
    assertWithValueSelectedPageInfo: pageSelection.assertWithValueSelectedPageInfo,
    setAssertWithValueSelectedPageInfo: pageSelection.setAssertWithValueSelectedPageInfo,
    setAssertWithValueSelectedElement: pageSelection.setAssertWithValueSelectedElement,
  });

  // Gửi lại projectId sang process browser mỗi khi mở browser (vì mỗi lần mở là một phiên mới)
  useEffect(() => {
    if (projectId && browserIsOpen) {
      (window as any).browserAPI?.browser?.setProjectId?.(projectId);
    }
  }, [projectId, browserIsOpen]);

  // Check browser compatibility on mount and show warning if needed
  useEffect(() => {
    if (browserType) {
      const platform = (window as any).electronAPI?.system?.platform || 'unknown';
      const normalizedBrowserType = (browserType || 'chrome').toLowerCase();
      
      // Safari (WebKit) is not well supported on Linux
      if (normalizedBrowserType === 'safari' && platform === 'linux') {
        toast.warning(
          'Safari (WebKit) is not well supported on Linux. Some features may not work correctly. Consider using Chrome, Edge, Firefox instead.',
          { autoClose: 8000}
        );
      }
    }
  }, [browserType]);

  // Auto-focus URL input when component mounts
  useEffect(() => {
    const urlInput = document.querySelector('.rcd-url') as HTMLInputElement;
    if (urlInput) {
      urlInput.focus();
    }
  }, []);

  // Listen for window close request from main process
  useEffect(() => {
    const handleCloseRequest = () => {
      modals.setIsConfirmCloseOpen(true);
    };

    const removeListener = (window as any).electronAPI?.window?.onRecorderCloseRequested?.(handleCloseRequest);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [modals]);

  const reloadAll = async (): Promise<ActionOperationResult> => {
    return actionsHook.reloadActions();
  };

  const saveAll = async (testcaseDataVersions?: TestCaseDataVersionFromAPI[]): Promise<ActionOperationResult> => {
    actionsHook.setIsSaving(true);
    try {
      // Convert from API format to save format
      const versionsToSave: TestCaseDataVersion[] | undefined = testcaseDataVersions
        ? testcaseDataVersions.map((v) => ({
            testcase_data_version_id: v.testcase_data_version_id,
            version: v.version,
            action_data_generation_ids: v.action_data_generations
              ?.map(gen => gen.action_data_generation_id)
              .filter((id): id is string => !!id) || [],
          }))
        : undefined;
      const result = await actionsHook.handleSaveActions(versionsToSave, duplicateCheck.checkDuplicates);
      // Reload testcase data versions after successful save
      if (result.success) {
        await reloadTestCaseDataVersions();
      }
      await basicAuthHook.handleSaveBasicAuth();
      return result;
    } finally {
      actionsHook.setIsSaving(false);
    }
  };

  const handleSelectAction = (action: Action) => {
    setSelectedAction(action);
    modals.setIsDetailOpen(true);
  };

  const handleUpdateAction = (updatedAction: Action) => {
    const updated = actionsHook.handleUpdateAction(updatedAction);
    setSelectedAction(updated);
  };

  const handleAddAction = () => {
    modals.setIsAddActionOpen(true);
  };

  const handleOpenBasicAuth = () => {
    basicAuthHook.handleOpenBasicAuth();
    modals.setIsBasicAuthOpen(true);
  };

  const handleDeleteAllActions = () => {
    modals.setIsDeleteAllOpen(true);
  };

  const handleConfirmDeleteAll = async () => {
    try {
      await actionsHook.handleDeleteAllActions();
      // Reload testcase data versions after delete all
      await reloadTestCaseDataVersions();
      toast.success('All actions deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete actions');
    }
  };

  const handleConfirmClose = async () => {
    modals.setIsConfirmCloseOpen(false);
    await (window as any).electronAPI?.window?.confirmCloseRecorder?.(true);
  };

  const handleCancelClose = async () => {
    modals.setIsConfirmCloseOpen(false);
    await (window as any).electronAPI?.window?.confirmCloseRecorder?.(false);
  };

  const handleSaveAndClose = async () => {
    modals.setIsConfirmCloseOpen(false);
    try {
      // Convert from API format to save format
      const versionsToSave: TestCaseDataVersion[] | undefined = testcaseDataVersions.length > 0
        ? testcaseDataVersions.map((v) => ({
            testcase_data_version_id: v.testcase_data_version_id,
            version: v.version,
            action_data_generation_ids: v.action_data_generations
              ?.map(gen => gen.action_data_generation_id)
              .filter((id): id is string => !!id) || [],
          }))
        : undefined;
      
      const saveResult = await actionsHook.handleSaveActions(
        versionsToSave,
        duplicateCheck.checkDuplicates
      );

      if (!saveResult.success) {
        if (saveResult.level === 'warning') {
          if (saveResult.message) {
            toast.warning(saveResult.message);
          }
        } else {
          const message = saveResult.message || 'Failed to save actions. Please try again.';
          throw new Error(message);
        }
      }

      // Reload testcase data versions after successful save
      if (saveResult.success) {
        await reloadTestCaseDataVersions();
      }

      await basicAuthHook.handleSaveBasicAuth();
      setTimeout(async () => {
        await (window as any).electronAPI?.window?.confirmCloseRecorder?.(true);
      }, 500);
    } catch (error) {
      modals.setIsConfirmCloseOpen(true);
      const message = error instanceof Error ? error.message : 'Failed to save actions. Please try again.';
      toast.error(message || 'Failed to save actions. Please try again.');
    }
  };

  // Listen for child window force save and close event from main process
  useEffect(() => {
    const handleForceSaveAndClose = () => {
      handleSaveAndClose();
    };
    const removeListener = (window as any).electronAPI?.window?.onChildWindowForceSaveAndClose?.(handleForceSaveAndClose);
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [handleSaveAndClose]);

  // Listen for unsaved datas flag request from main process
  useEffect(() => {
    const handleGetUnsavedFlag = (requestId: string) => {
      (window as any).electronAPI?.window?.sendUnsavedDatasResponse?.(requestId, unsavedChanges.hasUnsavedActions);
    };
    
    const removeListener = (window as any).electronAPI?.window?.onGetUnsavedDatasFlag?.(handleGetUnsavedFlag);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [unsavedChanges.hasUnsavedActions]);

  const handleSelectInsertPosition = async (position: number | null) => {
    await actionsHook.handleSelectInsertPosition(
      position,
      url,
      browserHook.isBrowserOpen,
      browserHook.startBrowser
    );
  };

  return (
    <div className="rcd-page">
      <div className="rcd-topbar">
        <input
          className="rcd-url"
          placeholder="Type your URL here.."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (browserIsOpen) {
                browserHook.stopBrowser();
              } else {
                if (actionsHook.actions.length === 0 && !url.trim()) {
                  toast.error('Please enter a URL to start recording');
                  return;
                }
                const endPos = actionsHook.actions.length;
                actionsHook.setSelectedInsertPosition(endPos);
                actionsHook.setDisplayInsertPosition(endPos);
                browserHook.startBrowser(url);
              }
            }
          }}
        />
        <div className="rcd-topbar-actions">
        <button
            className={`rcd-ctrl ${browserIsOpen ? 'rcd-stop' : 'rcd-record'}`}
            title={browserIsOpen ? "Stop recording" : "Start recording"}
            onClick={() => {
              if (browserIsOpen) {
                browserHook.stopBrowser();
              } else {
                if (actionsHook.actions.length === 0 && !url.trim()) {
                  toast.error('Please enter a URL to start recording');
                  return;
                }
                const endPos = actionsHook.actions.length;
                actionsHook.setSelectedInsertPosition(endPos);
                actionsHook.setDisplayInsertPosition(endPos);
                browserHook.startBrowser(url);
              }
            }}
          >
            {browserIsOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="13" height="13" fill="red" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="6,3 20,12 6,21" fill="green" />
              </svg>
            )}
          </button>
          <button 
            className={`rcd-ctrl rcd-pause-alt ${browserIsPaused ? 'paused' : 'resumed'}`} 
            title={browserIsPaused ? "Resume" : "Pause"} 
            onClick={browserHook.pauseBrowser}
            disabled={!browserIsOpen}
          >
            {browserIsPaused ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="3" height="14" fill="currentColor" />
                <polygon points="10,5 20,12 10,19" fill="currentColor" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                <rect x="14" y="4" width="4" height="16" fill="currentColor" />
              </svg>
            )}
          </button>
          <div className="rcd-assert-container">
            <button
              className={`rcd-ctrl rcd-assert ${assertHook.isAssertDropdownOpen || assertHook.selectedAssert ? 'active' : ''}`}
              disabled={!browserIsOpen || browserExecutingActionIndex !== null }
              title="Assert"
              onClick={assertHook.handleAssertClick}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {assertHook.isAssertDropdownOpen && (
              <div className="rcd-assert-dropdown">
                <div className="rcd-assert-search">
                  <input
                    type="text"
                    placeholder="Search assert types..."
                    value={assertHook.assertSearch}
                    onChange={(e) => assertHook.setAssertSearch(e.target.value)}
                    className="rcd-assert-search-input"
                  />
                </div>
                <div className="rcd-assert-list">
                  {assertHook.filteredAssertTypes.map((type, index) => (
                    <div
                      key={index}
                      className="rcd-assert-item"
                      onClick={() => assertHook.handleAssertSelect(type)}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {assertHook.selectedAssert && (
        <div className="rcd-selected-assert">
          <div className="rcd-selected-assert-content">
            <span className="rcd-selected-assert-label">Selected Assert:</span>
            <span className="rcd-selected-assert-type">{assertHook.selectedAssert}</span>
            <button
              className="rcd-selected-assert-remove"
              onClick={assertHook.removeSelectedAssert}
              title="Remove selected assert"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="rcd-content">
        {activeTab === 'actions' ? (
          <ActionTab 
            actions={actionsHook.actions} 
            isLoading={actionsHook.isLoading} 
            isReloading={actionsHook.isLoading}
            isSaving={actionsHook.isSaving}
            onDeleteAction={actionsHook.handleDeleteAction} 
            onDeleteAll={handleDeleteAllActions} 
            onReorderActions={actionsHook.handleReorderActions} 
            onReload={reloadAll}
            onSaveActions={saveAll}
            selectedInsertPosition={actionsHook.selectedInsertPosition}
            displayInsertPosition={actionsHook.displayInsertPosition}
            onSelectInsertPosition={handleSelectInsertPosition}
            onSelectAction={handleSelectAction}
            onStartRecording={browserHook.handleStartRecordingFromAction}
            onContinueExecution={browserHook.continueExecution}
            isBrowserOpen={browserIsOpen}
            recordingFromActionIndex={browserRecordingFromActionIndex}
            failedActionMessage={browserHook.failedActionMessage}
            onAddAction={handleAddAction}
            isAddActionOpen={modals.isAddActionOpen}
            onCloseAddAction={() => modals.setIsAddActionOpen(false)}
            testcaseId={testcaseId}
            onActionsChange={actionsHook.handleActionsChange}
            onInsertPositionChange={actionsHook.setSelectedInsertPosition}
            onDisplayPositionChange={actionsHook.setDisplayInsertPosition}
            executingActionIndex={browserExecutingActionIndex}
            failedActionIndex={browserFailedActionIndex}
            onOpenBasicAuth={handleOpenBasicAuth}
            basicAuthStatus={basicAuthHook.basicAuthStatus}
            onBasicAuthStatusClear={basicAuthHook.handleBasicAuthStatusClear}
            projectId={projectId}
            navigateSelectedPageInfo={pageSelection.navigateSelectedPageInfo}
            onNavigatePageInfoChange={(pageInfo) => {
              pageSelection.setNavigateSelectedPageInfo(pageInfo);
            }}
            browserActionSelectedPageInfo={pageSelection.browserActionSelectedPageInfo}
            onBrowserActionPageInfoChange={(pageInfo) => {
              pageSelection.setBrowserActionSelectedPageInfo(pageInfo);
            }}
            addBrowserStorageSelectedPageInfo={pageSelection.addBrowserStorageSelectedPageInfo}
            onAddBrowserStoragePageInfoChange={(pageInfo) => {
              pageSelection.setAddBrowserStorageSelectedPageInfo(pageInfo);
            }}
            apiRequestSelectedPageInfo={pageSelection.apiRequestSelectedPageInfo}
            onApiRequestPageInfoChange={(pageInfo) => {
              pageSelection.setApiRequestSelectedPageInfo(pageInfo);
            }}
            testcaseDataVersions={testcaseDataVersions}
            onTestCaseDataVersionsChange={(updater) => {
              setTestCaseDataVersions(updater);
            }}
            onModalStateChange={(modalType: 'wait' | 'navigate' | 'api_request' | 'add_browser_storage' | 'database_execution' | 'browser_action', isOpen: boolean) => {
              switch (modalType) {
                case 'wait':
                  modals.setIsActionTabWaitOpen(isOpen);
                  break;
                case 'navigate':
                  modals.setIsActionTabNavigateOpen(isOpen);
                  if (!isOpen) {
                    pageSelection.setNavigateSelectedPageInfo(null);
                  }
                  break;
                case 'api_request':
                  modals.setIsActionTabApiRequestOpen(isOpen);
                  if (!isOpen) {
                    pageSelection.setApiRequestSelectedPageInfo(null);
                  }
                  break;
                case 'add_browser_storage':
                  modals.setIsActionTabAddBrowserStorageOpen(isOpen);
                  if (!isOpen) {
                    pageSelection.setAddBrowserStorageSelectedPageInfo(null);
                  }
                  break;
                case 'database_execution':
                  modals.setIsDatabaseExecutionOpen(isOpen);
                  break;
                case 'browser_action':
                  modals.setIsActionTabBrowserActionOpen(isOpen);
                  if (!isOpen) {
                    pageSelection.setBrowserActionSelectedPageInfo(null);
                  }
                  break;
              }
            }}
          />
        ) : (
          <TestScriptTab 
            script={browserIsGeneratingCode ? '// Wait for generation code...\n// Please wait while the code is being generated from the server...' : (customScript || '// No code available. Please switch to actions tab and back to generate code.')} 
            runResult={browserRunResult} 
            onScriptChange={setCustomScript} 
            hasActions={actionsHook.actions.length > 0} 
          />
        )}
      </div>
      <ActionToCodeTab 
        onConvert={handleTabSwitch} 
        onRun={browserHook.handleRunScript} 
        onSaveAndClose={handleSaveAndClose}
        isRunning={browserIsRunningScript}
        activeTab={activeTab} 
        actions={actionsHook.actions} 
      />
      
      <DeleteAllActions
        isOpen={modals.isDeleteAllOpen}
        onClose={() => modals.setIsDeleteAllOpen(false)}
        onDelete={handleConfirmDeleteAll}
        testcaseId={testcaseId}
      />

      <ActionDetailModal
        isOpen={modals.isDetailOpen}
        action={selectedAction}
        onClose={() => modals.setIsDetailOpen(false)}
        onSave={handleUpdateAction}
        testcaseDataVersions={testcaseDataVersions}
        onTestCaseDataVersionsChange={(updater) => {
          setTestCaseDataVersions(updater);
        }}
        allActions={actionsHook.actions}
      />

      <AiAssertModal
        isOpen={modals.isAiModalOpen}
        testcaseId={testcaseId}
        prompt={aiAssertHook.aiPrompt}
        elements={aiAssertHook.aiElements}
        isGenerating={aiAssertHook.isGeneratingAi}
        onChangePrompt={aiAssertHook.setAiPrompt}
        onChangeElement={(idx, updater) => aiAssertHook.setAiElements(prev => prev.map((el, i) => i === idx ? updater(el) : el))}
        onRemoveElement={(idx) => aiAssertHook.setAiElements(prev => prev.filter((_, i) => i !== idx))}
        onClose={async () => { 
          modals.setIsAiModalOpen(false); 
          aiAssertHook.resetAiAssert();
          assertHook.setSelectedAssert(null);
          assertHook.setIsAssertMode(false);
          assertHook.setIsAssertDropdownOpen(false);
          assertHook.setAssertSearch('');
          pageSelection.setAiAssertSelectedPageInfo(null);
          await (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
        }}
        onSubmit={aiAssertHook.handleAiSubmit}
        onAddBrowserElement={aiAssertHook.handleAiAddBrowserElement}
        onAddDatabaseElement={aiAssertHook.handleAiAddDatabaseElement}
        onAddApiElement={aiAssertHook.handleAiAddApiElement}
        onBrowserElementClear={aiAssertHook.handleAiClearBrowserElement}
        selectedPageInfo={pageSelection.aiAssertSelectedPageInfo}
        onClearPage={() => {
          pageSelection.setAiAssertSelectedPageInfo(null);
        }}
      />
      <BasicAuthModal
        isOpen={modals.isBasicAuthOpen}
        testcaseId={testcaseId}
        onClose={() => modals.setIsBasicAuthOpen(false)}
        basicAuth={basicAuthHook.basicAuth}
        onSaved={(auth) => {
          if (auth) {
            basicAuthHook.handleBasicAuthSaved(auth);
          }
        }}
      />
      <ConfirmCloseModal
        isOpen={modals.isConfirmCloseOpen}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
        onSaveAndClose={handleSaveAndClose}
        hasUnsavedDatas={unsavedChanges.hasUnsavedActions}
      />
      <URLInputModal
        isOpen={modals.isUrlInputOpen}
        onClose={() => {
          assertHook.handleUrlCancel();
          pageSelection.setUrlInputSelectedPageInfo(null);
        }}
        onConfirm={assertHook.handleUrlConfirm}
        selectedPageInfo={pageSelection.urlInputSelectedPageInfo}
        onClearPage={() => {
          pageSelection.setUrlInputSelectedPageInfo(null);
        }}
      />
      <TitleInputModal
        isOpen={modals.isTitleInputOpen}
        onClose={() => {
          assertHook.handleTitleCancel();
          pageSelection.setTitleInputSelectedPageInfo(null);
        }}
        onConfirm={assertHook.handleTitleConfirm}
        selectedPageInfo={pageSelection.titleInputSelectedPageInfo}
        onClearPage={() => {
          pageSelection.setTitleInputSelectedPageInfo(null);
        }}
      />
      <CSSAssertModal
        isOpen={modals.isCssInputOpen}
        onClose={() => {
          assertHook.handleCssCancel();
          pageSelection.setCssInputSelectedPageInfo(null);
          pageSelection.setCssInputSelectedElement(null);
        }}
        onConfirm={assertHook.handleCssConfirm}
        selectedPageInfo={pageSelection.cssInputSelectedPageInfo}
        selectedElement={pageSelection.cssInputSelectedElement}
        onPageInfoChange={(pageInfo) => {
          pageSelection.setCssInputSelectedPageInfo(pageInfo);
        }}
        onClearPage={() => {
          pageSelection.setCssInputSelectedPageInfo(null);
        }}
        onClearElement={() => {
          pageSelection.setCssInputSelectedElement(null);
        }}
      />
      <AssertWithValueModal
        isOpen={modals.isAssertWithValueModalOpen}
        testcaseId={testcaseId}
        assertType={assertHook.selectedAssert || 'toHaveText'}
        onClose={async () => { 
          modals.setIsAssertWithValueModalOpen(false); 
          assertHook.setSelectedAssert(null);
          assertHook.setIsAssertMode(false);
          assertHook.setIsAssertDropdownOpen(false);
          assertHook.setAssertSearch('');
          pageSelection.setAssertWithValueSelectedPageInfo(null);
          pageSelection.setAssertWithValueSelectedElement(null);
          await (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
        }}
        onConfirm={async (value, element, pageInfo, statement, apiRequest, valueSourceType) => {
          const result = await assertWithValueHook.handleConfirm(
            value,
            element,
            pageInfo,
            statement,
            apiRequest,
            valueSourceType
          );
          if (result) {
            modals.setIsAssertWithValueModalOpen(false);
            pageSelection.setAssertWithValueSelectedPageInfo(null);
            pageSelection.setAssertWithValueSelectedElement(null);
          }
        }}
        selectedPageInfo={pageSelection.assertWithValueSelectedPageInfo}
        onPageInfoChange={(pageInfo) => {
          pageSelection.setAssertWithValueSelectedPageInfo(pageInfo);
        }}
        onClearPage={() => {
          pageSelection.setAssertWithValueSelectedPageInfo(null);
        }}
        selectedElement={pageSelection.assertWithValueSelectedElement}
        onClearElement={() => {
          pageSelection.setAssertWithValueSelectedElement(null);
        }}
      />
      <CheckDuplicateElementModal
        isOpen={duplicateCheck.isModalOpen}
        duplicateGroup={duplicateCheck.currentGroup}
        currentGroupIndex={duplicateCheck.currentGroupIndex}
        totalGroups={duplicateCheck.totalGroups}
        onConfirm={duplicateCheck.handleConfirm}
        onCancel={duplicateCheck.handleCancel}
      />
    </div>
  );
};

export default Main;
