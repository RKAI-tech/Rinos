import React, { useMemo, useState, useEffect } from 'react';
import './Main.css';
// @ts-ignore - JSX component with separate d.ts
import Action from '../../components/action/Action.jsx';
import ActionToCodeTab from '../../components/action_to_code_tab/ActionToCodeTab';

const mockActions = [
  { id: '1', type: 'navigate', title: 'Navigate to https://testcase.rikkei.org', meta: 'https://testcase.rikkei.org', time: '4:56:11 PM' },
  { id: '2', type: 'type', title: 'Enter "hoangdinhhung20012003" in Enter your admin email', meta: '#admin-email', value: 'hoangdinhhung20012003', time: '4:56:11 PM' },
  { id: '3', type: 'type', title: 'Enter "20210399" in Enter your password', meta: '#admin-password', value: '20210399', time: '4:56:11 PM' },
  { id: '4', type: 'keydown', title: 'Key down on Enter your password', meta: '#admin-password', value: 'Enter', time: '4:56:11 PM' },
  { id: '5', type: 'type', title: 'Enter "hoangdinhhung20012003..." in Enter your admin email', meta: '#admin-email', value: 'hoangdinhhung20012003@gmail.com', time: '4:56:11 PM' },
  { id: '6', type: 'keydown', title: 'Key down on Enter your admin email', meta: '#admin-email', value: 'Enter', time: '4:56:11 PM' },
  { id: '7', type: 'click', title: 'Click on …', meta: '.admin-login-form', time: '4:56:11 PM' },
];

interface MainProps {
  testcaseId?: string | null;
}

const Main: React.FC<MainProps> = ({ testcaseId }) => {
  const [url, setUrl] = useState('');
  const [isAssertDropdownOpen, setIsAssertDropdownOpen] = useState(false);
  const [assertSearch, setAssertSearch] = useState('');
  const [selectedAssert, setSelectedAssert] = useState<string | null>(null);
  const actions = useMemo(() => mockActions, []);

  // Log testcase ID khi component mount
  useEffect(() => {
    if (testcaseId) {
      console.log('[Main] Received testcase ID:', testcaseId);
      // TODO: Load testcase data based on ID
    }
  }, [testcaseId]);

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

  const handleAssertSelect = (assertType: string) => {
    setSelectedAssert(assertType);
    setIsAssertDropdownOpen(false);
    setAssertSearch('');
    // Không thay đổi active state, giữ màu xanh
  };

  return (
    <div className="rcd-page">
      <div className="rcd-topbar">
        <input className="rcd-url" placeholder="Type your URL here.." value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="rcd-topbar-actions">
          <button className="rcd-ctrl rcd-record" title="Record">
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
        <div className="rcd-actions-header">
          <h3 className="rcd-actions-title">Actions</h3>
          <div className="rcd-actions-buttons">
            <button className="rcd-action-btn reset" title="Reset">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 4v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="rcd-action-btn save" title="Save">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="rcd-action-btn delete" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="10" y1="11" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="14" y1="11" x2="14" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="rcd-actions-list">
          {actions.map((a) => (
            <Action key={a.id} action={a} />
          ))}
        </div>
        <ActionToCodeTab />
      </div>
    </div>
  );
};

export default Main;


