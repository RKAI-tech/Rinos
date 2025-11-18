import React, { useMemo, useState, useEffect, useCallback } from 'react';
import './Main.css';
import ActionTab, { ActionOperationResult } from '../../components/action_tab/ActionTab';
import ActionDetailModal from '../../components/action_detail/ActionDetailModal';
import TestScriptTab from '../../components/code_convert/TestScriptTab';
import ActionToCodeTab from '../../components/action_to_code_tab/ActionToCodeTab';
import AiAssertModal from '../../components/ai_assert/AiAssertModal';
import BasicAuthModal from '../../components/basic_auth/BasicAuthModal';
import DeleteAllActions from '../../components/delete_all_action/DeleteAllActions';
import ConfirmCloseModal from '../../components/confirm_close/ConfirmCloseModal';
import URLInputModal from '../../components/url_input_modal/URLInputModal';
import TitleInputModal from '../../components/title_input_modal/TitleInputModal';
import AddActionModal from '../../components/add_action_modal/AddActionModal';
import DatabaseExecutionModal from '../../components/database_execution_modal/DatabaseExecutionModal';
import { ActionService } from '../../services/actions';
import { Action, ActionBatch, ActionType, AiAssertRequest, AssertType, ApiRequestData } from '../../types/actions';
import { ExecuteScriptsService } from '../../services/executeScripts';
import { toast } from 'react-toastify';
import { receiveAction, createDescription, receiveActionWithInsert } from '../../utils/receive_action';
import { Connection } from '../../types/actions';
import { BasicAuthentication } from '../../types/basic_auth';
import { BasicAuthService } from '../../services/basic_auth';
import { GenerationCodeRequest } from '../../types/executeScripts';

interface MainProps {
  projectId?: string | null;
  testcaseId?: string | null;
}

const Main: React.FC<MainProps> = ({ projectId, testcaseId }) => {
  const [url, setUrl] = useState('');
  const [isAssertDropdownOpen, setIsAssertDropdownOpen] = useState(false);
  const [assertSearch, setAssertSearch] = useState('');
  const [selectedAssert, setSelectedAssert] = useState<string | null>(null);
  const [isAssertMode, setIsAssertMode] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'script'>('actions');
  const [customScript, setCustomScript] = useState<string>('');
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [selectedInsertPosition, setSelectedInsertPosition] = useState<number>(0);
  // Vị trí chỉ để hiển thị label (không ảnh hưởng biến chèn thực tế)
  const [displayInsertPosition, setDisplayInsertPosition] = useState<number>(0);
  const actionService = useMemo(() => new ActionService(), []);
  
  const [isPaused, setIsPaused] = useState(true);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [runResult, setRunResult] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiElements, setAiElements] = useState<{
        id: string;
        type: 'Browser' | 'Database' | 'API';
        selector?: string[];
        value?: string;
        domHtml?: string;
        connectionId?: string;
        connection?: Connection;
        query?: string;
        queryResultPreview?:string;
        queryResultData?: any[];
        apiRequest?: ApiRequestData;
        apiResponse?: { status: number; data: any; headers: any };
  }[]>([]);
  const [recordingFromActionIndex, setRecordingFromActionIndex] = useState<number | null>(null);
  const [isBasicAuthOpen, setIsBasicAuthOpen] = useState(false);
  const [basicAuth, setBasicAuth] = useState<BasicAuthentication>();
  const [basicAuthStatus, setBasicAuthStatus] = useState<'idle' | 'success'>('idle');
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const [isUrlInputOpen, setIsUrlInputOpen] = useState(false);
  const [isTitleInputOpen, setIsTitleInputOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [isDatabaseExecutionOpen, setIsDatabaseExecutionOpen] = useState(false);
  const service = new ExecuteScriptsService();
  
  // Execution tracking states
  const [executingActionIndex, setExecutingActionIndex] = useState<number | null>(null);
  const [failedActionIndex, setFailedActionIndex] = useState<number | null>(null);
  
  // Code generation state
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isRunningScript, setIsRunningScript] = useState(false);

  const [isDirty, setIsDirty] = useState(false);
  const [savedActionsSnapshot, setSavedActionsSnapshot] = useState<Action[]>([]);
  const [savedBasicAuthSnapshot, setSavedBasicAuthSnapshot] = useState<BasicAuthentication | undefined>(undefined);
  const handleOpenBasicAuth = useCallback(() => {
    setBasicAuthStatus('idle');
    setIsBasicAuthOpen(true);
  }, []);

  const handleBasicAuthStatusClear = useCallback(() => {
    setBasicAuthStatus('idle');
  }, []);

  const areActionsEqual = useCallback((a1: Action[], a2: Action[]): boolean => {
    if (a1.length !== a2.length) return false;
    
    const normalize = (actions: Action[]) => {
      return actions.map(action => {
        const { action_id, ...rest } = action;
        return JSON.stringify(rest, Object.keys(rest).sort());
      }).sort();
    };
    
    return JSON.stringify(normalize(a1)) === JSON.stringify(normalize(a2));
  }, []);

  const areBasicAuthEqual = useCallback((a1: BasicAuthentication | undefined, a2: BasicAuthentication | undefined): boolean => {
    if (a1 === undefined && a2 === undefined) return true;
    if (a1 === undefined || a2 === undefined) return false;
    return JSON.stringify(a1) === JSON.stringify(a2);
  }, []);

  useEffect(() => {
    // console.log('[Main] Setting project ID:', projectId);
    if (projectId) {
      // Use IPC to set project ID in main process
      (window as any).browserAPI?.browser?.setProjectId?.(projectId);
    }
  }, [projectId]);

  // Auto-focus URL input when component mounts
  useEffect(() => {
    const urlInput = document.querySelector('.rcd-url') as HTMLInputElement;
    if (urlInput) {
      urlInput.focus();
    }
  }, []);

  // Load actions khi có testcase ID
  useEffect(() => {
    const loadActions = async () => {
      if (testcaseId) {
        // console.log('[Main] Loading actions for testcase ID:', testcaseId);
        setIsLoading(true);

        try {
          const response = await actionService.getActionsByTestCase(testcaseId);
          if (response.success && response.data) {
            const loaded = response.data.actions || [];
            setActions(loaded);
            setSelectedInsertPosition(loaded.length);
            setSavedActionsSnapshot(JSON.parse(JSON.stringify(loaded)));
            setIsDirty(false);
            // console.log('[Main] Loaded actions:', loaded);
          } else {
            // console.error('[Main] Failed to load actions:', response.error);
            setActions([]);
            setSelectedInsertPosition(0);
            setSavedActionsSnapshot([]);
            setIsDirty(false);
          }
        } catch (error) {
          // console.error('[Main] Error loading actions:', error);
          setActions([]);
          setSelectedInsertPosition(0);
          setSavedActionsSnapshot([]);
          setIsDirty(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setActions([]);
        setSelectedInsertPosition(0);
        setSavedActionsSnapshot([]);
        setIsDirty(false);
      }
    };

    loadActions();
  }, [testcaseId, actionService]);

  // Load basic authentication khi có testcase ID
  useEffect(() => {
    const loadBasicAuth = async () => {
      if (testcaseId) {
        try {
          const { BasicAuthService } = await import('../../services/basic_auth');
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
          // console.error('[Main] Error loading basic auth:', error);
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

  // Single onAction listener: handles AI and normal actions, with optional insert position
  useEffect(() => {
    return (window as any).browserAPI?.browser?.onAction(async (action: any) => {
      // console.log("NewActionReceived", action);

      if (isPaused) return;
      if (!testcaseId) return;
      
      // Reset execution effects when new action is recorded
      setExecutingActionIndex(null);
      setFailedActionIndex(null);

      // AI assert goes to modal only
      if ((action?.action_type === 'assert') && (action?.assert_type === 'AI')) {
        // console.log('[Main] AI action:', action);
        const newItem = {
          id: Math.random().toString(36),
          domHtml: action.action_datas?.[0]?.value?.htmlDOM || '',
          type: 'Browser' as const,
          selector: action.elements?.[0]?.selectors?.map((s: any) => s.value) || [],
          value: action.action_datas?.[0]?.value?.elementText || '',
        };
        setAiElements(prev => [...prev, newItem]);
        return;
      }

      if (isAssertMode && action.action_type !== 'assert') return;

      setActions(prev => {
        const next = receiveActionWithInsert(testcaseId, prev, action, selectedInsertPosition);
        const added = next.length > prev.length;
        if (added) {
          setSelectedInsertPosition(selectedInsertPosition + 1);
        }
        setIsDirty(true);
        return next;
      });
    });
  }, [testcaseId, isPaused, selectedInsertPosition, isAssertMode]);

  // Đồng bộ nhãn vị trí chèn với độ dài actions khi không chọn vị trí cụ thể
  useEffect(() => {
    if (selectedInsertPosition === 0) {
      setDisplayInsertPosition(actions.length === 0 ? 0 : actions.length);
    }
  }, [actions.length, selectedInsertPosition]);

  // Listen for browser close events and reset pause state
  useEffect(() => {
    const handleBrowserClose = () => {
      // console.log('[Main] Browser closed, resetting pause state');
      setIsBrowserOpen(false);
      setIsPaused(true);
      // Close assert dropdown and reset assert state
      setSelectedAssert(null);
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
      setIsAssertMode(false);
      // Keep recording position when closing browser (don't reset to 0)
      // setSelectedInsertPosition(0);
      // setDisplayInsertPosition(0);
      setRecordingFromActionIndex(null);
      // Reset execution effects
      setExecutingActionIndex(null);
      setFailedActionIndex(null);
    };

    // Listen for browser close event from main process
    const removeListener = (window as any).browserAPI?.browser?.onBrowserClose?.(handleBrowserClose);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  // Listen for action execution events
  useEffect(() => {
    const handleActionExecuting = (data: { index: number }) => {
      if (data.index === -1) {
        // All actions completed - clear all effects
        setExecutingActionIndex(null);
        setFailedActionIndex(null);
      } else {
        // Single action executing
        setExecutingActionIndex(data.index);
        setFailedActionIndex(null); // Clear any previous failed state
      }
    };

    const handleActionFailed = (data: { index: number }) => {
      setFailedActionIndex(data.index);
      setExecutingActionIndex(null); // Clear executing state
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

  // Listen for window close request from main process
  useEffect(() => {
    const handleCloseRequest = () => {
      setIsConfirmCloseOpen(true);
    };

    // Listen for window close request event from main process
    const removeListener = (window as any).electronAPI?.window?.onRecorderCloseRequested?.(handleCloseRequest);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  const assertTypes = Object.values(AssertType);//.filter(type => type !== AssertType.pageHasAURL);

  const filteredAssertTypes = assertTypes.filter(type =>
    type.toLowerCase().includes(assertSearch.toLowerCase())
  );

  const handleAssertClick = async () => {
    if (selectedAssert) {
      // Nếu đã có selected assert thì tắt đi (xóa selection)
      setSelectedAssert(null);
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
      setIsAssertMode(false);
      await (window as any).browserAPI?.browser?.setAssertMode(false, '');
    } else if (isAssertDropdownOpen) {
      // Nếu dropdown đang mở thì đóng
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
      setIsAssertMode(false);
      await (window as any).browserAPI?.browser?.setAssertMode(false, '');
    } else {
      // Nếu không có selected assert và dropdown đang đóng thì mở
      setIsAssertDropdownOpen(true);
    }
  };

  const removeSelectedAssert = async () => {
    setSelectedAssert(null);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(false);
    await (window as any).browserAPI?.browser?.setAssertMode(false, '');
  };

  const startBrowser = async (url: string, executeUntilIndex?: number | null) => {
    // Prevent multiple simultaneous starts
    if (isBrowserOpen) {
      // console.log('[Main] Browser already open, skipping start');
      return;
    }

    // Check if URL is required but not provided
    if (actions.length === 0 && !url) {
      toast.error('Please enter a URL to start recording');
      return;
    }

    try {
      setIsBrowserOpen(true);
      setIsPaused(true);
      let basicAuthentication = {
        username: basicAuth?.username || '',
        password: basicAuth?.password || '',
      }
      await (window as any).browserAPI?.browser?.start(basicAuthentication);
      
      if (actions.length > 0) {
        const limit = (typeof executeUntilIndex === 'number' && executeUntilIndex >= 0)
          ? Math.min(executeUntilIndex, actions.length)
          : actions.length;
        const toExecute = actions.slice(0, limit);
        // console.log(`[Main] Executing ${toExecute.length} existing actions (limit=${limit})`);
        if (toExecute.length > 0) {
          await (window as any).browserAPI?.browser?.executeActions(toExecute);
          setIsPaused(false);
        }
      } else {
        if (!url.startsWith('http')) {
          url = 'https://' + url;
        }
        
        // console.log(`[Main] Navigating to: ${url}`);
        await (window as any).browserAPI?.browser?.navigate(url);
        // TODO: Increase insert position by 1
        setSelectedInsertPosition(selectedInsertPosition + 1);
        setDisplayInsertPosition(selectedInsertPosition + 1);
        setActions(prev => {
          const next = receiveAction(
            testcaseId || '', 
            prev, 
            { 
              action_type: ActionType.navigate, 
              action_datas: [{ value: { value: url } }] 
            }
          );
          setIsDirty(true);
          return next;
        });
        setIsPaused(false);
      }
    } catch (error) {
      // console.error('[Main] Error starting browser:', error);
      setIsBrowserOpen(false);
      throw error;
    } finally {
      // setIsPaused(false);
    }
  };

  const pauseBrowser = async () => {
    setIsPaused(!isPaused);
  };

  const stopBrowser = async () => {
    setIsBrowserOpen(false);
    setIsPaused(false); // Reset pause state when stopping browser
    // TODO: Tắt assert menu và selected assert
    setSelectedAssert(null);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(false);
    await (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
    // Keep recording position when stopping browser manually (don't reset to 0)
    // setSelectedInsertPosition(0);
    setRecordingFromActionIndex(null);
    // Reset execution effects
    setExecutingActionIndex(null);
    setFailedActionIndex(null);
    await (window as any).browserAPI?.browser?.stop();
  };

  const handleAssertSelect = async (assertType: string) => {
    setSelectedAssert(assertType);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(true);
    // Khi bật assert từ thanh assert, cập nhật vị trí insert và label về cuối danh sách
    // const endPos = actions.length;
    // setSelectedInsertPosition(endPos);
    // setDisplayInsertPosition(endPos);
    if ((assertType as any) === AssertType.ai || assertType === 'AI') {
      setIsAiModalOpen(true);
    } else if (assertType === AssertType.pageHasAURL) {
      setIsUrlInputOpen(true);
    } else if (assertType === AssertType.pageHasATitle) {
      setIsTitleInputOpen(true);
    }
    await (window as any).browserAPI?.browser?.setAssertMode(true, assertType as AssertType);
  };

  const handleAiAddElement = async () => {
    // Default new element is Database type
    setAiElements(prev => [
      ...prev,
      { id: Math.random().toString(36), type: 'Database' as const, selector: [] }
    ]);
    // Enable assert pick for AI to allow selecting a browser element (optional)
    // setSelectedAssert('AI');
    // setIsAssertMode(true);
    // await (window as any).browserAPI?.browser?.setAssertMode(true, AssertType.ai);
  };

  const handleAiSubmit = async () => {
    // console.log('[Main] AI elements:', aiElements);
    // Validation
    if (!aiPrompt || !aiPrompt.trim()) {
      toast.error('Prompt is required');
      return;
    }
    if (!aiElements || aiElements.length === 0) {
      toast.error('Please add at least one element');
      return;
    }
    const invalidDb = aiElements.some(el => el.type === 'Database' && (
      !el.query || !el.query.trim() || !el.queryResultData || el.queryResultData.length === 0
    ));
    if (invalidDb) {
      toast.error('Database elements must have a query and previewed result data');
      return;
    }
    
    const HTMLElements = aiElements
      .filter(el => el.type === 'Browser')
      .map(el => ({
        domHtml: el.domHtml || '',
        selectors: el.selector?.map(s => ({ value: s })) || [],
      }));

    const databaseElements = aiElements
      .filter(el => el.type === 'Database')
      .map(el => ({
        data: el.queryResultPreview || '',
        connection: el.connection
          ? { ...el.connection, port: String((el.connection as any).port) }
          : undefined,
        query: el.query || '',
      }));

    // Build API requests summary from API elements (if any)
    const apiRequests = aiElements
      .filter(el => el.type === 'API')
      .map(el => {
        const url = el.apiRequest?.url || '';
        let endpoint = url;
        try {
          const u = new URL(url);
          endpoint = u.pathname || url;
        } catch {
          // keep raw url/path if not absolute URL
        }
        const method = String(el.apiRequest?.method || 'get').toUpperCase();
        const status = el.apiResponse?.status ?? 0;
        const headers = el.apiResponse?.headers || {};
        
        // Get payload from response data (preferred) or request body
        let payload: any = undefined;
        if (el.apiResponse?.data !== undefined && el.apiResponse?.data !== null) {
          // Use response data as payload
          payload = el.apiResponse.data;
        } else if (el.apiRequest?.body) {
          // Fallback to request body if no response data
          const body = el.apiRequest.body;
          if (body.type === 'json' && body.content) {
            try {
              payload = JSON.parse(body.content);
            } catch {
              payload = body.content;
            }
          } else if (body.type === 'form' && body.form_data) {
            payload = body.form_data.reduce((acc: any, item) => {
              acc[item.name] = item.value;
              return acc;
            }, {});
          }
        }
        
        const responseTimeHeader = headers?.['x-response-time'] ?? headers?.['X-Response-Time'];
        const responseTime = responseTimeHeader !== undefined ? Number(responseTimeHeader) : undefined;
        const name = (() => {
          const parts = (endpoint || '/').split('/').filter(Boolean);
          if (parts.length >= 2) return `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;
          if (parts.length === 1) return `${parts[0]}_api`;
          return 'api_request';
        })();

        return { name, endpoint, method, status, headers, response_time: responseTime, payload };
      });

    const request: any = {
      testcase_id: testcaseId || '',
      elements: HTMLElements,
      database_results: databaseElements,
      prompt: aiPrompt,
      api_requests: apiRequests,
    };
    
    // console.log('[Main] AI assert request:', request);
    setIsGeneratingAi(true);
    try {
      const response = await actionService.generateAiAssert(request);

      if (!response.success) {
        const errorMessage =
          (response as any)?.error ||
          (response as any)?.message ||
          'Failed to generate AI assertion';
        // console.error('[Main] generateAiAssert failed:', errorMessage, response);
        toast.error(String(errorMessage));
        return false;
      }

      // Validate required fields
      const functionCode = (response as any).data?.function_code;
      const functionName = (response as any).data?.function_name;
      
      if (!functionCode || !functionCode.trim()) {
        const errorMessage = 'function_code is required but not provided';
        // console.error('[Main] generateAiAssert validation failed:', errorMessage, response);
        toast.error(errorMessage);
        return false;
      }
      
      if (!functionName || !functionName.trim()) {
        const errorMessage = 'function_name is required but not provided';
        // console.error('[Main] generateAiAssert validation failed:', errorMessage, response);
        toast.error(errorMessage);
        return false;
      }

      // Build API request data from API elements
      const apiRequestElements = aiElements.filter(el => el.type === 'API' && el.apiRequest);
      const apiRequestDataList = apiRequestElements.map(el => el.apiRequest!);

      // Build action_datas array
      const actionDatas: any[] = [];
      
      actionDatas.push({
        value: { 
          function_code: functionCode,
          function_name: functionName,
        }
      });
      for (const databaseElement of databaseElements) {
        if (databaseElement.connection?.connection_id && databaseElement.query) {
          actionDatas.push({
            statement: {
              statement_text: databaseElement.query,
              connection_id: databaseElement.connection?.connection_id,
              connection: databaseElement.connection,
            }
          });
        }
      }
      for (const apiRequest of apiRequestDataList) {
        actionDatas.push({
          api_request: apiRequest
        });
      }
      var html_element_action=[]
      for (const htmlElement of HTMLElements) {
        html_element_action.push({
          selectors: htmlElement.selectors
        });
      }
      const aiAction = {
        action_type: ActionType.assert,
        assert_type: AssertType.ai,
        description: (response as any).data.description || '',
        elements: html_element_action,
        action_datas: actionDatas
      };

      // console.log('[Main] AI action:', aiAction);

      setActions(prev => {
        const next = receiveActionWithInsert(
          testcaseId || '',
          prev,
          aiAction,
          selectedInsertPosition // chèn đúng vị trí đang chọn
        );
        const newPos = Math.min((selectedInsertPosition ?? 0) + 1, next.length);
        setSelectedInsertPosition(newPos);
        setDisplayInsertPosition(newPos);
        setIsDirty(true);
        return next;
      });
      toast.success('Successfully generated AI assertion');

      // Reset assert state on successful generation
      setSelectedAssert(null);
      setIsAssertMode(false);
      (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
      // Inform modal to close by returning true; onClose will clear modal content
      return true;
    } catch (e: any) {
      // console.error('[Main] generateAiAssert exception:', e);
      const message = e?.message || e?.error || e?.reason || e;
      toast.error(String(message || 'Failed to generate AI assertion'));
      return false;
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleUrlConfirm = (url: string) => {
    // Create action with the URL value
    setActions(prev => {
      const next = receiveAction(testcaseId || '', prev, {
        type: ActionType.assert,
        assertType: AssertType.pageHasAURL,
        value: url,
        playwright_code: `await expect(page).toHaveURL('${url}');`,
        description: `Verify the page has URL ${url}`,
      });
      setIsDirty(true);
      return next;
    });
    
    // Reset assert state
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsUrlInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  };

  const handleTitleConfirm = (title: string) => {
    // Create action with the title value
    setActions(prev => {
      const next = receiveAction(testcaseId || '', prev, {
        type: ActionType.assert,
        assertType: AssertType.pageHasATitle,
        value: title,
        playwright_code: `await expect(page).toHaveTitle('${title}');`,
        description: `Verify the page has title ${title}`,
      });
      setIsDirty(true);
      return next;
    });
    
    // Reset assert state
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsTitleInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  };

  const handleUrlCancel = () => {
    // Reset assert state when canceling URL input
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsUrlInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  };

  const handleTitleCancel = () => {
    // Reset assert state when canceling Title input
    setSelectedAssert(null);
    setIsAssertMode(false);
    setIsTitleInputOpen(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  };

  const handleTabSwitch = async () => {
    const newTab = activeTab === 'actions' ? 'script' : 'actions';
    
    // Khi chuyển sang tab script, generate code từ server
    if (newTab === 'script' && actions.length > 0) {
      setIsGeneratingCode(true);
      try {
        const request: GenerationCodeRequest = { 
          testcase_id: testcaseId || '', 
          actions: actions as Action[],
          basic_auth: basicAuth,
        };
        const response = await service.generateCode(request);
        
        if (response.success && response.data?.code) {
          setCustomScript(response.data.code);
        } else {
          // Server generation failed
          // console.error('[Main] Server code generation failed:', response.error);
          setCustomScript('// Failed to generate code from server. Please try again.');
          toast.error(response.error || 'Failed to generate code from server');
        }
      } catch (error) {
        // console.error('[Main] Error generating code:', error);
        setCustomScript('// Error generating code. Please try again.');
        toast.error('Error generating code from server');
      } finally {
        setIsGeneratingCode(false);
      }
    }
    
    setActiveTab(newTab);
  };

  // Reload actions from server
  const reloadActions = async (): Promise<ActionOperationResult> => {
    // Fallback: nếu testcaseId chưa có (null) nhưng đã có actions hiện tại,
    // dùng testcase_id của action đầu tiên để reload
    const effectiveId = testcaseId || actions[0]?.testcase_id || null;
    if (!effectiveId) {
      // console.warn('[Main] Reload aborted: missing testcaseId');
      return {
        success: false,
        message: 'Missing testcase ID to reload actions',
        level: 'warning',
      };
    }
    setIsLoading(true);
    try {
      // console.log('[Main] Reloading actions for testcase:', effectiveId);
      const response = await actionService.getActionsByTestCase(effectiveId);
      if (response.success && response.data) {
        const newActions = response.data.actions || [];
        setActions(newActions);
        // console.log('[Main] Reloaded actions:', newActions);
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(newActions)));
        setIsDirty(false);
        // Sau reload, luôn đặt vị trí chèn = độ dài actions (rỗng → 0)
        const len = newActions.length;
        setSelectedInsertPosition(len);
        setDisplayInsertPosition(len);
        return {
          success: true,
          message: 'Actions reloaded successfully',
        };
      } else {
        setActions([]);
        setSelectedInsertPosition(0);
        setDisplayInsertPosition(0);
        setSavedActionsSnapshot([]);
        setIsDirty(false);
        return {
          success: false,
          message: response.error || 'Failed to reload actions',
          level: 'error',
        };
      }
    } catch (error) {
      setActions([]);
      setSelectedInsertPosition(0);
      setDisplayInsertPosition(0);
      setSavedActionsSnapshot([]);
      setIsDirty(false);
      const message = error instanceof Error ? error.message : 'Failed to reload actions';
      return {
        success: false,
        message,
        level: 'error',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAction = (actionId: string) => {
    // Local-only delete (no server request) + update marker indices
    setActions(prev => {
      const removedIndex = prev.findIndex(a => a.action_id === actionId);
      if (removedIndex === -1) return prev;
      const next = prev.filter(a => a.action_id !== actionId);

      setIsDirty(true);

      const adjust = (idx: number | null): number | null => {
        if (idx === null) return null;
        const newLen = next.length;
        if (removedIndex < idx) return Math.max(0, Math.min(idx - 1, newLen));
        // Nếu xóa đúng tại vị trí chèn (removedIndex === idx), giữ nguyên index nhưng clamp theo độ dài mới
        return Math.max(0, Math.min(idx, newLen));
      };

      setSelectedInsertPosition(v => next.length === 0 ? 0 : (adjust(v as number | null) ?? 0));

      // Đồng bộ label hiển thị: nếu danh sách rỗng → 0; ngược lại cập nhật theo quy tắc dịch trái khi xóa trước
      setDisplayInsertPosition(v => {
        if (next.length === 0) return 0;
        if (v === null || v === undefined) return next.length; // mặc định về cuối nếu chưa có
        const newLen = next.length;
        if (removedIndex < v) return Math.max(0, Math.min(v - 1, newLen));
        return Math.max(0, Math.min(v, newLen));
      });

      return next;
    });
  };

  const handleDeleteAllActions = () => {
    setIsDeleteAllOpen(true);
  };

  const handleConfirmDeleteAll = async () => {
    const effectiveId = testcaseId || actions[0]?.testcase_id || null;
    if (!effectiveId) {
      toast.error('No testcase ID available for deletion');
      return;
    }

    try {
      const response = await actionService.deleteActionsByTestCase(effectiveId);
      if (response.success) {
        setActions([]);
        setSelectedInsertPosition(0);
        setSavedActionsSnapshot([]);
        setIsDirty(false);
        toast.success('All actions deleted successfully');
      } else {
        toast.error(response.error || 'Failed to delete actions');
      }
    } catch (error) {
      // console.error('[Main] Error deleting all actions:', error);
      toast.error('Failed to delete actions');
    }
  };

  const handleReorderActions = (reorderedActions: Action[]) => {
    setActions(reorderedActions);
    setIsDirty(true);
  };

  const handleSelectInsertPosition = async (position: number | null) => {
    const prev = selectedInsertPosition;
    setSelectedInsertPosition(position ?? 0);
    // Thông báo thay đổi vị trí ghi action
    try {
      const fromIndex = (prev === undefined) ? actions.length : prev;
      const fromText = `#${fromIndex}`;
      const toText = `#${position ?? 0}`;
      toast.info(`Recording position changed: ${fromText} to ${toText}`);
    } catch {}
    // Nếu người dùng chọn vị trí chèn từ thanh ngang và trình duyệt chưa mở, tự mở recorder
    if (position !== null && !isBrowserOpen) {
      try {
        await startBrowser(url, position);
      } catch (e) {
        // console.error('[Main] Failed to auto start browser on insert position select:', e);
      }
    }
  };

  const handleStartRecordingFromAction = async (actionIndex: number) => {
    try {
      // If clicking the same action that's already selected, reset to default
      if (recordingFromActionIndex === actionIndex) {
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

      // Set the insert position to after the selected action
      const insertPosition = actionIndex + 1;
      setSelectedInsertPosition(insertPosition);
      setDisplayInsertPosition(insertPosition);
      setRecordingFromActionIndex(actionIndex);
      
      // If browser is not open, start it and execute actions up to the selected index
      if (!isBrowserOpen) {
        await startBrowser(url, insertPosition);
      } else {
        // If browser is already open, just update the insert position and warn
        toast.warning(`Browser is opened`);
      }
    } catch (error) {
      // console.error('[Main] Error starting recording from action:', error);
      toast.error('Failed to start recording from this action');
    }
  };

  const handleSelectAction = (action: Action) => {
    setSelectedAction(action);
    setIsDetailOpen(true);
  };

  const handleUpdateAction = (updatedAction: Action) => {
    setActions(prev => {
      const next = prev.map(a => a.action_id === updatedAction.action_id ? { ...a, ...updatedAction } : a);
      setIsDirty(true);
      return next;
    });
    setSelectedAction(updatedAction);
    // toast.success('Action updated');
  };

  const handleSaveActions = async (): Promise<ActionOperationResult> => {
    if (!testcaseId) {
      return {
        success: false,
        message: 'No testcase ID available for saving',
        level: 'error',
      };
    }

    if (actions.length === 0) {
      return {
        success: false,
        message: 'No actions to save',
        level: 'warning',
      };
    }

    try {
      // console.log('[Main] Saving actions:', actions);
      const response = await actionService.batchCreateActions(actions);
      if (response.success) {
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(actions)));
        setIsDirty(false);
        return {
          success: true,
          message: 'Actions saved successfully',
        };
      }

      return {
        success: false,
        message: response.error || 'Failed to save actions',
        level: 'error',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save actions';
      return {
        success: false,
        message,
        level: 'error',
      };
    }
  };

  const handleAddAction = () => {
    setIsAddActionOpen(true);
  };

  const handleActionsChange = useCallback((newActions: Action[] | ((prev: Action[]) => Action[])) => {
    setActions(prev => {
      const next = typeof newActions === 'function' ? newActions(prev) : newActions;
      setIsDirty(true);
      return next;
    });
  }, []);


  const handleSaveBasicAuth = async () => {
    try {
      const basicAuthService = new BasicAuthService();
      if (!basicAuth) {
        await basicAuthService.deleteBasicAuthentication(testcaseId || '');
        setSavedBasicAuthSnapshot(undefined);
        setIsDirty(false);
      } else {
        await basicAuthService.upsertBasicAuthentication(basicAuth);
        setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(basicAuth)));
        setIsDirty(false);
      }
    } catch (error) {
      toast.error('Failed to save basic authentication');
    }
  };

  const reloadBasicAuth = async () => {
    const basicAuthService = new BasicAuthService();
    const response = await basicAuthService.getBasicAuthenticationByTestcaseId(testcaseId || '');
    if (response.success && response.data) {
      setBasicAuth(response.data);
      setSavedBasicAuthSnapshot(JSON.parse(JSON.stringify(response.data)));
    } else {
      setBasicAuth(undefined);
      setSavedBasicAuthSnapshot(undefined);
    }
  };

  const handleRunScript = async () => {
    if (isRunningScript) return;
    setIsRunningScript(true);
    try {
      const payload = {
        actions: actions,
        testcase_id: testcaseId || '',
        basic_auth: basicAuth,
      };
      // console.log('[Main] Run script payload:', payload);
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
  };

  const handleConfirmClose = async () => {
    setIsConfirmCloseOpen(false);
    // handleDeleteTmpFile();
    // Gửi xác nhận đóng cửa sổ đến main process
    await (window as any).electronAPI?.window?.confirmCloseRecorder?.(true);
  };

  const handleCancelClose = async () => {
    setIsConfirmCloseOpen(false);
    // Gửi hủy đóng cửa sổ đến main process
    await (window as any).electronAPI?.window?.confirmCloseRecorder?.(false);
  };

  const handleSaveAndClose = async () => {
    setIsConfirmCloseOpen(false);
    // handleDeleteTmpFile();
    try {
      // Lưu actions trước khi đóng
      const saveResult = await handleSaveActions();

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

      await handleSaveBasicAuth();
      // Đợi một chút để đảm bảo lưu thành công
      setTimeout(async () => {
        await (window as any).electronAPI?.window?.confirmCloseRecorder?.(true);
      }, 500);
    } catch (error) {
      // Nếu lưu thất bại, vẫn hiển thị modal để người dùng quyết định
      setIsConfirmCloseOpen(true);
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

  const reloadAll = async (): Promise<ActionOperationResult> => {
    const result = await reloadActions();
    await reloadBasicAuth();
    return result;
  };

  const saveAll = async (): Promise<ActionOperationResult> => {
    setIsSaving(true);
    try {
      const result = await handleSaveActions();
      await handleSaveBasicAuth();
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedActions = useMemo(() => {
    if (!testcaseId) return false;
    
    if (!isDirty) return false;
    
    const actionsChanged = !areActionsEqual(actions, savedActionsSnapshot);
    const basicAuthChanged = !areBasicAuthEqual(basicAuth, savedBasicAuthSnapshot);
    
    return actionsChanged || basicAuthChanged;
  }, [isDirty, actions, savedActionsSnapshot, basicAuth, savedBasicAuthSnapshot, testcaseId, areActionsEqual, areBasicAuthEqual]);

  // Listen for unsaved datas flag request from main process
  useEffect(() => {
    const handleGetUnsavedFlag = (requestId: string) => {
      // Gửi response với hasUnsavedActions
      // console.log('[Main] Sending unsaved datas flag response:', requestId, hasUnsavedActions);
      (window as any).electronAPI?.window?.sendUnsavedDatasResponse?.(requestId, hasUnsavedActions);
    };
    
    const removeListener = (window as any).electronAPI?.window?.onGetUnsavedDatasFlag?.(handleGetUnsavedFlag);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [hasUnsavedActions]);

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
              if (isBrowserOpen) {
                stopBrowser();
              } else {
                // Check if URL is required but not provided
                if (actions.length === 0 && !url.trim()) {
                  toast.error('Please enter a URL to start recording');
                  return;
                }
                const endPos = actions.length;
                setSelectedInsertPosition(endPos);
                setDisplayInsertPosition(endPos);
                startBrowser(url);
              }
            }
          }}
        />
        <div className="rcd-topbar-actions">
        <button
            className={`rcd-ctrl ${isBrowserOpen ? 'rcd-stop' : 'rcd-record'}`}
            title={isBrowserOpen ? "Stop recording" : "Start recording"}
            onClick={() => {
              if (isBrowserOpen) {
                stopBrowser();
              } else {
                // Check if URL is required but not provided
                if (actions.length === 0 && !url.trim()) {
                  toast.error('Please enter a URL to start recording');
                  return;
                }
                // Khi bắt đầu record bằng nút trên thanh URL, cập nhật cả vị trí insert và label về cuối danh sách
                const endPos = actions.length;
                setSelectedInsertPosition(endPos);
                setDisplayInsertPosition(endPos);
                startBrowser(url);
              }
            }}
          >
            {isBrowserOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="13" height="13" fill="red" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="6,3 20,12 6,21" fill="green" />
              </svg>
            )}
          </button>
          <button className={`rcd-ctrl rcd-pause-alt ${isPaused ? 'paused' : 'resumed'}`} 
            title={isPaused ? "Resume" : "Pause"} 
            onClick={pauseBrowser}
            disabled={!isBrowserOpen}
          >
            {isPaused ? (
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
              className={`rcd-ctrl rcd-assert ${isAssertDropdownOpen || selectedAssert ? 'active' : ''}`}
              disabled={!isBrowserOpen}
              title="Assert"
              onClick={handleAssertClick}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isAssertDropdownOpen && (
              <div className="rcd-assert-dropdown">
                <div className="rcd-assert-search">
                  <input
                    type="text"
                    placeholder="Search assert types..."
                    value={assertSearch}
                    onChange={(e) => setAssertSearch(e.target.value)}
                    className="rcd-assert-search-input"
                  />
                </div>
                <div className="rcd-assert-list">
                  {filteredAssertTypes.map((type, index) => (
                    <div
                      key={index}
                      className="rcd-assert-item"
                      onClick={() => handleAssertSelect(type)}
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

      {selectedAssert && (
        <div className="rcd-selected-assert">
          <div className="rcd-selected-assert-content">
            <span className="rcd-selected-assert-label">Selected Assert:</span>
            <span className="rcd-selected-assert-type">{selectedAssert}</span>
            <button
              className="rcd-selected-assert-remove"
              onClick={removeSelectedAssert}
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
            actions={actions} 
            isLoading={isLoading} 
            isReloading={isLoading}
            isSaving={isSaving}
            onDeleteAction={handleDeleteAction} 
            onDeleteAll={handleDeleteAllActions} 
            onReorderActions={handleReorderActions} 
            onReload={reloadAll}
            onSaveActions={saveAll}
            selectedInsertPosition={selectedInsertPosition}
            displayInsertPosition={displayInsertPosition}
            onSelectInsertPosition={handleSelectInsertPosition}
            onSelectAction={handleSelectAction}
            onStartRecording={handleStartRecordingFromAction}
            isBrowserOpen={isBrowserOpen}
            recordingFromActionIndex={recordingFromActionIndex}
            onAddAction={handleAddAction}
            isAddActionOpen={isAddActionOpen}
            onCloseAddAction={() => setIsAddActionOpen(false)}
            testcaseId={testcaseId}
            onActionsChange={handleActionsChange}
            onInsertPositionChange={setSelectedInsertPosition}
            onDisplayPositionChange={setDisplayInsertPosition}
            executingActionIndex={executingActionIndex}
            failedActionIndex={failedActionIndex}
            onOpenBasicAuth={handleOpenBasicAuth}
            basicAuthStatus={basicAuthStatus}
            onBasicAuthStatusClear={handleBasicAuthStatusClear}
            projectId={projectId}
          />
        ) : (
          <TestScriptTab 
            script={isGeneratingCode ? '// Wait for generation code...\n// Please wait while the code is being generated from the server...' : (customScript || '// No code available. Please switch to actions tab and back to generate code.')} 
            runResult={runResult} 
            onScriptChange={setCustomScript} 
            hasActions={actions.length > 0} 
          />
        )}
      </div>
      <ActionToCodeTab 
        onConvert={handleTabSwitch} 
        onRun={handleRunScript} 
        onSaveAndClose={handleSaveAndClose}
        isRunning={isRunningScript}
        activeTab={activeTab} 
        actions={actions} 
      />
      
      <DeleteAllActions
        isOpen={isDeleteAllOpen}
        onClose={() => setIsDeleteAllOpen(false)}
        onDelete={handleConfirmDeleteAll}
        testcaseId={testcaseId}
      />

      <ActionDetailModal
        isOpen={isDetailOpen}
        action={selectedAction}
        onClose={() => setIsDetailOpen(false)}
        onSave={handleUpdateAction}
      />

      <AiAssertModal
        isOpen={isAiModalOpen}
        testcaseId={testcaseId}
        prompt={aiPrompt}
        elements={aiElements}
        isGenerating={isGeneratingAi}
        onChangePrompt={setAiPrompt}
        onChangeElement={(idx, updater) => setAiElements(prev => prev.map((el, i) => i === idx ? updater(el) : el))}
        onRemoveElement={(idx) => setAiElements(prev => prev.filter((_, i) => i !== idx))}
        onClose={async () => { 
          setIsAiModalOpen(false); 
          setAiPrompt(''); 
          setAiElements([]);
          // Tắt chế độ assert
          setSelectedAssert(null);
          setIsAssertMode(false);
          setIsAssertDropdownOpen(false);
          setAssertSearch('');
          await (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
        }}
        onSubmit={handleAiSubmit}
        onAddElement={handleAiAddElement}
      />
      <BasicAuthModal
        isOpen={isBasicAuthOpen}
        testcaseId={testcaseId}
        onClose={() => setIsBasicAuthOpen(false)}
        basicAuth={basicAuth}
        onSaved={(auth) => {
          setBasicAuth(auth);
          setIsDirty(true);
          setBasicAuthStatus('success');
        }}
      />
      <ConfirmCloseModal
        isOpen={isConfirmCloseOpen}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
        onSaveAndClose={handleSaveAndClose}
        hasUnsavedDatas={hasUnsavedActions}
      />
      <URLInputModal
        isOpen={isUrlInputOpen}
        onClose={handleUrlCancel}
        onConfirm={handleUrlConfirm}
      />
      <TitleInputModal
        isOpen={isTitleInputOpen}
        onClose={handleTitleCancel}
        onConfirm={handleTitleConfirm}
      />
    </div>
  );
};

export default Main;


