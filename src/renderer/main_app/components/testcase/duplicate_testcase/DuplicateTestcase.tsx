import React, { useEffect, useMemo, useState } from 'react';
import './DuplicateTestcase.css';
import '../../../../../renderer/recorder/components/action/Action.css';
import '../../../../../renderer/recorder/components/action_tab/ActionTab.css';
import MAAction from '../../action/Action';
import { Action } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import MAActionDetailModal from '../../action_detail/ActionDetailModal';
// import { BasicAuthService } from '../../../services/basic_auth'; // temporarily hidden

interface MinimalTestcase {
  testcase_id: string;
  name: string;
  tag: string;
  basic_authentication?: { username: string; password: string };
}

interface DuplicateTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  // Return desired name/tag and prepared actions (without testcase_id)
  onSave: (data: { name: string; tag: string; actions: Action[]; basic_authentication?: { username: string; password: string } }) => void;
  // Function provided by parent page to create testcase with actions
  createTestcaseWithActions: (name: string, tag?: string, actions?: Action[], basic_authentication?: { username: string; password: string }) => Promise<boolean>;
  testcase: MinimalTestcase | null;
}

const DuplicateTestcase: React.FC<DuplicateTestcaseProps> = ({ isOpen, onClose, onSave, createTestcaseWithActions, testcase }) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [errors, setErrors] = useState<{ name?: string; tag?: string; username?: string; password?: string }>({});
  const [basicAuth, setBasicAuth] = useState<{ username: string; password: string } | null>(null);
  const [hasInitialBasicAuth, setHasInitialBasicAuth] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const actionService = useMemo(() => new ActionService(), []);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  // const [basicAuthList, setBasicAuthList] = useState<{ username: string; password: string }[]>([]); // temporarily hidden
  // const [isLoadingBasicAuth, setIsLoadingBasicAuth] = useState(false); // temporarily hidden
  // const [basicAuthError, setBasicAuthError] = useState<string | null>(null); // temporarily hidden
  // const [basicAuthService] = useState(() => {
  //   return new BasicAuthService();
  // });

  useEffect(() => {
    if (testcase) {
      setTestcaseName(`${testcase.name || ''} Copy`);
      setTestcaseTag(testcase.tag || '');
      const initialBasicAuth = testcase.basic_authentication || null;
      setBasicAuth(initialBasicAuth);
      setHasInitialBasicAuth(!!initialBasicAuth);
      setErrors({});
      const loadActions = async () => {
        try {
          setIsLoadingActions(true);
          const resp = await actionService.getActionsByTestCase(testcase.testcase_id, 1000, 0);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testcase) return;

    const newErrors: { name?: string; tag?: string; username?: string; password?: string } = {};
    if (!testcaseName.trim()) {
      newErrors.name = 'Testcase name is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // TODO: clone actions without action_id and testcase_id
    const preparedActions = actions.map(a => ({
      ...a,
      action_id: '',
      testcase_id: '',
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
      basicAuth && (basicAuth.username || basicAuth.password) ? basicAuth : undefined
    );

    if (result) {
      onSave({
        name: testcaseName.trim(),
        tag: testcaseTag.trim(),
        actions: preparedActions,
        basic_authentication: basicAuth && (basicAuth.username || basicAuth.password) ? basicAuth : undefined
      });
    }
  };

  const handleClose = () => {
    setTestcaseName('');
    setTestcaseTag('');
    setBasicAuth(null);
    setHasInitialBasicAuth(false);
    setErrors({});
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

  if (!isOpen || !testcase) return null;

  return (
    <div className="tcase-dup-modal-overlay" onClick={handleClose}>
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
              type="text"
              id="dupTestcaseName"
              value={testcaseName}
              onChange={(e) => setTestcaseName(e.target.value)}
              placeholder="Enter testcase name"
              className={`tcase-dup-form-input ${errors.name ? 'tcase-dup-error' : ''}`}
            />
            {errors.name && <span className="tcase-dup-error-message">{errors.name}</span>}
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
              className={`tcase-dup-form-input ${errors.tag ? 'tcase-dup-error' : ''}`}
            />
            {errors.tag && <span className="tcase-dup-error-message">{errors.tag}</span>}
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
                    className={`tcase-dup-form-input ${errors.username ? 'tcase-dup-error' : ''}`}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="password"
                    value={basicAuth?.password || ''}
                    onChange={(e) => setBasicAuth(prev => ({ username: prev?.username || '', password: e.target.value }))}
                    placeholder="Password"
                    className={`tcase-dup-form-input ${errors.password ? 'tcase-dup-error' : ''}`}
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
                {errors.username && <span className="tcase-dup-error-message">{errors.username}</span>}
                {errors.password && <span className="tcase-dup-error-message">{errors.password}</span>}
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
            <button type="submit" className="tcase-dup-btn-save">
              Duplicate
            </button>
          </div>
        </form>
        <MAActionDetailModal
          isOpen={!!selectedAction}
          action={selectedAction}
          onClose={() => setSelectedAction(null)}
          onSave={(updated) => setActions(prev => prev.map(x => x.action_id === updated.action_id ? updated : x))}
        />
      </div>
    </div>
  );
};

export default DuplicateTestcase;


