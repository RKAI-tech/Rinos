import React, { useMemo, useState, useEffect } from 'react';
import './Main.css';
import ActionTab from '../../components/action_tab/ActionTab';
import TestScriptTab from '../../components/code_convert/TestScriptTab';
import ActionToCodeTab from '../../components/action_to_code_tab/ActionToCodeTab';
import { ActionService } from '../../services/actions';
import { ActionGetResponse } from '../../types/actions';


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
  console.log('[Main] testcaseId:', testcaseId);
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

  const stopBrowser = async () => {
    await (window as any).browserAPI?.browser?.stop();
  };

  return (
    <div className="rcd-page">
      <div className="rcd-topbar">
        <input className="rcd-url" placeholder="Type your URL here.." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="rcd-topbar-actions">
          <button className="rcd-ctrl rcd-record" title="Record"
            onClick={() => startBrowser(url)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="6,3 20,12 6,21" fill="green"/>
            </svg>
          </button>
          <button className="rcd-ctrl rcd-stop" title="Stop"
            onClick={stopBrowser}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="13" height="13" fill="red"/>
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
          <ActionTab actions={actions} isLoading={isLoading} />
        ) : (
          <TestScriptTab />
        )}
      </div>
      <ActionToCodeTab onConvert={handleTabSwitch} />
    </div>
  );
};

export default Main;


