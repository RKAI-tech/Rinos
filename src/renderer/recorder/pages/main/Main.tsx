import React, { useMemo, useState, useEffect } from 'react';
import './Main.css';
import ActionTab from '../../components/action_tab/ActionTab';
import TestScriptTab from '../../components/code_convert/TestScriptTab';
import ActionToCodeTab from '../../components/action_to_code_tab/ActionToCodeTab';
import { ActionService } from '../../services/actions';
import { ActionGetResponse } from '../../types/actions';
import { actionToCode } from '../../utils/action_to_code';
import { ExecuteScriptsService } from '../../services/executeScripts';
import { toast } from 'react-toastify';
import { RunCodeResponse } from '../../types/executeScripts';


interface MainProps {
  testcaseId?: string | null;
}

const Main: React.FC<MainProps> = ({ testcaseId }) => {
  const [url, setUrl] = useState('');
  const [isAssertDropdownOpen, setIsAssertDropdownOpen] = useState(false);
  const [assertSearch, setAssertSearch] = useState('');
  const [selectedAssert, setSelectedAssert] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionGetResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'script'>('actions');
  const [customScript, setCustomScript] = useState<string>('');
  const actionService = useMemo(() => new ActionService(), []);
  
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

  const assertTypes = [
    'Text Assert',
    'Element Assert', 
    'Attribute Assert',
    'Visibility Assert',
    'Click Assert',
    'Input Assert',
    'URL Assert',
    'Title Assert'
  ];

  const filteredAssertTypes = assertTypes.filter(type => 
    type.toLowerCase().includes(assertSearch.toLowerCase())
  );

  const handleAssertClick = () => {
    if (selectedAssert) {
      // Nếu đã có selected assert thì tắt đi (xóa selection)
      setSelectedAssert(null);
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
    } else if (isAssertDropdownOpen) {
      // Nếu dropdown đang mở thì đóng
      setIsAssertDropdownOpen(false);
      setAssertSearch('');
    } else {
      // Nếu không có selected assert và dropdown đang đóng thì mở
      setIsAssertDropdownOpen(true);
    }
  };

  const startBrowser = async (url: string) => {
    if (actions.length > 0) {
      await (window as any).browserAPI?.browser?.start();
      await (window as any).browserAPI?.browser?.executeActions(actions);
    }
    else {
      if (!url) {
        alert('Please enter a URL');
        return;
      }
      await (window as any).browserAPI?.browser?.start();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      await (window as any).browserAPI?.browser?.navigate(url);
    }
  };

  const handleAssertSelect = (assertType: string) => {
    setSelectedAssert(assertType);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    // Không thay đổi active state, giữ màu xanh
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
    // Local-only delete all
    setActions([]);
  };

  const [runResult, setRunResult] = useState<string>('');

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
          <button className="rcd-ctrl" title="Reload actions" onClick={reloadActions}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="21,3 21,9 15,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="rcd-ctrl rcd-record" title="Record"
            onClick={() => startBrowser(url)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="5,3 19,12 5,21" fill="currentColor"/>
            </svg>
          </button>
          <div className="rcd-assert-container">
            <button 
              className={`rcd-ctrl rcd-assert ${isAssertDropdownOpen || selectedAssert ? 'active' : ''}`} 
              title="Assert"
              onClick={handleAssertClick}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
              onClick={() => setSelectedAssert(null)}
              title="Remove selected assert"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="rcd-content">
        {activeTab === 'actions' ? (
          <ActionTab actions={actions} isLoading={isLoading} onDeleteAction={handleDeleteAction} onDeleteAll={handleDeleteAllActions} />
        ) : (
          <TestScriptTab script={customScript || actionToCode(actions)} runResult={runResult} onScriptChange={setCustomScript} />
        )}
      </div>
      <ActionToCodeTab onConvert={handleTabSwitch} onRun={handleRunScript} />
    </div>
  );
};

export default Main;


