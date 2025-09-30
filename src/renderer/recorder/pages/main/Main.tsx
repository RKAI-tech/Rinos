import React, { useMemo, useState, useEffect } from 'react';
import './Main.css';
import ActionTab from '../../components/action_tab/ActionTab';
import ActionDetailModal from '../../components/action_detail/ActionDetailModal';
import TestScriptTab from '../../components/code_convert/TestScriptTab';
import ActionToCodeTab from '../../components/action_to_code_tab/ActionToCodeTab';
import AiAssertModal from '../../components/ai_assert/AiAssertModal';
import DeleteAllActions from '../../components/delete_all_action/DeleteAllActions';
import { ActionService } from '../../services/actions';
import { Action, ActionType, AssertType } from '../../types/actions';
import { actionToCode } from '../../utils/action_to_code';
import { ExecuteScriptsService } from '../../services/executeScripts';
import { toast } from 'react-toastify';
import { RunCodeResponse } from '../../types/executeScripts';
import { receiveAction, createDescription } from '../../utils/receive_action';
import { setProjectId } from '../../context/browser_context';


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
  const [activeTab, setActiveTab] = useState<'actions' | 'script'>('actions');
  const [customScript, setCustomScript] = useState<string>('');
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [selectedInsertPosition, setSelectedInsertPosition] = useState<number | null>(null);
  const actionService = useMemo(() => new ActionService(), []);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [runResult, setRunResult] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiElements, setAiElements] = useState<{
        id: string;
        name: string;
        type: 'Browser' | 'Database';
        selector?: string[];
        value?: string;
        domHtml?: string;
        connectionId?: string;
        query?: string;
        queryResultPreview?:
        string; queryResultData?: any[]; 
  }[]>([]);

  useEffect(() => {
    console.log('[Main] Setting project ID:', projectId);
    if (projectId) {
      // Use IPC to set project ID in main process
      (window as any).browserAPI?.browser?.setProjectId?.(projectId);
    }
  }, [projectId]);

  // Load actions khi có testcase ID
  useEffect(() => {
    const loadActions = async () => {
      if (testcaseId) {
        console.log('[Main] Loading actions for testcase ID:', testcaseId);
        setIsLoading(true);

        try {
          const response = await actionService.getActionsByTestCase(testcaseId);
          if (response.success && response.data) {
            setActions(response.data.actions);
            console.log('[Main] Loaded actions:', response.data.actions);
          } else {
            console.error('[Main] Failed to load actions:', response.error);
            setActions([]);
          }
        } catch (error) {
          console.error('[Main] Error loading actions:', error);
          setActions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setActions([]);
      }
    };

    loadActions();
  }, [testcaseId, actionService]);

  useEffect(() => {
    return (window as any).browserAPI?.browser?.onAction((action: any) => {
      if (isPaused) {
        return;
      }
      if (!testcaseId) {
        console.warn('[Main] Testcase ID is not set');
        return;
      }
      if (isAiModalOpen) {
        const newItem = {
          id: Math.random().toString(36),
          name: "",
          type: 'Browser' as const,
          selector: action.selector,
          value: action.elementText,
          domHtml: action.DOMelement,
        };
        setAiElements(prev => [...prev, newItem]);
        return;
      }
      if (isAssertMode) {
        if (!(action?.type === 'assert')) {
          return;
        }
      }
      setActions(prev => receiveAction(testcaseId, prev, action));
    });
  }, [testcaseId, isPaused, aiElements.length, isAssertMode, isAiModalOpen]);

  // Intercept actions from browser: if AI assert is active and we receive an assert AI, populate modal element
  // useEffect(() => {
  //   return (window as any).browserAPI?.browser?.onAction((action: any) => {
  //     if (isPaused) return;
  //     if (!testcaseId) return;
  //     if ((action?.type === 'assert') && (action?.assertType === 'AI')) {
  //       // Push into AI modal elements instead of recording as an action
  //       const newItem = {
  //         id: Math.random().toString(36),
  //         name: "",
  //         type: 'Browser' as const,
  //         selector: action.selector || [],
  //         value: action.elementText || action.value || '',
  //         domHtml: action.DOMelement || '',
  //       };
  //       setAiElements(prev => [...prev, newItem]);
  //       // Do not add to actions list here
  //       return;
  //     }
  //     setActions(prev => receiveAction(testcaseId, prev, action));
  //   });
  // }, [testcaseId, isPaused, aiElements.length]);

  // Listen for browser close events and reset pause state
  useEffect(() => {
    const handleBrowserClose = () => {
      console.log('[Main] Browser closed, resetting pause state');
      setIsBrowserOpen(false);
      setIsPaused(false);
    };

    // Listen for browser close event from main process
    const removeListener = (window as any).browserAPI?.browser?.onBrowserClose?.(handleBrowserClose);
    
    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  const assertTypes = Object.values(AssertType);

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

  const startBrowser = async (url: string) => {
    if (actions.length > 0) {
      setIsBrowserOpen(true);
      setIsPaused(true);
      await (window as any).browserAPI?.browser?.start();
      await (window as any).browserAPI?.browser?.executeActions(actions);
    }
    else {
      if (!url) {
        alert('Please enter a URL');
        return;
      }
      setIsBrowserOpen(true);
      setIsPaused(true);
      await (window as any).browserAPI?.browser?.start();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      await (window as any).browserAPI?.browser?.navigate(url);
      // TODO: Tạo action mới cho navigate
      setActions(prev => receiveAction(testcaseId || '', prev, { type: ActionType.navigate, selector: [], url: url, value: url }));
    }
    setIsPaused(false);
  };

  const pauseBrowser = async () => {
    setIsPaused(!isPaused);
  };

  const stopBrowser = async () => {
    await (window as any).browserAPI?.browser?.stop();
    setIsBrowserOpen(false);
    setIsPaused(false); // Reset pause state when stopping browser
    await (window as any).browserAPI?.browser?.setPauseMode(false);
  };

  const handleAssertSelect = async (assertType: string) => {
    setSelectedAssert(assertType);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    setIsAssertMode(true);
    if ((assertType as any) === AssertType.ai || assertType === 'AI') {
      setIsAiModalOpen(true);
    }
    await (window as any).browserAPI?.browser?.setAssertMode(true, assertType as AssertType);
  };

  const handleAiAddElement = async () => {
    // Default new element is Database type
    setAiElements(prev => [
      ...prev,
      { id: Math.random().toString(36), name: "", type: 'Database' as const, selector: [] }
    ]);
    // Enable assert pick for AI to allow selecting a browser element (optional)
    // setSelectedAssert('AI');
    // setIsAssertMode(true);
    // await (window as any).browserAPI?.browser?.setAssertMode(true, AssertType.ai);
  };

  const handleAiSubmit = () => {
    console.log('[Main] AI elements:', aiElements);
    // This will be wired to API submission in a later step
    setIsAiModalOpen(false);
    setSelectedAssert(null);
    setIsAssertMode(false);
    (window as any).browserAPI?.browser?.setAssertMode(false, '' as any);
  };

  const handleTabSwitch = () => {
    setActiveTab(prev => prev === 'actions' ? 'script' : 'actions');
  };

  // Reload actions from server
  const reloadActions = async () => {
    // Fallback: nếu testcaseId chưa có (null) nhưng đã có actions hiện tại,
    // dùng testcase_id của action đầu tiên để reload
    const effectiveId = testcaseId || actions[0]?.testcase_id || null;
    if (!effectiveId) {
      console.warn('[Main] Reload aborted: missing testcaseId');
      return;
    }
    setIsLoading(true);
    try {
      console.log('[Main] Reloading actions for testcase:', effectiveId);
      const response = await actionService.getActionsByTestCase(effectiveId);
      if (response.success && response.data) {
        setActions(response.data.actions);
        console.log('[Main] Reloaded actions count:', response.data.actions?.length || 0);
      } else {
        setActions([]);
      }
    } catch {
      setActions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAction = (actionId: string) => {
    // Local-only delete (no server request)
    setActions(prev => prev.filter(a => a.action_id !== actionId));
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
        toast.success('All actions deleted successfully');
      } else {
        toast.error(response.error || 'Failed to delete actions');
      }
    } catch (error) {
      console.error('[Main] Error deleting all actions:', error);
      toast.error('Failed to delete actions');
    }
  };

  const handleReorderActions = (reorderedActions: Action[]) => {
    // Local-only reorder (no server request)
    setActions(reorderedActions);
  };

  const handleSelectInsertPosition = (position: number | null) => {
    setSelectedInsertPosition(position);
  };

  const handleSelectAction = (action: Action) => {
    setSelectedAction(action);
    setIsDetailOpen(true);
  };

  const handleUpdateAction = (updatedAction: Action) => {
    // Local-only update (do not call API)
    setActions(prev => prev.map(a => a.action_id === updatedAction.action_id ? { ...a, ...updatedAction } : a));
    setSelectedAction(updatedAction);
    toast.success('Action updated');
  };

  const handleSaveActions = async () => {
    if (!testcaseId) {
      toast.error('No testcase ID available for saving');
      return;
    }

    if (actions.length === 0) {
      toast.warning('No actions to save');
      return;
    }

    try {
      const response = await actionService.batchCreateActions(actions);
      if (response.success) {
        toast.success('All actions saved successfully');
      } else {
        toast.error(response.error || 'Failed to save actions');
      }
    } catch (error) {
      console.error('[Main] Error saving actions:', error);
      toast.error('Failed to save actions');
    }
  };

  const handleRunScript = async () => {
    try {
      const service = new ExecuteScriptsService();
      const code = (activeTab === 'script' && customScript.trim()) ? customScript : actionToCode(actions);
      const toastId = toast.loading('Running script...');
      const resp = await service.executeJavascript({ testcase_id: testcaseId || '', code });
      if (resp.success) {
        const data = resp as unknown as { data?: RunCodeResponse };
        const msg = data?.data?.result || 'Executed successfully';
        console.log('[Main] Run script result:', msg);
        setRunResult(msg);
        toast.update(toastId, { render: 'Run succeeded', type: 'success', isLoading: false, autoClose: 2000 });
      } else {

        setRunResult((resp as unknown as { result?: string }).result || 'Run failed');
        toast.update(toastId, { render: resp.error || 'Run failed', type: 'error', isLoading: false, autoClose: 3000 });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';

      setRunResult(message || 'Unknown error');
      toast.dismiss();
      toast.error(message);
    }
  };

  return (
    <div className="rcd-page">
      <div className="rcd-topbar">
        <input className="rcd-url" placeholder="Type your URL here.." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="rcd-topbar-actions">
        <button
            className={`rcd-ctrl ${isBrowserOpen ? 'rcd-stop' : 'rcd-record'}`}
            title={isBrowserOpen ? "Stop recording" : "Start recording"}
            onClick={() => {
              if (isBrowserOpen) {
                stopBrowser();
              } else {
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
            onDeleteAction={handleDeleteAction} 
            onDeleteAll={handleDeleteAllActions} 
            onReorderActions={handleReorderActions} 
            onReload={reloadActions}
            onSaveActions={handleSaveActions}
            selectedInsertPosition={selectedInsertPosition}
            onSelectInsertPosition={handleSelectInsertPosition}
            onSelectAction={handleSelectAction}
          />
        ) : (
          <TestScriptTab script={customScript || actionToCode(actions)} runResult={runResult} onScriptChange={setCustomScript} />
        )}
      </div>
      <ActionToCodeTab onConvert={handleTabSwitch} onRun={handleRunScript} />
      
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
        onChangePrompt={setAiPrompt}
        onChangeElement={(idx, updater) => setAiElements(prev => prev.map((el, i) => i === idx ? updater(el) : el))}
        onRemoveElement={(idx) => setAiElements(prev => prev.filter((_, i) => i !== idx))}
        onClose={() => { setIsAiModalOpen(false); }}
        onSubmit={handleAiSubmit}
        onAddElement={handleAiAddElement}
      />
    </div>
  );
};

export default Main;


