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
  tag: string;
  basic_authentication?: { username: string; password: string }[];
}

interface EditTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id: string; name: string; tag: string; basic_authentication?: { username: string; password: string }[] }) => void;
  testcase: MinimalTestcase | null;
}

const EditTestcase: React.FC<EditTestcaseProps> = ({ isOpen, onClose, onSave, testcase }) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [errors, setErrors] = useState<{ name?: string; tag?: string; username?: string; password?: string }>({});
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
      setTestcaseTag(testcase.tag || '');
      setErrors({});
      // Prefer data from parent (already loaded with testcases), fallback to API fetch
      // Basic Auth temporarily hidden
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

    const newErrors: { name?: string; tag?: string; username?: string; password?: string } = {};
    if (!testcaseName.trim()) {
      newErrors.name = 'Testcase name is required';
    }
    // allow empty username/password meaning remove basic auth
    // Tag is optional; no validation needed
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // 1) Batch create/update actions first
      if (actions && actions.length > 0) {
        const requests: Action[] = actions.map(a => ({
          action_id: a.action_id,
          testcase_id: a.testcase_id,
          action_type: a.action_type,
          description: a.description,
          playwright_code: a.playwright_code,
          elements: (a.elements || []).map((el: any) => ({
            selectors: ((el?.selectors || []) as any[])
              .map((s: any) => {
                const val = typeof s === 'string' ? s : (s?.value || '');
                return val && val.length > 0 ? { value: val } : null;
              })
              .filter(Boolean) as { value: string }[],
            query: el.query,
            value: el.value,
            variable_name: el.variable_name,
          })),
          assert_type: a.assert_type as any,
          value: a.value,
          selected_value: a.selected_value,
          checked: a.checked,
          connection_id: a.connection_id,
          connection: a.connection,
          statement_id: a.statement_id,
          statement: a.statement,
          variable_name: a.variable_name,
          order_index: a.order_index,
          file_upload: a.file_upload,
        }));
        const resp = await actionService.batchCreateActions(requests);
        if (!resp.success) {
          // If batch create fails, stop and surface the error
          throw new Error(resp.error || 'Failed to create actions');
        }
      }

      // 2) Then update testcase info (including Basic Auth if provided)
      onSave({
        id: testcase.testcase_id,
        name: testcaseName.trim(),
        tag: testcaseTag.trim(),
        // basic_authentication: (basicAuthList || []).filter(x => x.username || x.password) // temporarily hidden
      });

      setTestcaseName('');
      setTestcaseTag('');
      // setBasicAuthList([]); // temporarily hidden
      setErrors({});
      onClose();
    } catch (err) {
      // console.error('[EditTestcase] Save failed:', err);
    }
  };

  const handleClose = () => {
    setTestcaseName('');
    setTestcaseTag('');
    // setBasicAuthList([]); // temporarily hidden
    setErrors({});
    onClose();
  };

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
              className={`tcase-edit-form-input ${errors.name ? 'tcase-edit-error' : ''}`}
            />
            {errors.name && <span className="tcase-edit-error-message">{errors.name}</span>}
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
              className={`tcase-edit-form-input ${errors.tag ? 'tcase-edit-error' : ''}`}
            />
            {errors.tag && <span className="tcase-edit-error-message">{errors.tag}</span>}
          </div>

          {/** Basic Authentication temporarily hidden */}

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
            <button type="submit" className="tcase-edit-btn-save">
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


