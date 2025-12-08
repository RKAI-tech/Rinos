import React, { useState, useEffect } from 'react';
import { Action, Element } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface ChangeActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

// Export normalize function for change action
export const normalizeChangeAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
    // Ensure elements selectors are trimmed and non-empty
    elements: (source.elements || []).map((el, idx) => ({
      ...el,
      selectors: (el.selectors || [])
        .map((s: any) => ({ value: (s.value || '').trim() }))
        .filter((s: any) => s.value.length > 0),
      order_index: idx + 1, // Set order_index theo thứ tự mới (1, 2, 3, ...)
    })),
  };

  // For change action, normalize all action_datas that have value and checked
  // Preserve all existing properties in action_datas
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    // If this action_data has a value property, normalize value and checked
    if (!ad.value) return ad;
    if (!("checked" in ad.value)) return ad;
      return {
        ...ad,
        value: {
          ...(ad.value || {}),
          value: String(ad.value.value),
          checked: Boolean(ad.value?.["checked"]),
          elementText: String(ad.value.elementText),
        }
      };
  });

  return cloned;
};

const ChangeActionDetail: React.FC<ChangeActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
  const [changeValue, setChangeValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [elementText, setElementText] = useState("");
  
  useEffect(() => {
    // Find value, checked, and elementText from any action_data in the array
    for (const ad of draft.action_datas || []) {
      if (ad.value) {
        if (ad.value["value"] !== undefined) {
          setChangeValue(ad.value["value"]);
        }
        if (ad.value["checked"] !== undefined) {
          setChecked(Boolean(ad.value["checked"]));
        }
        if (ad.value["elementText"] !== undefined) {
          setElementText(ad.value["elementText"]);
        }
        break;
      }
    }
  }, [draft.action_datas]);

  // Hàm update action data checked - tự động cập nhật value thành "on" hoặc "off"
  const updateActionDataChecked = (checked: boolean) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value property, nếu không có thì tạo mới
      let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
      if (foundIndex === -1) {
        // Tạo action_data mới nếu chưa có
        actionDatas.push({ value: {} });
        foundIndex = actionDatas.length - 1;
      }
      
      // Cập nhật action_data tại foundIndex, tự động set value theo checked
      // checked = true => value = "on", checked = false => value = "off"
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          checked,
          value: checked ? "on" : "off"
        }
      };
      
      next.action_datas = actionDatas;
      return next;
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

  return (
    <>
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
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Checked</label>
            <div className="rcd-action-detail-kv-value">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  const newChecked = e.target.checked;
                  setChecked(newChecked);
                  setChangeValue(newChecked ? "on" : "off");
                  updateActionDataChecked(newChecked);
                }}
              />
              <span style={{ marginLeft: '8px' }}>{checked ? 'On' : 'Off'}</span>
            </div>
          </div>
          {changeValue && (
            <div className="rcd-action-detail-kv">
              <label className="rcd-action-detail-kv-label">Value</label>
              <div className="rcd-action-detail-kv-value">
                <span>{changeValue}</span>
              </div>
            </div>
          )}
          {elementText && (
            <div className="rcd-action-detail-kv">
              <label className="rcd-action-detail-kv-label">Element Text</label>
              <div className="rcd-action-detail-kv-value">
                <span>{elementText}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {renderElements()}
    </>
  );
};

export default ChangeActionDetail;

