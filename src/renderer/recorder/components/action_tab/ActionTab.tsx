import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import './ActionTab.css';
import RenderedAction from '../action/Action';
import AddActionModal from '../add_action_modal/AddActionModal';
import DatabaseExecutionModal from '../add_action_modal/database_execution_modal/DatabaseExecutionModal';
import WaitModal from '../add_action_modal/wait_modal/WaitModal';
import NavigateModal, { SelectedPageInfo as NavigateSelectedPageInfo } from '../add_action_modal/navigate_modal/NavigateModal';
import ApiRequestModal, { SelectedPageInfo as ApiRequestSelectedPageInfo } from '../add_action_modal/api_request_modal/ApiRequestModal';
import BrowserActionModal, { BrowserActionType, SelectedPageInfo as BrowserActionSelectedPageInfo } from '../add_action_modal/browser_action_modal/BrowserActionModal';
import { Action, ActionType, AssertType, Connection, ApiRequestData, TestCaseDataVersion } from '../../types/actions';
import { receiveActionWithInsert } from '../../utils/receive_action';
import { BrowserStorageResponse } from '../../types/browser_storage';
import AddBrowserStorageModal, { SelectedPageInfo as AddBrowserStorageSelectedPageInfo } from '../add_action_modal/add_browser_storage_modal/AddBrowserStorageModal';
import DataVersionModal from '../data_versions/DataVersionModal';
import { toast } from 'react-toastify';

export type ActionOperationResult = {
  success: boolean;
  message?: string;
  level?: 'success' | 'warning' | 'error';
};

interface ActionTabProps {
  actions: Action[];
  isLoading: boolean;
  isReloading?: boolean;
  isSaving?: boolean;
  onDeleteAction?: (actionId: string) => void;
  onDeleteAll?: () => void;
  onReorderActions?: (reorderedActions: Action[]) => void;
  onReload?: () => Promise<ActionOperationResult | void> | ActionOperationResult | void;
  onSaveActions?: (testcaseDataVersions?: TestCaseDataVersion[]) => Promise<ActionOperationResult | void> | ActionOperationResult | void;
  selectedInsertPosition?: number;
  displayInsertPosition?: number;
  onSelectInsertPosition?: (position: number | null) => void;
  onSelectAction?: (action: Action) => void;
  onStartRecording?: (actionIndex: number) => void;
  onContinueExecution?: (actionIndex: number) => void;
  isBrowserOpen?: boolean;
  recordingFromActionIndex?: number | null;
  onAddAction?: () => void;
  isAddActionOpen?: boolean;
  onCloseAddAction?: () => void;
  testcaseId?: string | null;
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
  onInsertPositionChange?: (position: number) => void;
  onDisplayPositionChange?: (position: number) => void;
  executingActionIndex?: number | null;
  failedActionIndex?: number | null;
  failedActionMessage?: string | null;
  onOpenBasicAuth?: () => void;
  projectId?: string | null;
  basicAuthStatus?: 'idle' | 'success';
  onBasicAuthStatusClear?: () => void;
  onModalStateChange?: (modalType: 'wait' | 'navigate' | 'api_request' | 'add_browser_storage' | 'database_execution' | 'browser_action', isOpen: boolean) => void;
  navigateSelectedPageInfo?: NavigateSelectedPageInfo | null;
  onNavigatePageInfoChange?: (pageInfo: NavigateSelectedPageInfo | null) => void;
  browserActionSelectedPageInfo?: BrowserActionSelectedPageInfo | null;
  onBrowserActionPageInfoChange?: (pageInfo: BrowserActionSelectedPageInfo | null) => void;
  addBrowserStorageSelectedPageInfo?: AddBrowserStorageSelectedPageInfo | null;
  onAddBrowserStoragePageInfoChange?: (pageInfo: AddBrowserStorageSelectedPageInfo | null) => void;
  apiRequestSelectedPageInfo?: ApiRequestSelectedPageInfo | null;
  onApiRequestPageInfoChange?: (pageInfo: ApiRequestSelectedPageInfo | null) => void;
  testcaseDataVersions?: import('../../types/testcase').TestCaseDataVersion[];
  onTestCaseDataVersionsChange?: (updater: (prev: import('../../types/testcase').TestCaseDataVersion[]) => import('../../types/testcase').TestCaseDataVersion[]) => void;
}

const ActionTab: React.FC<ActionTabProps> = ({
  actions,
  isLoading,
  isReloading,
  isSaving,
  onDeleteAction,
  onDeleteAll,
  onReorderActions,
  onReload,
  onSaveActions,
  selectedInsertPosition,
  displayInsertPosition,
  onSelectInsertPosition,
  onSelectAction,
  onStartRecording,
  onContinueExecution,
  isBrowserOpen,
  recordingFromActionIndex,
  onAddAction,
  isAddActionOpen,
  onCloseAddAction,
  testcaseId,
  onActionsChange,
  onInsertPositionChange,
  onDisplayPositionChange,
  executingActionIndex,
  failedActionIndex,
  failedActionMessage,
  onOpenBasicAuth,
  projectId,
  basicAuthStatus,
  onBasicAuthStatusClear,
  onModalStateChange,
  navigateSelectedPageInfo: propNavigateSelectedPageInfo,
  onNavigatePageInfoChange,
  browserActionSelectedPageInfo: propBrowserActionSelectedPageInfo,
  onBrowserActionPageInfoChange,
  addBrowserStorageSelectedPageInfo: propAddBrowserStorageSelectedPageInfo,
  onAddBrowserStoragePageInfoChange,
  apiRequestSelectedPageInfo: propApiRequestSelectedPageInfo,
  onApiRequestPageInfoChange,
  testcaseDataVersions: propTestCaseDataVersions,
  onTestCaseDataVersionsChange
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDatabaseExecutionOpen, setIsDatabaseExecutionOpen] = useState(false);
  const [isWaitOpen, setIsWaitOpen] = useState(false);
  const [isNavigateOpen, setIsNavigateOpen] = useState(false);
  const [isApiRequestOpen, setIsApiRequestOpen] = useState(false);
  const [isAddBrowserStorageOpen, setIsAddBrowserStorageOpen] = useState(false);
  const [isBrowserActionOpen, setIsBrowserActionOpen] = useState(false);
  const [browserActionType, setBrowserActionType] = useState<BrowserActionType>('back');
  const [navigateSelectedPageInfo, setNavigateSelectedPageInfo] = useState<NavigateSelectedPageInfo | null>(null);
  const [browserActionSelectedPageInfo, setBrowserActionSelectedPageInfo] = useState<BrowserActionSelectedPageInfo | null>(null);
  const [addBrowserStorageSelectedPageInfo, setAddBrowserStorageSelectedPageInfo] = useState<AddBrowserStorageSelectedPageInfo | null>(null);
  const [apiRequestSelectedPageInfo, setApiRequestSelectedPageInfo] = useState<ApiRequestSelectedPageInfo | null>(null);
  const [isDataVersionModalOpen, setIsDataVersionModalOpen] = useState(false);
  // Use testcaseDataVersions from props (managed by Main component)
  const testcaseDataVersions = propTestCaseDataVersions || [];
  
  // Get current version name from actions
  const currentVersionName = useMemo(() => {
    // Tìm currentVersion từ action đầu tiên có action_data_generation
    for (const action of actions) {
      if (action.action_data_generation && action.action_data_generation.length > 0) {
        for (const ad of action.action_datas || []) {
          if (ad.value && typeof ad.value === 'object' && ad.value.currentVersion) {
            const versionName = String(ad.value.currentVersion);
            // Tìm version tương ứng trong testcaseDataVersions
            const version = testcaseDataVersions.find(v => v.version === versionName);
            if (version && version.version) {
              return version.version;
            }
            return versionName;
          }
        }
      }
    }
    return null;
  }, [actions, testcaseDataVersions]);
  
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [reloadStatus, setReloadStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const reloadTimeoutRef = useRef<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const basicAuthTimeoutRef = useRef<number | null>(null);
  const successDisplayDuration = 1600;

  const clearReloadTimeout = () => {
    if (reloadTimeoutRef.current != null) {
      window.clearTimeout(reloadTimeoutRef.current);
      reloadTimeoutRef.current = null;
    }
  };

  const clearSaveTimeout = () => {
    if (saveTimeoutRef.current != null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  const clearBasicAuthTimeout = () => {
    if (basicAuthTimeoutRef.current != null) {
      window.clearTimeout(basicAuthTimeoutRef.current);
      basicAuthTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearReloadTimeout();
      clearSaveTimeout();
      clearBasicAuthTimeout();
    };
  }, []);

  useEffect(() => {
    if (basicAuthStatus !== 'success' || !onBasicAuthStatusClear) {
      clearBasicAuthTimeout();
      return;
    }

    clearBasicAuthTimeout();
    basicAuthTimeoutRef.current = window.setTimeout(() => {
      onBasicAuthStatusClear();
      basicAuthTimeoutRef.current = null;
    }, successDisplayDuration);

    return () => {
      clearBasicAuthTimeout();
    };
  }, [basicAuthStatus, onBasicAuthStatusClear]);

  // Wrapper function to update testcaseDataVersions in Main component
  const handleTestCaseDataVersionsChange = useCallback((updater: (prev: TestCaseDataVersion[]) => TestCaseDataVersion[]) => {
    if (onTestCaseDataVersionsChange) {
      onTestCaseDataVersionsChange(updater);
    }
  }, [onTestCaseDataVersionsChange]);

  const successIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="success">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5L10.5 15L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const shouldShowReloadSpinner = reloadStatus === 'loading' || (reloadStatus === 'idle' && !!isReloading);
  const shouldShowSaveSpinner = saveStatus === 'loading' || (saveStatus === 'idle' && !!isSaving);
  const isAddActionDisabled = !!executingActionIndex || isBrowserOpen === false;
  const isExecutingAction = executingActionIndex != null;

  const setReloadSuccessWithTimeout = () => {
    clearReloadTimeout();
    setReloadStatus('success');
    reloadTimeoutRef.current = window.setTimeout(() => {
      setReloadStatus('idle');
      reloadTimeoutRef.current = null;
    }, successDisplayDuration);
  };

  const setSaveSuccessWithTimeout = () => {
    clearSaveTimeout();
    setSaveStatus('success');
    saveTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus('idle');
      saveTimeoutRef.current = null;
    }, successDisplayDuration);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Tạo mảng mới với thứ tự đã thay đổi
    const newActions = [...actions];
    const draggedAction = newActions[draggedIndex];

    // Xóa action khỏi vị trí cũ
    newActions.splice(draggedIndex, 1);

    // Điều chỉnh dropIndex nếu cần (khi drop vào vị trí cuối)
    const adjustedDropIndex = dropIndex > actions.length - 1 ? actions.length - 1 : dropIndex;

    // Chèn action vào vị trí mới
    newActions.splice(adjustedDropIndex, 0, draggedAction);

    // Cập nhật state và gọi callback
    if (onReorderActions) {
      onReorderActions(newActions);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleSelectDatabaseExecution = () => {
    setIsDatabaseExecutionOpen(true);
    onModalStateChange?.('database_execution', true);
  };

  const handleSelectApiRequest = () => {
    setIsApiRequestOpen(true);
    onModalStateChange?.('api_request', true);
  };

  const handleApiRequestConfirm = (apiData: ApiRequestData, pageInfo?: ApiRequestSelectedPageInfo) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;

    const method = (apiData.method || 'get').toUpperCase();
    const url = apiData.url || '';
    const desc = `API Request: ${method} ${url}`;
    var actionDatas: any[] = [
      {
        api_request: apiData,
      }
    ];
    if (pageInfo) {
      actionDatas.push({
        value: {
          page_index: pageInfo.page_index,
        },
      });
    }

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: ActionType.api_request,
      description: desc,
      action_datas: actionDatas,
    } as any;

    onActionsChange(prev => {
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );
      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });

    setIsApiRequestOpen(false);
    onModalStateChange?.('api_request', false);
  };

  const handleSelectWait = () => {
    setIsWaitOpen(true);
    onModalStateChange?.('wait', true);
  };

  const handleSelectNavigate = () => {
    setIsNavigateOpen(true);
    onModalStateChange?.('navigate', true);
  };

  const handleSelectAddBrowserStorage = () => {
    setIsAddBrowserStorageOpen(true);
    onModalStateChange?.('add_browser_storage', true);
  };

  const normalizeResult = (result?: ActionOperationResult | void): ActionOperationResult => {
    if (!result) {
      return { success: true };
    }
    return result;
  };

  const handleReloadClick = async () => {
    if (!onReload) {
      return;
    }

    if (reloadStatus === 'loading' || isReloading || isExecutingAction) {
      return;
    }

    clearReloadTimeout();
    setReloadStatus('loading');

    try {
      const rawResult = await onReload();
      const normalized = normalizeResult(rawResult);

      if (normalized.success) {
        setReloadSuccessWithTimeout();
      } else {
        setReloadStatus('idle');
      }
    } catch (error) {
      setReloadStatus('idle');
    }
  };

  const handleSaveClick = async () => {
    if (!onSaveActions) {
      return;
    }

    if (saveStatus === 'loading' || isSaving) {
      return;
    }

    clearSaveTimeout();
    setSaveStatus('loading');

    try {
      if (testcaseDataVersions.length === 0) {
        toast.error('No testcase data versions found');
        return;
      }
      const rawResult = await onSaveActions(testcaseDataVersions);
      const normalized = normalizeResult(rawResult);
      if (normalized.success) {
        setSaveSuccessWithTimeout();
        // ❌ XÓA phần này - Main.tsx đã xử lý reload rồi
        // // Clear testcaseDataVersions after successful save
        // if (onTestCaseDataVersionsChange) {
        //   onTestCaseDataVersionsChange(() => []);
        // }
      } else {
        setSaveStatus('idle');
      }
    } catch (error) {
      setSaveStatus('idle');
    }
  };

  const handleNavigateConfirm = async (url: string, pageInfo?: NavigateSelectedPageInfo) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;
    const actionDatas: any[] = [
      {
        value: {
          value: url,
        },
      }
    ];

    if (pageInfo) {
      actionDatas.push({
        value: {
          page_index: pageInfo.page_index,
        },
      });
    }

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: ActionType.navigate,
      action_datas: actionDatas,
      description: pageInfo ? `Navigate to ${url} on page ${pageInfo.page_title || pageInfo.page_url}` : `Navigate to ${url}`,
    } as any;
    onActionsChange(prev => {
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );
      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });
    setIsNavigateOpen(false);
    setNavigateSelectedPageInfo(null);
    onModalStateChange?.('navigate', false);
    onNavigatePageInfoChange?.(null);
    await (window as any).browserAPI?.browser.navigate(url);
    // toast.success('Added navigate action');
  }

  const handleWaitConfirm = async (ms: any) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;
    const actionDatas: any[] = [
      {
        value: {
          value: String(ms),
        },
      }
    ];

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: ActionType.wait,
      action_datas: actionDatas,
      description: `Wait for ${ms} ms`,
    };
    onActionsChange(prev => {
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );
      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });
    setIsWaitOpen(false);
    onModalStateChange?.('wait', false);
    // toast.success('Added wait action');
  }

  useEffect(() => {
    if (!isNavigateOpen) {
      setNavigateSelectedPageInfo(null);
      onNavigatePageInfoChange?.(null);
    }
  }, [isNavigateOpen, onNavigatePageInfoChange]);

  useEffect(() => {
    if (!isBrowserActionOpen) {
      setBrowserActionSelectedPageInfo(null);
      onBrowserActionPageInfoChange?.(null);
    }
  }, [isBrowserActionOpen, onBrowserActionPageInfoChange]);

  useEffect(() => {
    if (!isAddBrowserStorageOpen) {
      setAddBrowserStorageSelectedPageInfo(null);
      onAddBrowserStoragePageInfoChange?.(null);
    }
  }, [isAddBrowserStorageOpen, onAddBrowserStoragePageInfoChange]);

  useEffect(() => {
    if (!isApiRequestOpen) {
      setApiRequestSelectedPageInfo(null);
      onApiRequestPageInfoChange?.(null);
    }
  }, [isApiRequestOpen, onApiRequestPageInfoChange]);

  const handleBrowserActionConfirm = async (pageInfo: BrowserActionSelectedPageInfo) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;

    const actionDatas: any[] = [];

    if (pageInfo) {
      actionDatas.push({
        value: {
          page_index: pageInfo.page_index,
        },
      });
    }

    let actionType: ActionType;
    let description: string;
    let browserMethod: string;

    switch (browserActionType) {
      case 'back':
        actionType = ActionType.back;
        description = pageInfo ? `Go back on page ${pageInfo.page_title || pageInfo.page_url}` : 'Go back to previous page';
        browserMethod = 'goBack';
        break;
      case 'forward':
        actionType = ActionType.forward;
        description = pageInfo ? `Go forward on page ${pageInfo.page_title || pageInfo.page_url}` : 'Go forward to next page';
        browserMethod = 'goForward';
        break;
      case 'reload':
        actionType = ActionType.reload;
        description = pageInfo ? `Reload page ${pageInfo.page_title || pageInfo.page_url}` : 'Reload current page';
        browserMethod = 'reload';
        break;
      default:
        return;
    }

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: actionType,
      action_datas: actionDatas,
      description: description,
    } as any;

    onActionsChange(prev => {
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );
      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });

    setIsBrowserActionOpen(false);
    setBrowserActionSelectedPageInfo(null);
    onModalStateChange?.('browser_action', false);
    onBrowserActionPageInfoChange?.(null);

    // Gọi browser API method
    if (browserMethod && (window as any).browserAPI?.browser?.[browserMethod]) {
      await (window as any).browserAPI.browser[browserMethod](pageInfo.page_index);
    }
  };

  const handleAddBrowserStorageConfirm = async (selectedBrowserStorage: BrowserStorageResponse, pageInfo?: AddBrowserStorageSelectedPageInfo) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;
    const actionDatas: any[] = [
      {
        browser_storage: {
          browser_storage_id: selectedBrowserStorage.browser_storage_id,
          name: selectedBrowserStorage.name,
          description: selectedBrowserStorage.description,
          value: selectedBrowserStorage.value,
          storage_type: selectedBrowserStorage.storage_type,
        },
      }
    ];

    if (pageInfo) {
      actionDatas[0].value = {
        page_index: pageInfo.page_index,
        page_url: pageInfo.page_url,
        page_title: pageInfo.page_title,
      };
    }

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: ActionType.add_browser_storage,
      action_datas: actionDatas,
      description: pageInfo ? `Add browser storage: ${selectedBrowserStorage.name} on page ${pageInfo.page_title || pageInfo.page_url}` : `Add browser storage: ${selectedBrowserStorage.name}`,
    } as any;
    // console.log("cookies action:", newAction);
    onActionsChange(prev => {
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );
      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });
    setIsAddBrowserStorageOpen(false);
    onModalStateChange?.('add_browser_storage', false);
    await (window as any).browserAPI?.browser?.addBrowserStorage(selectedBrowserStorage.storage_type, JSON.stringify(selectedBrowserStorage.value), pageInfo?.page_index);
    // toast.success('Added cookies action');
  }

  const handleDatabaseExecutionConfirm = (query: string, connectionId: string, connection: Connection) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;

    const newAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
      action_type: ActionType.database_execution,
      action_datas: [
        {
          statement: {
            statement_id: Math.random().toString(36),
            statement_text: query,
            connection: connection,
          },
        }
      ]
    }

    onActionsChange(prev => {
      const next = receiveActionWithInsert(
        testcaseId,
        prev,
        newAction,
        selectedInsertPosition || 0
      );

      // console.log("Next actions:", next);

      const added = next.length > prev.length;
      if (added) {
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        onInsertPositionChange(newPos);
        onDisplayPositionChange(newPos);
      }
      return next;
    });

    setIsDatabaseExecutionOpen(false);
    onModalStateChange?.('database_execution', false);
    // toast.success('Added database execution action');

  };


  const handleSelectAddAction = async (actionType: string) => {
    if (!onActionsChange || !onInsertPositionChange || !onDisplayPositionChange || !testcaseId) return;


    if (actionType === 'database_execution') {
      // console.log("Database execution handled by modal, not adding to list");
      return;
    }
    if (actionType === 'wait') {
      handleSelectWait();
      return;
    }

    if (actionType === 'navigate') {
      handleSelectNavigate();
      return;
    }

    if (actionType === 'add_cookies') {
      handleSelectAddBrowserStorage();
      return;
    }

    // Xử lý các browser actions (back, forward, reload) - sẽ mở modal
    if (actionType === 'back' || actionType === 'forward' || actionType === 'reload') {
      setBrowserActionType(actionType as BrowserActionType);
      setIsBrowserActionOpen(true);
      onModalStateChange?.('browser_action', true);
      return;
    }

    const newAction = await createActionByType(actionType);

    if (newAction) {
      onActionsChange(prev => {

        const next = receiveActionWithInsert(
          testcaseId,
          prev,
          newAction,
          selectedInsertPosition || 0
        );

        const added = next.length > prev.length;
        if (added) {
          const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
          onInsertPositionChange(newPos);
          onDisplayPositionChange(newPos);
        }
        return next;
      });
      // toast.success(`Added ${actionType} action`);
    } else {
      // Chỉ log error nếu không phải là action type được xử lý bởi modal
      const modalHandledTypes = ['back', 'forward', 'reload', 'api_request', 'database_execution'];
      if (!modalHandledTypes.includes(actionType)) {
        console.error("Failed to create action for type:", actionType);
      }
    }
  };

  const createActionByType = async (actionType: string): Promise<any> => {
    if (!testcaseId) return null;

    const baseAction = {
      testcase_id: testcaseId,
      action_id: Math.random().toString(36),
    };

    switch (actionType) {
      case 'reload':
      case 'back':
      case 'forward':
        // Mở browser action modal để chọn page
        setBrowserActionType(actionType as BrowserActionType);
        setIsBrowserActionOpen(true);
        onModalStateChange?.('browser_action', true);
        return null;

      case 'database_execution':
        // This will be handled by the modal
        // console.log("Database execution will be handled by modal");
        handleSelectDatabaseExecution();
        return null;

      case 'api_request':
        // This will be handled by the modal
        // console.log("API request will be handled by modal");
        handleSelectApiRequest();
        return null;

      case 'visit_url':
        const visitAction = {
          ...baseAction,
          action_type: ActionType.navigate,
          url: 'https://example.com',
          value: 'https://example.com',
          playwright_code: 'await page.goto("https://example.com");',
          description: 'Navigate to URL',
        };
        // console.log("Created visit_url action:", visitAction);
        await (window as any).browserAPI?.browser?.navigate(visitAction.value as string);
        return visitAction;

      default:
        // console.error('Unknown action type:', actionType);
        return null;
    }
  };

  useEffect(() => {
    if (recordingFromActionIndex == null) return;
    const node = itemRefs.current[recordingFromActionIndex];
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch { }
  }, [recordingFromActionIndex]);

  // Ensure the selected insert position is visible (the action before the insertion point)
  useEffect(() => {
    if (selectedInsertPosition == null) return;
    const targetIndex = Math.max(0, Math.min(selectedInsertPosition - 1, actions.length - 1));
    const node = itemRefs.current[targetIndex];
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch { }
  }, [selectedInsertPosition, actions.length]);

  // Auto-scroll to the currently executing or failed action
  useEffect(() => {
    const targetIndex = (failedActionIndex != null) ? failedActionIndex : executingActionIndex;
    if (targetIndex == null) return;
    const node = itemRefs.current[targetIndex];
    if (!node) return;
    try {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch { }
  }, [executingActionIndex, failedActionIndex]);

  return (
    <div className="rcd-actions-section">
      <div className="rcd-actions-header">
        <div className="rcd-actions-header-left">
          <h3 className="rcd-actions-title">Actions</h3>
          <div className="rcd-actions-insert-info">
            {currentVersionName ? `Version: ${currentVersionName}` : `Inserting at position #${selectedInsertPosition}`}
          </div>
        </div>
        <div className="rcd-actions-buttons">
          <button
            className="rcd-action-btn auth"
            title="Add Basic Http Authentication"
            onClick={() => onOpenBasicAuth && onOpenBasicAuth()}
          >
            {basicAuthStatus === 'success' ? (
              successIcon
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1C9.79086 1 8 2.79086 8 5V7H7C5.34315 7 4 8.34315 4 10V18C4 19.6569 5.34315 21 7 21H17C18.6569 21 20 19.6569 20 18V10C20 8.34315 18.6569 7 17 7H16V5C16 2.79086 14.2091 1 12 1ZM14 7V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V7H14Z" fill="currentColor" />
              </svg>
            )}
          </button>
          <div className="rcd-add-action-container">
            <button
              className="rcd-action-btn add"
              title="Add new action"
              onClick={() => onAddAction && onAddAction()}
              disabled={isAddActionDisabled}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <AddActionModal
              isOpen={isAddActionOpen || false}
              onClose={() => onCloseAddAction && onCloseAddAction()}
              onSelectAction={handleSelectAddAction}
              onSelectDatabaseExecution={handleSelectDatabaseExecution}
              onSelectAddBrowserStorage={handleSelectAddBrowserStorage}
              onSelectApiRequest={handleSelectApiRequest}
            />
            <ApiRequestModal
              isOpen={isApiRequestOpen}
              onClose={() => {
                setIsApiRequestOpen(false);
                onModalStateChange?.('api_request', false);
              }}
              onConfirm={handleApiRequestConfirm}
              selectedPageInfo={propApiRequestSelectedPageInfo || apiRequestSelectedPageInfo}
              onClearPage={() => {
                setApiRequestSelectedPageInfo(null);
                onApiRequestPageInfoChange?.(null);
              }}
            />
            <DatabaseExecutionModal
              isOpen={isDatabaseExecutionOpen}
              onClose={() => {
                setIsDatabaseExecutionOpen(false);
                onModalStateChange?.('database_execution', false);
              }}
              onConfirm={handleDatabaseExecutionConfirm}
            />
            <WaitModal
              isOpen={isWaitOpen}
              onClose={() => {
                setIsWaitOpen(false);
                onModalStateChange?.('wait', false);
              }}
              onConfirm={handleWaitConfirm}
            />
            <NavigateModal
              isOpen={isNavigateOpen}
              onClose={() => {
                setIsNavigateOpen(false);
                setNavigateSelectedPageInfo(null);
                onModalStateChange?.('navigate', false);
                onNavigatePageInfoChange?.(null);
              }}
              onConfirm={handleNavigateConfirm}
              selectedPageInfo={propNavigateSelectedPageInfo || navigateSelectedPageInfo}
              onClearPage={() => {
                setNavigateSelectedPageInfo(null);
                onNavigatePageInfoChange?.(null);
              }}
            />
            <BrowserActionModal
              isOpen={isBrowserActionOpen}
              actionType={browserActionType}
              onClose={() => {
                setIsBrowserActionOpen(false);
                setBrowserActionSelectedPageInfo(null);
                onModalStateChange?.('browser_action', false);
                onBrowserActionPageInfoChange?.(null);
              }}
              onConfirm={handleBrowserActionConfirm}
              selectedPageInfo={propBrowserActionSelectedPageInfo || browserActionSelectedPageInfo}
              onClearPage={() => {
                setBrowserActionSelectedPageInfo(null);
                onBrowserActionPageInfoChange?.(null);
              }}
            />
            <AddBrowserStorageModal
              isOpen={isAddBrowserStorageOpen}
              projectId={projectId || ''}
              onClose={() => {
                setIsAddBrowserStorageOpen(false);
                setAddBrowserStorageSelectedPageInfo(null);
                onModalStateChange?.('add_browser_storage', false);
                onAddBrowserStoragePageInfoChange?.(null);
              }}
              onConfirm={handleAddBrowserStorageConfirm}
              selectedPageInfo={propAddBrowserStorageSelectedPageInfo || addBrowserStorageSelectedPageInfo}
              onClearPage={() => {
                setAddBrowserStorageSelectedPageInfo(null);
                onAddBrowserStoragePageInfoChange?.(null);
              }}
            />
          </div>
          <button
            className="rcd-action-btn data-version"
            title="Quản lý Data Versions"
            onClick={() => setIsDataVersionModalOpen(true)}
            disabled={isExecutingAction}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 14H7.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            className="rcd-action-btn reset"
            title="Reload actions"
            onClick={handleReloadClick}
            disabled={shouldShowReloadSpinner || isExecutingAction}
          >
            {reloadStatus === 'success' && !shouldShowReloadSpinner ? (
              successIcon
            ) : shouldShowReloadSpinner ? (
              <span className="rcd-spinner" aria-label="reloading" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="21,3 21,9 15,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button className="rcd-action-btn save" title="Save actions" onClick={handleSaveClick} disabled={shouldShowSaveSpinner || !!isReloading}>
            {saveStatus === 'success' && !shouldShowSaveSpinner ? (
              successIcon
            ) : shouldShowSaveSpinner ? (
              <span className="rcd-spinner" aria-label="saving" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            className="rcd-action-btn delete"
            title="Delete all actions"
            onClick={() => onDeleteAll && onDeleteAll()}
            disabled={isExecutingAction}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <DataVersionModal
          isOpen={isDataVersionModalOpen}
          onClose={() => {
            setIsDataVersionModalOpen(false);
          }}
          actions={actions}
          testcaseId={testcaseId}
          onActionsChange={onActionsChange}
          testcaseDataVersions={testcaseDataVersions}
          onTestCaseDataVersionsChange={handleTestCaseDataVersionsChange}
        />
      </div>
      {/* insert-info moved inside header-left directly under the label */}
      <div className="rcd-actions-list" ref={listRef}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading actions...
          </div>
        ) : actions.length > 0 ? (
          <>

            {actions.map((action, index) => (
              <div key={action.action_id} className="rcd-action-item" ref={(el) => { itemRefs.current[index] = el; }}>

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`rcd-action-draggable ${draggedIndex === index ? 'rcd-dragging' : ''} ${dragOverIndex === index ? 'rcd-drag-over' : ''} ${executingActionIndex === index ? 'rcd-executing' : ''} ${failedActionIndex === index ? 'rcd-failed' : ''}`}
                >
                  <RenderedAction
                    action={action}
                    onDelete={onDeleteAction}
                    onClick={(a) => onSelectAction && onSelectAction(a)}
                    onStartRecording={() => onStartRecording && onStartRecording(index)}
                    onContinueExecution={() => onContinueExecution && onContinueExecution(index)}
                    isBrowserOpen={isBrowserOpen}
                    isRecordingFromThisAction={recordingFromActionIndex === index}
                    failedMessage={failedActionIndex === index ? failedActionMessage : null}
                    index={index}
                  />
                </div>

              </div>
            ))}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            No actions found
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionTab;
