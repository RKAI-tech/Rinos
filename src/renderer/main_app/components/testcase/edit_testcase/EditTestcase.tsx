import React, { useEffect, useMemo, useState, useRef } from 'react';
import './EditTestcase.css';
import '../../../../../renderer/recorder/components/action/Action.css';
import '../../../../../renderer/recorder/components/action_tab/ActionTab.css';
import MAAction from '../../action/Action';
import { Action, Element as ActionElement, TestCaseDataVersion } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import MAActionDetailModal from '../../action_detail/ActionDetailModal';
import { BrowserType } from '../../../types/testcases';
import { TestCaseService } from '../../../services/testcases';
// import { BasicAuthService } from '../../../services/basic_auth'; // temporarily hidden

interface MinimalTestcase {
  testcase_id: string;
  name: string;
  description: string | undefined;
  basic_authentication?: { username: string; password: string };
  browser_type?: string;
}

interface EditTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { testcase_id: string; name: string; description: string | undefined; basic_authentication?: { username: string; password: string }; browser_type?: string; actions?: any[]; testcase_data_versions?: TestCaseDataVersion[] }) => void;
  testcase: MinimalTestcase | null;
  projectId?: string;
}

const EditTestcase: React.FC<EditTestcaseProps> = ({ isOpen, onClose, onSave, testcase, projectId }) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [browserType, setBrowserType] = useState<string>(BrowserType.chrome);
  const [basicAuth, setBasicAuth] = useState<{ username: string; password: string } | null>(null);
  const [hasInitialBasicAuth, setHasInitialBasicAuth] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [testcaseDataVersions, setTestcaseDataVersions] = useState<TestCaseDataVersion[]>([]);
  const actionService = useMemo(() => new ActionService(), []);
  const testCaseService = useMemo(() => new TestCaseService(), []);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const testcaseNameInputRef = useRef<HTMLInputElement>(null);
  // const [basicAuthList, setBasicAuthList] = useState<{ username: string; password: string }[]>([]); // temporarily hidden
  // const [isLoadingBasicAuth, setIsLoadingBasicAuth] = useState(false); // temporarily hidden
  // const [basicAuthError, setBasicAuthError] = useState<string | null>(null); // temporarily hidden

  // Lazy import to avoid circulars in tests
  // const [basicAuthService] = useState(() => {
  //   return new BasicAuthService();
  // });

  useEffect(() => {
    if (testcase) {
      setTestcaseName(testcase.name || '');
      setTestcaseTag(testcase.description || '');
      setBrowserType(testcase.browser_type || BrowserType.chrome);
      const initialBasicAuth = testcase.basic_authentication || null;
      setBasicAuth(initialBasicAuth);
      setHasInitialBasicAuth(!!initialBasicAuth);
      // Prefer data from parent (already loaded with testcases), fallback to API fetch
      // Load actions and testcase_data_versions by testcase
      const loadData = async () => {
        try {
          setIsLoadingActions(true);
          const [actionsResp, versionsResp] = await Promise.all([
            actionService.getActionsByTestCase(testcase.testcase_id, 1000, 0, projectId),
            testCaseService.getTestCaseDataVersions(testcase.testcase_id),
          ]);
          
          // Check if testcase was deleted (both API calls return empty data)
          const isTestcaseDeleted = 
            (!actionsResp.success && actionsResp.error && (
              actionsResp.error.toLowerCase().includes('404') || 
              actionsResp.error.toLowerCase().includes('not found') ||
              actionsResp.error.toLowerCase().includes('does not exist')
            )) ||
            (!versionsResp.success && versionsResp.error && (
              versionsResp.error.toLowerCase().includes('404') || 
              versionsResp.error.toLowerCase().includes('not found') ||
              versionsResp.error.toLowerCase().includes('does not exist')
            ));

          if (isTestcaseDeleted) {
            console.info(`[EditTestcase] Testcase ${testcase.testcase_id} not found (likely deleted), closing modal`);
            onClose();
            return;
          }
          
          if (actionsResp.success && actionsResp.data) {
            const mapped = (actionsResp.data.actions || []) as Action[];
            setActions(mapped);
          } else {
            setActions([]);
          }

          if (versionsResp.success && versionsResp.data) {
            // Convert from API format (with action_data_generations) to save format (with action_data_generation_ids)
            const versions: TestCaseDataVersion[] = (versionsResp.data.testcase_data_versions || []).map(v => ({
              testcase_data_version_id: v.testcase_data_version_id,
              version: v.version,
              action_data_generation_ids: v.action_data_generations
                ?.map(gen => gen.action_data_generation_id)
                .filter((id): id is string => !!id) || [],
            }));
            setTestcaseDataVersions(versions);
          } else {
            setTestcaseDataVersions([]);
          }
        } finally {
          setIsLoadingActions(false);
        }
      };
      loadData();
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

    try {
      // 1) Batch create/update actions first
      let actionRequests: Action[] = [];
      if (actions && actions.length > 0) {
        actionRequests = actions.map(a => ({
          action_id: a.action_id,
          testcase_id: a.testcase_id,
          action_type: a.action_type,
          description: a.description,
          elements: (a.elements || []).map((el: any, idx: number) => ({
            element_id: el?.element_id, // giữ lại element_id nếu có
            selectors: ((el?.selectors || []) as any[])
              .map((s: any) => {
                const val = typeof s === 'string' ? s : (s?.value || '');
                return val && val.length > 0 ? { value: val } : null;
              })
              .filter(Boolean) as { value: string }[],
            order_index: idx+1, // Set order_index theo thứ tự mới (1, 2, 3, ...)
            element_data: el?.element_data, // giữ lại element_data nếu có
            created_at: el?.created_at, // giữ lại created_at nếu có
            updated_at: el?.updated_at, // giữ lại updated_at nếu có
          })),
          assert_type: a.assert_type as any,
          action_datas: a.action_datas,
          action_data_generation: a.action_data_generation, // Giữ lại action_data_generation
        }));
      }

      // 2) Then update testcase info (including Basic Auth if provided)
      onSave({
        testcase_id: testcase.testcase_id,
        name: testcaseName.trim(),
        description: testcaseTag.trim() || undefined,
        basic_authentication: basicAuth && (basicAuth.username || basicAuth.password) ? basicAuth : undefined,
        browser_type: browserType || BrowserType.chrome,
        actions: actionRequests || [],
        testcase_data_versions: testcaseDataVersions.length > 0 ? testcaseDataVersions : undefined
      });

      setTestcaseName('');
      setTestcaseTag('');
      setBrowserType(BrowserType.chrome);
      setBasicAuth(null);
      setHasInitialBasicAuth(false);
      onClose();
    } catch (err) {
      // console.error('[EditTestcase] Save failed:', err);
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
    <div className="tcase-edit-modal-overlay">
      <div className="tcase-edit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tcase-edit-modal-header">
          <h2 className="tcase-edit-modal-title">Edit Testcase</h2>
          <button className="tcase-edit-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="tcase-edit-modal-instructions">Update the testcase details below.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="tcase-edit-modal-form">
          <div className="tcase-edit-form-group">
            <label htmlFor="testcaseName" className="tcase-edit-form-label">
              Testcase Name <span className="tcase-edit-required-asterisk">*</span>
            </label>
            <input
              ref={testcaseNameInputRef}
              type="text"
              id="testcaseName"
              value={testcaseName}
              onChange={(e) => setTestcaseName(e.target.value)}
              placeholder="Enter testcase name"
              className="tcase-edit-form-input"
            />
          </div>

          <div className="tcase-edit-form-group">
            <label htmlFor="testcaseTag" className="tcase-edit-form-label">
              Tag
            </label>
            <input
              type="text"
              id="testcaseTag"
              value={testcaseTag}
              onChange={(e) => setTestcaseTag(e.target.value)}
              placeholder="Enter tag (e.g., smoke, regression)"
              className="tcase-edit-form-input"
            />
          </div>

          {/* Browser Type */}
          <div className="tcase-edit-form-group">
            <label htmlFor="browserType" className="tcase-edit-form-label">
              Browser Type <span className="tcase-edit-required-asterisk">*</span>
            </label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="tcase-edit-form-input"
              required
            >
              <option value={BrowserType.chrome}>Chrome</option>  
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
          </div>

          {/* Basic Authentication */}
          <div className="tcase-edit-form-group">
            <label className="tcase-edit-form-label">
              Basic Authentication
            </label>
            {!basicAuth ? (
              <button
                type="button"
                onClick={() => {
                  setBasicAuth({ username: '', password: '' });
                  setHasInitialBasicAuth(true);
                }}
                className="tcase-edit-btn-add-auth"
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
                    className="tcase-edit-form-input"
                    style={{ flex: 1 }}
                  />
                  <input
                    type="password"
                    value={basicAuth?.password || ''}
                    onChange={(e) => setBasicAuth(prev => ({ username: prev?.username || '', password: e.target.value }))}
                    placeholder="Password"
                    className="tcase-edit-form-input"
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
                className="tcase-edit-btn-add-auth"
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

          {/* Divider between tag and actions */}
          <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />

          {/* Actions list styled like recorder - placed ABOVE action buttons */}
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

          <div className="tcase-edit-modal-actions">
            <button type="button" className="tcase-edit-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="tcase-edit-btn-save"
              disabled={!testcaseName.trim() || !browserType}
            >
              Update
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

export default EditTestcase;


