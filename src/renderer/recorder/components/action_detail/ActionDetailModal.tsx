import React, { useEffect, useMemo, useState } from 'react';
import './ActionDetailModal.css';
import { Action, Element, ActionType, AssertType, CreateType } from '../../types/actions';
import Editor from '@monaco-editor/react';

interface ActionDetailModalProps {
  isOpen: boolean;
  action?: Action | null;
  onClose: () => void;
  onSave?: (updated: Action) => void;
}

const ActionDetailModal: React.FC<ActionDetailModalProps> = ({ isOpen, action, onClose, onSave }) => {
  const [draft, setDraft] = useState<Action | null>(null);

  useEffect(() => {
    if (isOpen && action) {
      // Deep clone minimal mutable fields to avoid mutating prop
      const cloned: Action = {
        ...action,
        elements: action.elements ? action.elements : [],
      };
      setDraft(cloned);
    } else {
      setDraft(null);
    }
  }, [isOpen, action]);

  const updateField = (key: keyof Action, value: any) => {
    setDraft(prev => prev ? { ...prev, [key]: value } as Action : prev);
  };

  const updateElement = (index: number, updater: (el: Element) => Element) => {
    setDraft(prev => {
      if (!prev) return prev;
      const elements = (prev.elements || []).map((el, idx) => idx === index ? updater({ ...el }) : el);
      return { ...prev, elements } as Action;
    });
  };

  const updateStatementQuery = (sql: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev } as Action;
      next.action_datas = (next.action_datas ?? []).map(ad => ({
        ...ad,
        statement: { ...(ad.statement || { statement_id: '', query: '', create_type: CreateType.system }), query: sql },
      }));
      return next;
    });
  };

  const updateActionDataValue = (value: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev } as Action;
      const existingData = next.action_datas?.[0] || {};
      next.action_datas = [{
        ...existingData,
        value: {
          ...(existingData.value || {}),
          value
        }
      }];
      return next;
    });
  };

  const updateActionDataSelectedValue = (selectedValue: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev } as Action;
      const existingData = next.action_datas?.[0] || {};
      next.action_datas = [{
        ...existingData,
        value: {
          ...(existingData.value || {}),
          selected_value: selectedValue
        }
      }];
      return next;
    });
  };

  const updateActionDataChecked = (checked: boolean) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev } as Action;
      const existingData = next.action_datas?.[0] || {};
      next.action_datas = [{
        ...existingData,
        value: {
          ...(existingData.value || {}),
          checked
        }
      }];
      return next;
    });
  };

  const updateActionDataPlaywrightCode = (playwrightCode: string) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next = { ...prev } as Action;
      const existingData = next.action_datas?.[0] || {};
      next.action_datas = [{
        ...existingData,
        value: {
          ...(existingData.value || {}),
          playwright_code: playwrightCode
        }
      }];
      return next;
    });
  };

  const handleSave = () => {
    if (draft && onSave) {
      const normalized = normalizeActionForSave(draft);
      onSave(normalized);
    }
    onClose();
  };

  if (!isOpen || !action || !draft) return null;

  // Visibility rules per action type
  const visibility = (() => {
    const type = draft.action_type;
    const base = {
      showSelectors: true,
      showValue: false,
      valueLabel: 'Value',
      showSelectedValue: false,
      showChecked: false,
      showAssertType: false,
    };

    switch (type) {
      case ActionType.navigate:
        return { ...base, showSelectors: false, showValue: true, valueLabel: 'URL' };
      case ActionType.reload:
        // Reload: chỉ hiển thị Type và Description
        return { ...base, showSelectors: false, showValue: false };
      case ActionType.back:
        // Back: chỉ hiển thị Type và Description
        return { ...base, showSelectors: false, showValue: false };
      case ActionType.forward:
        // Forward: chỉ hiển thị Type và Description
        return { ...base, showSelectors: false, showValue: false };
      case ActionType.database_execution:
        // Database execution: hide selectors/value controls here; will render a dedicated SQL editor section
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
        // Not supported in this modal yet
        return { ...base, showSelectors: false };
      case ActionType.api_request:
        return { ...base, showSelectors: false };
      case ActionType.assert:
        // Assert-specific visibility handled below by assert config
        return { ...base, showAssertType: true };
      case ActionType.wait:
        return { ...base, showValue: true, valueLabel: 'Milliseconds' ,showSelectors: false};
      default:
        return base;
    }
  })();

  // Assert rules: control which fields are needed based on assert type
  const assertConfig = (() => {
    if (draft.action_type !== ActionType.assert) return null;
    const t = draft.assert_type as AssertType | undefined;
    const base = { showSelectors: true, requiresValue: false, valueLabel: 'Value', valueInputType: 'text' as 'text'|'url'|'number', showAccessibleName: false, valuePlaceholder: undefined as string | undefined };
    if (!t) return base;
    switch (t) {
      // element state - no value
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
      // text/value assertions - need value
      case AssertType.toContainText:
      // case AssertType.toHaveAccessibleDescription:
      // case AssertType.toHaveAccessibleName:
      case AssertType.toHaveText:
      case AssertType.toHaveValue:
      case AssertType.toHaveValues:
        return { ...base, requiresValue: true, valueLabel: 'Expected', valueInputType: 'text', valuePlaceholder: (t === AssertType.toHaveValues ? 'Comma-separated values' : undefined) };
      // case AssertType.toHaveCount:
      //   return { ...base, requiresValue: true, valueLabel: 'Count', valueInputType: 'number' };
      // case AssertType.toHaveRole:
      //   return { ...base, requiresValue: true, valueLabel: 'Role', showAccessibleName: true };
      // page-level assertions - no selector
      case AssertType.pageHasATitle:
        return { ...base, showSelectors: false, requiresValue: true, valueLabel: 'Title', valueInputType: 'text' };
      case AssertType.pageHasAURL:
        return { ...base, showSelectors: false, requiresValue: true, valueLabel: 'URL', valueInputType: 'url', valuePlaceholder: 'https://example.com/path' };
      default:
        return base;
    }
  })();

  const addNewSelector = (elementIndex: number) => {
    updateElement(elementIndex, (cur) => ({
      ...cur,
      // Add new selector to the BEGINNING so user-provided selector is on top
      selectors: [{ value: '' }, ...(cur.selectors || [])]
    }));
  };

  const updateSelector = (elementIndex: number, selectorIndex: number, value: string) => {
    updateElement(elementIndex, (cur) => {
      const newSelectors = [...(cur.selectors || [])];
      newSelectors[selectorIndex] = { value };
      return { ...cur, selectors: newSelectors };
    });
  };

  const removeSelector = (elementIndex: number, selectorIndex: number) => {
    updateElement(elementIndex, (cur) => {
      const newSelectors = [...(cur.selectors || [])];
      newSelectors.splice(selectorIndex, 1);
      return { ...cur, selectors: newSelectors };
    });
  };

  const renderElements = () => {
    if (!draft.elements || draft.elements.length === 0) {
      return <div className="rcd-action-detail-empty">No elements</div>;
    }
    return (
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">Elements</div>
        <div className="rcd-action-detail-list">
          {draft.elements.map((el, idx) => (
            <div key={idx} className="rcd-action-detail-list-item">
              {/* Selectors Section */}
              <div className="rcd-action-detail-kv">
                <div className="rcd-action-detail-kv-label-container">
                  <label className="rcd-action-detail-kv-label">Selectors</label>
                  <button
                    type="button"
                    className="rcd-action-detail-add-btn"
                    onClick={() => addNewSelector(idx)}
                    title="Add new selector"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Add Selector
                  </button>
                </div>
                <div className="rcd-action-detail-selectors-list">
                  {el.selectors && el.selectors.length > 0 ? (
                    el.selectors.map((sel, selIdx) => (
                      <div key={selIdx} className="rcd-action-detail-selector-item">
                        <input
                          className="rcd-action-detail-input"
                          value={sel.value || ''}
                          onChange={(e) => updateSelector(idx, selIdx, e.target.value)}
                          placeholder="Enter CSS selector"
                        />
                        <button
                          type="button"
                          className="rcd-action-detail-remove-btn"
                          onClick={() => removeSelector(idx, selIdx)}
                          title="Remove selector"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rcd-action-detail-no-selectors">
                      No selectors. Click "Add Selector" to add one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate a human-friendly description for assert actions
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
      // case AssertType.toHaveAccessibleDescription: return `Assert element has accessible description "${expected}"`;
      // case AssertType.toHaveAccessibleName: return `Assert element has accessible name "${expected}"`;
      case AssertType.toHaveText: return `Assert element has text "${expected}"`;
      case AssertType.toHaveValue: return `Assert element has value "${expected}"`;
      case AssertType.toHaveValues: return `Assert element has values "${expected}"`;
      // case AssertType.toHaveCount: return `Assert element count equals ${expected}`;
      // case AssertType.toHaveRole: return `Assert element has role "${expected}"`;
      case AssertType.pageHasATitle: return `Assert page title equals "${expected}"`;
      case AssertType.pageHasAURL: return `Assert page URL equals "${expected}"`;
      default: return 'Assert';
    }
  };

  const handleAssertTypeChange = (nextType: AssertType) => {
    setDraft(prev => {
      if (!prev) return prev;
      const next: Action = { ...prev, assert_type: nextType };
      // Always regenerate description to match selected assert type
      next.description = generateAssertDescription(nextType, next.action_datas?.[0]?.value?.["value"] || '');
      return next;
    });
  };

  // Normalize action before saving so downstream (ActionTab/Action/Main) receives
  // consistent values:
  // - All primary inputs (URL/Expected/Role/Count...) are stored in action.value
  // - Assert updates: persist assert_type and expected (in value)
  // - Trim selectors and remove empty entries
  // - Keep description as-is (does not remap)
  const normalizeActionForSave = (source: Action): Action => {
    const cloned: Action = {
      ...source,
      // Ensure elements selectors are trimmed and non-empty
      elements: (source.elements || []).map(el => ({
        ...el,
        selectors: (el.selectors || [])
          .map((s: any) => ({ value: (s.value || '').trim() }))
          .filter((s: any) => s.value.length > 0)
      })),
    };

    // For all action types, the main input is kept in `value`
    cloned.action_datas = (source.action_datas ?? []).map(ad => ({
      ...ad,
      value: {
        value: (ad.value?.["value"] ?? '').toString(),
      },
    }));

    // Assert specific mapping
    if (cloned.action_type === ActionType.assert) {
      // assert_type already bound via UI; ensure it is a string
      cloned.assert_type = source.assert_type;
      // expected stays in value per requirement unless assert type doesn't require value
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
      if (cloned.assert_type && noValueAsserts.includes(cloned.assert_type)) {
        cloned.action_datas = (source.action_datas ?? []).map(ad => ({
          ...ad,
          value: {
            value: '',
          },
        }));
      } else {
        cloned.action_datas = (source.action_datas ?? []).map(ad => ({
          ...ad,
          value: {
            value: (ad.value?.["value"] ?? '').toString(),
          },
        }));
      }
    }

    return cloned;
  };

  return (
    <div className="rcd-action-detail-overlay" onClick={onClose}>
      <div className="rcd-action-detail-container" onClick={(e) => e.stopPropagation()}>
        <div className="rcd-action-detail-header">
          <h2 className="rcd-action-detail-title">Action Detail</h2>
          <button className="rcd-action-detail-close" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="rcd-action-detail-content">
        <div className="rcd-action-detail-section">
            <div className="rcd-action-detail-section-title">General</div>
            <div className="rcd-action-detail-grid">
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Type</label>
                <div className="rcd-action-detail-kv-value">
                  <code>{draft.action_type}</code>
                </div>
              </div>
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Description</label>
                <input
                  className="rcd-action-detail-input"
                  value={draft.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Enter action description"
                />
              </div>
            {visibility.showAssertType && (
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Assert Type <span className="rcd-required">*</span></label>
                <select
                  className="rcd-action-detail-input"
                  value={draft.assert_type || ''}
                  onChange={(e) => handleAssertTypeChange(e.target.value as AssertType)}
                  required
                >
                  <option value="">-- Select assert type --</option>
                  {Object.values(AssertType).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
            {(draft.action_type === ActionType.assert ? Boolean(assertConfig?.requiresValue) : visibility.showValue) && (
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">
                  {assertConfig ? assertConfig.valueLabel : visibility.valueLabel}
                  {draft.action_type === ActionType.assert ? <span className="rcd-required">*</span> : null}
                </label>
                <input
                  type={assertConfig ? assertConfig.valueInputType : 'text'}
                  className="rcd-action-detail-input"
                  value={draft.action_datas?.[0]?.value?.["value"] || ''}
                  onChange={(e) => updateActionDataValue(e.target.value)}
                  placeholder={assertConfig && assertConfig.valuePlaceholder ? assertConfig.valuePlaceholder : `Enter ${(assertConfig ? assertConfig.valueLabel : visibility.valueLabel).toLowerCase()}`}
                  required={draft.action_type === ActionType.assert}
                />
              </div>
            )}
            {/* Simplified: no match mode/case sensitive; only equals with value */}
            {assertConfig?.showAccessibleName && (
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Accessible Name (optional)</label>
                <input
                  className="rcd-action-detail-input"
                  value={draft.action_datas?.[0]?.value?.["selected_value"] || ''}
                  onChange={(e) => updateActionDataSelectedValue(e.target.value)}
                  placeholder="Enter accessible name"
                />
              </div>
            )}
            {visibility.showSelectedValue || visibility.showChecked ? (
              <>
                {visibility.showSelectedValue && (
                  <div className="rcd-action-detail-kv">
                    <label className="rcd-action-detail-kv-label">Selected Value</label>
                    <input
                      className="rcd-action-detail-input"
                      value={draft.action_datas?.[0]?.value?.["selected_value"] || ''}
                      onChange={(e) => updateActionDataSelectedValue(e.target.value)}
                      placeholder="Enter selected value"
                    />
                  </div>
                )}
                {visibility.showChecked && (
                  <div className="rcd-action-detail-kv">
                    <label className="rcd-action-detail-kv-label">Checked</label>
                    <div className="rcd-action-detail-kv-value">
                      <input
                        type="checkbox"
                        checked={Boolean(draft.action_datas?.[0]?.value?.["checked"])}
                        onChange={(e) => updateActionDataChecked(e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      {draft.action_datas?.[0]?.value?.["checked"] ? 'Yes' : 'No'}
                    </div>
                  </div>
                )}
              </>
            ) : null}
            </div>
          </div>

        {(draft.action_type !== ActionType.database_execution && (assertConfig ? assertConfig.showSelectors : visibility.showSelectors)) && renderElements()}

          {(draft.action_type !== ActionType.database_execution && draft.action_datas?.[0]?.value?.["playwright_code"]) && (
            <div className="rcd-action-detail-section">
              <div className="rcd-action-detail-section-title">Playwright</div>
              <div className="rcd-action-detail-editor">
                <Editor
                  value={draft.action_datas?.[0]?.value?.function_code || ''}
                  language="javascript"
                  theme="vs"
                  onChange={(value) => updateActionDataPlaywrightCode(value || '')}
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
                  value={(draft.action_datas?.[0]?.statement?.query || '')}
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

export default ActionDetailModal;


