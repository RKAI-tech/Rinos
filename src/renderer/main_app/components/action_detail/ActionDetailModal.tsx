import React, { useEffect, useMemo, useState } from 'react';
import './ActionDetailModal.css';
import { Action as ActionGetResponse, ActionType, AssertType, Action, Element, Selector } from '../../types/actions';
import Editor from '@monaco-editor/react';

interface Props {
  isOpen: boolean;
  action: ActionGetResponse | null;
  onClose: () => void;
  onSave?: (updated: ActionGetResponse) => void;
}

const mapFromResponse = (src: ActionGetResponse): Action => ({
  action_id: src.action_id,
  testcase_id: src.testcase_id,
  action_type: src.action_type as any,
  description: src.description,
  playwright_code: src.playwright_code,
  elements: (src.elements || []) as any,
  assert_type: src.assert_type as any,
  value: src.value,
  selected_value: src.selected_value,
  checked: src.checked,
  // Preserve database-related fields to avoid losing them on save
  connection_id: (src as any).connection_id,
  connection: (src as any).connection,
  statement_id: (src as any).statement_id,
  statement: (src as any).statement,
  variable_name: (src as any).variable_name,
  order_index: (src as any).order_index,
  file_upload: (src as any).file_upload,
});

const mapToResponse = (src: Action): ActionGetResponse => ({
  action_id: src.action_id || '',
  testcase_id: src.testcase_id,
  action_type: src.action_type,
  description: src.description || '',
  playwright_code: src.playwright_code || '',
  elements: (src.elements || []) as any,
  assert_type: (src.assert_type as any) || undefined,
  value: src.value || '',
  selected_value: src.selected_value,
  checked: src.checked,
  connection_id: src.connection_id,
  connection: src.connection,
  statement_id: src.statement_id,
  statement: src.statement,
  variable_name: src.variable_name,
  order_index: src.order_index,
  file_upload: src.file_upload,
});

const MAActionDetailModal: React.FC<Props> = ({ isOpen, action, onClose, onSave }) => {
  const [draft, setDraft] = useState<Action | null>(null);

  useEffect(() => {
    setDraft(action ? mapFromResponse(action) : null);
  }, [action, isOpen]);

  const updateField = (key: keyof Action, value: any) => {
    setDraft(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateElement = (index: number, updater: (el: Element) => Element) => {
    setDraft(prev => {
      if (!prev) return prev;
      const elements = (prev.elements || []).map((el, idx) => (idx === index ? updater({ ...el }) : el));
      return { ...prev, elements };
    });
  };

  const updateStatementQuery = (sql: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev } as Action;
      next.statement = { ...(next.statement || { statement_id: '', query: '' }), query: sql };
      return next;
    });
  };

  const addNewSelector = (elementIndex: number) => {
    updateElement(elementIndex, cur => ({ ...cur, selectors: [{ value: '' }, ...(cur.selectors || [])] }));
  };

  const updateSelector = (elementIndex: number, selectorIndex: number, value: string) => {
    updateElement(elementIndex, cur => {
      const next = [...(cur.selectors || [])];
      next[selectorIndex] = { value };
      return { ...cur, selectors: next };
    });
  };

  const removeSelector = (elementIndex: number, selectorIndex: number) => {
    updateElement(elementIndex, cur => {
      const next = [...(cur.selectors || [])];
      next.splice(selectorIndex, 1);
      return { ...cur, selectors: next };
    });
  };

  const visibility = useMemo(() => {
    const type = draft?.action_type as ActionType | undefined;
    const base = {
      showSelectors: true,
      showValue: false,
      valueLabel: 'Value',
      showSelectedValue: false,
      showChecked: false,
      showAssertType: false,
    };
    if (!type) return base;
    switch (type) {
      case ActionType.navigate:
        return { ...base, showSelectors: false, showValue: true, valueLabel: 'URL' };
      case ActionType.database_execution:
        // hide selectors/value; render dedicated SQL section below
        return { ...base, showSelectors: false, showValue: false };
      case ActionType.input:
        return { ...base, showSelectors: true, showValue: true };
      case ActionType.click:
      case ActionType.double_click:
      case ActionType.right_click:
      case ActionType.shift_click:
        return { ...base, showSelectors: true };
      case ActionType.select:
        return { ...base, showSelectors: true, showSelectedValue: true };
      case ActionType.checkbox:
        return { ...base, showSelectors: true, showChecked: true };
      case ActionType.change:
        return { ...base, showSelectors: true, showValue: true };
      case ActionType.drag_and_drop:
      case ActionType.drag_start:
      case ActionType.drag_end:
      case ActionType.drag_over:
      case ActionType.drag_leave:
      case ActionType.drop:
        return { ...base, showSelectors: true };
      case ActionType.keydown:
      case ActionType.keyup:
      case ActionType.keypress:
        return { ...base, showSelectors: true, showValue: true, valueLabel: 'Key' };
      case ActionType.upload:
        return { ...base, showSelectors: true, showValue: true, valueLabel: 'File Path' };
      case ActionType.scroll:
        return { ...base, showSelectors: true, showValue: true, valueLabel: 'Position' };
      case ActionType.connect_db:
        return { ...base, showSelectors: false };
      case ActionType.assert:
        return { ...base, showAssertType: true };
      case ActionType.wait:
        return { ...base, showValue: true, valueLabel: 'Milliseconds' ,showSelectors: false};
      case ActionType.reload:
        return { ...base, showSelectors: false, showValue: false };
      case ActionType.back:
        return { ...base, showSelectors: false, showValue: false };
      case ActionType.forward:
        return { ...base, showSelectors: false, showValue: false };
      default:
        return base;
    }
  }, [draft?.action_type]);

  const assertConfig = useMemo(() => {
    if ((draft?.action_type as any) !== ActionType.assert) return null;
    const t = draft?.assert_type as AssertType | undefined;
    const base = { showSelectors: true, requiresValue: false, valueLabel: 'Value', valueInputType: 'text' as 'text'|'url'|'number', showAccessibleName: false, valuePlaceholder: undefined as string | undefined };
    if (!t) return base;
    switch (t) {
      case AssertType.toBeChecked:
      case AssertType.toBeUnchecked:
      case AssertType.toBeDisabled:
      case AssertType.toBeEditable:
      case AssertType.toBeReadOnly:
      case AssertType.toBeEmpty:
      case AssertType.toBeEnabled:
      case AssertType.toBeFocused:
      case AssertType.toBeHidden:
      case AssertType.toBeVisible:
        return { ...base, requiresValue: false };
      case AssertType.toContainText:
      case AssertType.toHaveAccessibleDescription:
      case AssertType.toHaveAccessibleName:
      case AssertType.toHaveText:
      case AssertType.toHaveValue:
      case AssertType.toHaveValues:
        return { ...base, requiresValue: true, valueLabel: 'Expected', valueInputType: 'text', valuePlaceholder: t === AssertType.toHaveValues ? 'Comma-separated values' : undefined };
      case AssertType.toHaveCount:
        return { ...base, requiresValue: true, valueLabel: 'Count', valueInputType: 'number' };
      case AssertType.toHaveRole:
        return { ...base, requiresValue: true, valueLabel: 'Role', showAccessibleName: true };
      case AssertType.pageHasATitle:
        return { ...base, showSelectors: false, requiresValue: true, valueLabel: 'Title', valueInputType: 'text' };
      case AssertType.pageHasAURL:
        return { ...base, showSelectors: false, requiresValue: true, valueLabel: 'URL', valueInputType: 'url', valuePlaceholder: 'https://example.com' };
      default:
        return base;
    }
  }, [draft?.assert_type, draft?.action_type]);

  const generateAssertDescription = (type?: AssertType, expected: string = ''): string => {
    switch (type) {
      case AssertType.toBeChecked: return 'Assert element is checked';
      case AssertType.toBeUnchecked: return 'Assert element is unchecked';
      case AssertType.toBeDisabled: return 'Assert element is disabled';
      case AssertType.toBeEditable: return 'Assert element is editable';
      case AssertType.toBeReadOnly: return 'Assert element is read-only';
      case AssertType.toBeEmpty: return 'Assert element is empty';
      case AssertType.toBeEnabled: return 'Assert element is enabled';
      case AssertType.toBeFocused: return 'Assert element is focused';
      case AssertType.toBeHidden: return 'Assert element is hidden';
      case AssertType.toBeVisible: return 'Assert element is visible';
      case AssertType.toContainText: return `Assert element contains text "${expected}"`;
      case AssertType.toHaveAccessibleName: return `Assert element has accessible name "${expected}"`;
      case AssertType.toHaveAccessibleDescription: return `Assert element has accessible description "${expected}"`;
      case AssertType.toHaveText: return `Assert element has text "${expected}"`;
      case AssertType.toHaveValue: return `Assert element has value "${expected}"`;
      case AssertType.toHaveValues: return `Assert element has values "${expected}"`;
      case AssertType.toHaveCount: return `Assert element count equals ${expected}`;
      case AssertType.toHaveRole: return `Assert element has role "${expected}"`;
      case AssertType.pageHasATitle: return `Assert page title equals "${expected}"`;
      case AssertType.pageHasAURL: return `Assert page URL equals "${expected}"`;
      default: return 'Assert';
    }
  };

  const handleAssertTypeChange = (nextType: AssertType) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next: Action = { ...prev, assert_type: nextType } as any;
      next.description = generateAssertDescription(nextType, next.value || '');
      return next;
    });
  };

  const normalizeForSave = (src: Action): Action => {
    const cloned: Action = {
      ...src,
      elements: (src.elements || []).map(el => ({
        ...el,
        selectors: (el.selectors || [])
          .map(s => ({ value: (s.value || '').trim() }))
          .filter(s => s.value.length > 0)
      })),
    };
    if ((cloned.action_type as any) === ActionType.assert) {
      const noValueAsserts: AssertType[] = [
        AssertType.toBeChecked,
        AssertType.toBeUnchecked,
        AssertType.toBeDisabled,
        AssertType.toBeEditable,
        AssertType.toBeReadOnly,
        AssertType.toBeEmpty,
        AssertType.toBeEnabled,
        AssertType.toBeFocused,
        AssertType.toBeHidden,
        AssertType.toBeVisible,
      ];
      if (cloned.assert_type && (noValueAsserts as any).includes(cloned.assert_type)) {
        cloned.value = '';
      }
    }
    return cloned;
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen || !draft) return null;

  const handleSave = () => {
    if (draft && onSave) {
      onSave(mapToResponse(normalizeForSave(draft)));
    }
    onClose();
  };

  return (
    <div className="ma-action-detail-overlay" onClick={onClose}>
      <div className="ma-action-detail-container" onClick={(e) => e.stopPropagation()}>
        <div className="ma-action-detail-header">
          <h3 className="ma-action-detail-title">Action Detail</h3>
          <button className="ma-action-detail-close" onClick={onClose}>✕</button>
        </div>
        <div className="ma-action-detail-content">
          <div className="rcd-action-detail-section">
            <div className="rcd-action-detail-section-title">General</div>
            <div className="rcd-action-detail-grid">
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Type</label>
                <div className="rcd-action-detail-kv-value"><code>{String(draft.action_type)}</code></div>
              </div>
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Description</label>
                <input className="rcd-action-detail-input" value={draft.description || ''} onChange={(e) => updateField('description', e.target.value)} placeholder="Enter action description" />
              </div>
              {visibility.showAssertType && (
                <div className="rcd-action-detail-kv">
                  <label className="rcd-action-detail-kv-label">Assert Type <span className="rcd-required">*</span></label>
                  <select className="rcd-action-detail-input" value={String(draft.assert_type || '')} onChange={(e) => handleAssertTypeChange(e.target.value as unknown as AssertType)}>
                    <option value="">-- Select assert type --</option>
                    {Object.values(AssertType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              {(draft.action_type === ActionType.assert ? Boolean((assertConfig as any)?.requiresValue) : visibility.showValue) && (
                <div className="rcd-action-detail-kv">
                  <label className="rcd-action-detail-kv-label">{assertConfig ? (assertConfig as any).valueLabel : visibility.valueLabel}</label>
                  <input className="rcd-action-detail-input" value={draft.value || ''} onChange={(e) => updateField('value', e.target.value)} placeholder={`Enter ${(assertConfig ? (assertConfig as any).valueLabel : visibility.valueLabel).toLowerCase()}`} />
                </div>
              )}
            </div>
          </div>

          {(draft.action_type !== ActionType.database_execution && (assertConfig ? (assertConfig as any).showSelectors : visibility.showSelectors)) && (
            <div className="rcd-action-detail-section">
              <div className="rcd-action-detail-section-title">Elements</div>
              <div className="rcd-action-detail-list">
                {(draft.elements && draft.elements.length > 0 ? draft.elements : [{ selectors: [] as Selector[] } as Element]).map((el, idx) => (
                  <div key={idx} className="rcd-action-detail-list-item">
                    <div className="rcd-action-detail-kv">
                      <div className="rcd-action-detail-kv-label-container">
                        <label className="rcd-action-detail-kv-label">Selectors</label>
                        <button type="button" className="rcd-action-detail-add-btn" onClick={() => addNewSelector(idx)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Add Selector
                        </button>
                      </div>
                      <div className="rcd-action-detail-selectors-list">
                        {(el.selectors || []).length > 0 ? (
                          (el.selectors || []).map((s, sIdx) => (
                            <div key={sIdx} className="rcd-action-detail-selector-item">
                              <input className="rcd-action-detail-input" value={s.value || ''} onChange={(e) => updateSelector(idx, sIdx, e.target.value)} placeholder="Enter CSS selector" />
                              <button type="button" className="rcd-action-detail-remove-btn" onClick={() => removeSelector(idx, sIdx)}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="rcd-action-detail-no-selectors">No selectors. Click "Add Selector" to add one.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(draft.action_type !== ActionType.database_execution && draft.playwright_code) && (
            <div className="rcd-action-detail-section">
              <div className="rcd-action-detail-section-title">Playwright</div>
              <div className="rcd-action-detail-editor">
                <Editor
                  value={draft.playwright_code || ''}
                  language="javascript"
                  theme="vs"
                  onChange={(value) => updateField('playwright_code', value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineHeight: 21,
                    wordWrap: 'off',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    readOnly: false,
                  }}
                />
              </div>
            </div>
          )}

          {draft.action_type === ActionType.database_execution && (
            <div className="rcd-action-detail-section">
              <div className="rcd-action-detail-section-title">Database</div>
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">SQL Query</label>
                <textarea
                  className="rcd-action-detail-input"
                  style={{ minHeight: '120px', fontFamily: 'monospace' }}
                  value={(draft.statement?.query || '')}
                  onChange={(e) => updateStatementQuery(e.target.value)}
                  placeholder="SELECT * FROM table_name;"
                />
              </div>
            </div>
          )}

          <div className="rcd-action-detail-footer">
            <button className="rcd-action-detail-btn" onClick={onClose}>Cancel</button>
            <button className="rcd-action-detail-btn primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MAActionDetailModal;


