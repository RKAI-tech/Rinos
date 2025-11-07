import React, { useEffect, useMemo, useState } from 'react';
import './EditTestcase.css';
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
  description: string | undefined;
  basic_authentication?: { username: string; password: string };
}

interface EditTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { testcase_id: string; name: string; description: string | undefined; basic_authentication?: { username: string; password: string }; actions?: any[] }) => void;
  testcase: MinimalTestcase | null;
}

const EditTestcase: React.FC<EditTestcaseProps> = ({ isOpen, onClose, onSave, testcase }) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [basicAuth, setBasicAuth] = useState<{ username: string; password: string } | null>(null);
  const [hasInitialBasicAuth, setHasInitialBasicAuth] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const actionService = useMemo(() => new ActionService(), []);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
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
      const initialBasicAuth = testcase.basic_authentication || null;
      setBasicAuth(initialBasicAuth);
      setHasInitialBasicAuth(!!initialBasicAuth);
      // Prefer data from parent (already loaded with testcases), fallback to API fetch
      // Load actions by testcase
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
          elements: (a.elements || []).map((el: any) => ({
            selectors: ((el?.selectors || []) as any[])
              .map((s: any) => {
                const val = typeof s === 'string' ? s : (s?.value || '');
                return val && val.length > 0 ? { value: val } : null;
              })
              .filter(Boolean) as { value: string }[],
          })),
          assert_type: a.assert_type as any,
          action_datas: a.action_datas,
        }));
      }

      // 2) Then update testcase info (including Basic Auth if provided)
      onSave({
        testcase_id: testcase.testcase_id,
        name: testcaseName.trim(),
        description: testcaseTag.trim() || undefined,
        basic_authentication: basicAuth && (basicAuth.username || basicAuth.password) ? basicAuth : undefined,
        actions: actionRequests || []
      });

      setTestcaseName('');
      setTestcaseTag('');
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

  if (!isOpen || !testcase) return null;

  return (
    <div className="tcase-edit-modal-overlay" onClick={handleClose}>
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
              disabled={!testcaseName.trim()}
            >
              Update
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

export default EditTestcase;


