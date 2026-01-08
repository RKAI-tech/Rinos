import React, { useEffect, useMemo, useState, useRef } from 'react';
import './DuplicateTestcase.css';
import '../../../../../renderer/recorder/components/action/Action.css';
import '../../../../../renderer/recorder/components/action_tab/ActionTab.css';
import MAAction from '../../action/Action';
import { Action, Element as ActionElement } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import MAActionDetailModal from '../../action_detail/ActionDetailModal';
import { BrowserType } from '../../../types/testcases';
// import { BasicAuthService } from '../../../services/basic_auth'; // temporarily hidden

interface MinimalTestcase {
  testcase_id: string;
  name: string;
  description: string | undefined;
  basic_authentication?: { username: string; password: string };
  browser_type?: string;
}

interface DuplicateTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  // Return desired name/tag and prepared actions (without testcase_id)
  onSave: (data: { name: string; tag: string; actions: Action[]; basic_authentication?: { username: string; password: string }; browser_type?: string }) => void;
  // Function provided by parent page to create testcase with actions
  createTestcaseWithActions: (name: string, tag?: string, actions?: Action[], basic_authentication?: { username: string; password: string }, browser_type?: string) => Promise<boolean>;
  testcase: MinimalTestcase | null;
  projectId?: string;
  isDuplicating?: boolean;
}

const DuplicateTestcase: React.FC<DuplicateTestcaseProps> = ({ isOpen, onClose, onSave, createTestcaseWithActions, testcase, projectId, isDuplicating = false }) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [browserType, setBrowserType] = useState<string>(BrowserType.chrome);
  const [basicAuth, setBasicAuth] = useState<{ username: string; password: string } | null>(null);
  const [hasInitialBasicAuth, setHasInitialBasicAuth] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const actionService = useMemo(() => new ActionService(), []);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const testcaseNameInputRef = useRef<HTMLInputElement>(null);
  // const [basicAuthList, setBasicAuthList] = useState<{ username: string; password: string }[]>([]); // temporarily hidden
  // const [isLoadingBasicAuth, setIsLoadingBasicAuth] = useState(false); // temporarily hidden
  // const [basicAuthError, setBasicAuthError] = useState<string | null>(null); // temporarily hidden
  // const [basicAuthService] = useState(() => {
  //   return new BasicAuthService();
  // });

  useEffect(() => {
    if (testcase) {
      setTestcaseName(`${testcase.name || ''} (1)`);
      setTestcaseTag(testcase.description || '');
      setBrowserType(testcase.browser_type || BrowserType.chrome);
      const initialBasicAuth = testcase.basic_authentication || null;
      setBasicAuth(initialBasicAuth);
      setHasInitialBasicAuth(!!initialBasicAuth);
      const loadActions = async () => {
        try {
          setIsLoadingActions(true);
          const resp = await actionService.getActionsByTestCase(testcase.testcase_id, 1000, 0);
          
          // Check if testcase was deleted (404 or Not Found error)
          if (!resp.success && resp.error) {
            const errorLower = resp.error.toLowerCase();
            if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
              console.info(`[DuplicateTestcase] Testcase ${testcase.testcase_id} not found (likely deleted), closing modal`);
              onClose();
              return;
            }
          }
          
          if (resp.success && resp.data) {
            const mapped = (resp.data.actions || []) as Action[];
            setActions(mapped);
          } else {
            setActions([]);
          }
        } finally {
          setIsLoadingActions(false);
        }
      };
      loadActions();
    }
  }, [testcase]);

  // Đồng bộ element theo element_id cho tất cả actions khi một action được chỉnh sửa
  const syncActionsWithUpdatedElement = (currentActions: Action[], updatedAction: Action): Action[] => {
    const elementMap: Record<string, ActionElement> = {};
    (updatedAction.elements || []).forEach(el => {
      if (el.element_id) {
        elementMap[el.element_id] = el;
      }
    });

    if (Object.keys(elementMap).length === 0) {
      return currentActions.map(a => a.action_id === updatedAction.action_id ? { ...a, ...updatedAction } : a);
    }

    return currentActions.map(a => {
      if (a.action_id === updatedAction.action_id) {
        return { ...a, ...updatedAction };
      }
      if (!a.elements || a.elements.length === 0) return a;

      const updatedElements = a.elements.map(el => {
        if (el.element_id && elementMap[el.element_id]) {
          const src = elementMap[el.element_id];
          return {
            ...el,
            ...src,
            element_id: el.element_id, // giữ nguyên id đang có
            order_index: el.order_index ?? src.order_index,
          };
        }
        return el;
      });

      return { ...a, elements: updatedElements };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testcase) return;

    // Validation - nếu không có tên thì không làm gì (nút đã bị disable)
    if (!testcaseName.trim()) {
      return;
    }

    // Clone actions without action_id, testcase_id, và element_id (vì là testcase mới)
    // Nhưng giữ lại element_data và set lại order_index
    const preparedActions = actions.map(a => ({
      ...a,
      action_id: '',
      testcase_id: '',
      elements: (a.elements || []).map((el: any, idx: number) => ({
        // Giữ element_id nếu đã có để đồng bộ element giống nhau
        element_id: el?.element_id,
        selectors: el?.selectors || [],
        order_index: idx + 1, // Set lại order_index theo thứ tự mới (1, 2, 3, ...)
        element_data: el?.element_data, // Giữ lại element_data
        created_at: el?.created_at,
        updated_at: el?.updated_at,
      })),
    }));
    // Prepare actions for createTestCaseWithActions
    // const preparedActions: Action[] = (actions || []).map(a => ({
    //   testcase_id: '', // Will be filled by backend
    //   action_type: a.action_type,
    //   description: a.description,
    //   playwright_code: a.playwright_code,
    //   elements: (a.elements || []).map((el: any) => ({
    //     selectors: ((el?.selectors || []) as any[])
    //       .map((s: any) => {
    //         const val = typeof s === 'string' ? s : (s?.value || '');
    //         return val && val.length > 0 ? { value: val } : null;
    //       })
    //       .filter(Boolean) as { value: string }[]
    //   })),
    //   assert_type: a.assert_type as any,
    //   value: a.value,
    //   selected_value: a.selected_value,
    //   checked: a.checked,
    // }));

    // Use createTestCaseWithActions to create testcase and actions in one call
    const result = await createTestcaseWithActions(
      testcaseName.trim(),
      testcaseTag.trim() || undefined,
      preparedActions,
      basicAuth && (basicAuth.username || basicAuth.password) ? basicAuth : undefined,
      browserType || BrowserType.chrome
    );

    if (result) {
      onSave({
        name: testcaseName.trim(),
        tag: testcaseTag.trim(),
        actions: preparedActions,
        basic_authentication: basicAuth && (basicAuth.username || basicAuth.password) ? basicAuth : undefined,
        browser_type: browserType || BrowserType.chrome
      });
    }
  };

  const handleClose = () => {
    setTestcaseName('');
    setTestcaseTag('');
    setBrowserType(BrowserType.chrome);
    setBasicAuth(null);
    setHasInitialBasicAuth(false);
    onClose();
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-focus on first input when modal opens
  useEffect(() => {
    if (isOpen && testcase && testcaseNameInputRef.current) {
      setTimeout(() => {
        testcaseNameInputRef.current?.focus();
        // Select all text for easy editing
        testcaseNameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, testcase]);

  if (!isOpen || !testcase) return null;

  return (
    <div className="tcase-dup-modal-overlay">
      <div className="tcase-dup-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tcase-dup-modal-header">
          <h2 className="tcase-dup-modal-title">Duplicate Testcase</h2>
          <button className="tcase-dup-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="tcase-dup-modal-instructions">Enter details for the duplicated testcase.</p>

        <form onSubmit={handleSubmit} className="tcase-dup-modal-form">
          <div className="tcase-dup-form-group">
            <label htmlFor="dupTestcaseName" className="tcase-dup-form-label">
              Testcase Name <span className="tcase-dup-required-asterisk">*</span>
            </label>
            <input
              ref={testcaseNameInputRef}
              type="text"
              id="dupTestcaseName"
              value={testcaseName}
              onChange={(e) => setTestcaseName(e.target.value)}
              placeholder="Enter testcase name"
              className="tcase-dup-form-input"
            />
          </div>

          <div className="tcase-dup-form-group">
            <label htmlFor="dupTestcaseTag" className="tcase-dup-form-label">
              Tag
            </label>
            <input
              type="text"
              id="dupTestcaseTag"
              value={testcaseTag}
              onChange={(e) => setTestcaseTag(e.target.value)}
              placeholder="Enter tag (e.g., smoke, regression)"
              className="tcase-dup-form-input"
            />
          </div>

          {/* Browser Type */}
          <div className="tcase-dup-form-group">
            <label htmlFor="dupBrowserType" className="tcase-dup-form-label">
              Browser Type <span className="tcase-dup-required-asterisk">*</span>
            </label>
            <select
              id="dupBrowserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="tcase-dup-form-input"
              required
            >
              <option value={BrowserType.chrome}>Chrome</option>  
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
          </div>

          {/* Basic Authentication */}
          <div className="tcase-dup-form-group">
            <label className="tcase-dup-form-label">
              Basic Authentication
            </label>
            {!basicAuth ? (
              <button
                type="button"
                onClick={() => {
                  setBasicAuth({ username: '', password: '' });
                  setHasInitialBasicAuth(true);
                }}
                className="tcase-dup-btn-add-auth"
                style={{
                  padding: '8px 16px',
                  border: '1px dashed #d1d5db',
                  borderRadius: '6px',
                  background: '#f9fafb',
                  color: '#6b7280',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Basic HTTP Authentication
              </button>
            ) : basicAuth ? (
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={basicAuth?.username || ''}
                    onChange={(e) => setBasicAuth(prev => ({ username: e.target.value, password: prev?.password || '' }))}
                    placeholder="Username"
                    className="tcase-dup-form-input"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="password"
                    value={basicAuth?.password || ''}
                    onChange={(e) => setBasicAuth(prev => ({ username: prev?.username || '', password: e.target.value }))}
                    placeholder="Password"
                    className="tcase-dup-form-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setBasicAuth(null);
                      setHasInitialBasicAuth(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #dc2626',
                      borderRadius: '6px',
                      background: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Remove Basic Authentication"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setBasicAuth({ username: '', password: '' });
                  setHasInitialBasicAuth(true);
                }}
                className="tcase-dup-btn-add-auth"
                style={{
                  padding: '8px 16px',
                  border: '1px dashed #d1d5db',
                  borderRadius: '6px',
                  background: '#f9fafb',
                  color: '#6b7280',
                  cursor: 'pointer',
                  width: '100%',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Basic HTTP Authentication
              </button>
            )}
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

          <div className="rcd-actions-section" style={{ marginTop: 8 }}>
            <div className="rcd-actions-list" style={{ maxHeight: 360, overflowY: 'auto' }}>
              {isLoadingActions ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading actions...</div>
              ) : actions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>No actions</div>
              ) : (
                actions.map(a => (
                  <div key={a.action_id} className="rcd-action-item">
                    <div className="rcd-action-draggable">
                      <MAAction
                        action={a}
                        onEdit={(ac) => setSelectedAction(ac)}
                        onDelete={(id) => setActions(prev => prev.filter(x => x.action_id !== id))}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="tcase-dup-modal-actions">
            <button type="button" className="tcase-dup-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="tcase-dup-btn-save"
              disabled={!testcaseName.trim() || !browserType || isDuplicating}
            >
              {isDuplicating ? (
                <>
                  <span style={{ 
                    display: 'inline-block', 
                    marginRight: '8px',
                    verticalAlign: 'middle'
                  }}>
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg" 
                      style={{ 
                        animation: 'spin 1s linear infinite',
                        display: 'inline-block'
                      }}
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32" opacity="0.3"/>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="24"/>
                    </svg>
                  </span>
                  Duplicating...
                </>
              ) : (
                'Duplicate'
              )}
            </button>
          </div>
        </form>
        <MAActionDetailModal
          isOpen={!!selectedAction}
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onSave={(updated) => setActions(prev => syncActionsWithUpdatedElement(prev, updated as Action))}
          projectId={projectId}
        />
      </div>
    </div>
  );
};

export default DuplicateTestcase;


