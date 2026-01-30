import React, { useState, useEffect } from 'react';
import { Action, Element } from '../../../../types/actions';
import { getSelectedValueId, resolveSelectedGenerationValue } from '../../../../../shared/utils/actionDataGeneration';
import { browserVariableService } from '../../../../services/browser_variable';
import '../../ActionDetailModal.css';

interface ScrollActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

// Export normalize function for scroll action
export const normalizeScrollAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
    // Ensure elements selectors are trimmed and non-empty
    elements: (source.elements || []).map((el, idx) => ({
      ...el,
      selectors: (el.selectors || [])
        .map((s: any) => ({ value: (s.value || '').trim() }))
        .filter((s: any) => s.value.length > 0),
      order_index: idx+1, // Set order_index theo thứ tự nếu chưa có
    })),
  };

  // For scroll action, normalize all action_datas that have value
  // Preserve all existing properties in action_datas
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    if (!ad.value || typeof ad.value !== 'object') return ad;
    const dataValue: any = ad.value;
    if (dataValue.selected_value_id !== undefined) return ad;
    let scrollX = dataValue.scrollX;
    let scrollY = dataValue.scrollY;
    if ((scrollX == null || scrollY == null) && dataValue.value != null) {
      const parsed = parseScrollValue(String(dataValue.value));
      if (scrollX == null && parsed.x !== '') scrollX = parsed.x;
      if (scrollY == null && parsed.y !== '') scrollY = parsed.y;
    }
    if (scrollX == null && scrollY == null) return ad;
    return {
      ...ad,
      value: {
        ...(dataValue || {}),
        scrollX,
        scrollY,
      }
    }
  });

  return cloned;
};

// Parse value từ format "X:100, Y:200" thành {x: 100, y: 200}
const parseScrollValue = (value: string): { x: string; y: string } => {
  if (!value) return { x: '', y: '' };
  
  const xMatch = value.match(/X:\s*(\d+)/);
  const yMatch = value.match(/Y:\s*(\d+)/);
  
  return {
    x: xMatch ? xMatch[1] : '',
    y: yMatch ? yMatch[1] : '',
  };
};

// Combine x và y thành format "X:x, Y:y"
const combineScrollValue = (x: string, y: string): string => {
  const xVal = x.trim() || '0';
  const yVal = y.trim() || '0';
  return `X:${xVal}, Y:${yVal}`;
};

const ScrollActionDetail: React.FC<ScrollActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
  const [scrollX, setScrollX] = useState("");
  const [scrollY, setScrollY] = useState("");
  
  useEffect(() => {
    let isActive = true;
    const fetchBrowserVariableValue = async (browserVariableId: string) => {
      const resp = await browserVariableService.getBrowserVariableById(browserVariableId);
      if (!resp?.success) {
        return null;
      }
      return (resp as any)?.data?.value ?? null;
    };
    const resolveValue = async () => {
      if (draft.action_data_generation && draft.action_data_generation.length > 0) {
        const generationValue: any = await resolveSelectedGenerationValue(draft, fetchBrowserVariableValue);
        if (generationValue && typeof generationValue === 'object' && (generationValue.scrollX != null || generationValue.scrollY != null)) {
          if (isActive) {
            setScrollX(generationValue.scrollX != null ? String(generationValue.scrollX) : '');
            setScrollY(generationValue.scrollY != null ? String(generationValue.scrollY) : '');
          }
          return;
        }
        if (generationValue != null) {
          const parsed = parseScrollValue(String(generationValue));
          if (isActive) {
            setScrollX(parsed.x);
            setScrollY(parsed.y);
          }
          return;
        }
      }

      // Find value from any action_data in the array, not just [0]
      for (const ad of draft.action_datas || []) {
        const dataValue: any = ad.value;
        if (dataValue && typeof dataValue === 'object' && (dataValue.scrollX != null || dataValue.scrollY != null)) {
          if (isActive) {
            setScrollX(dataValue.scrollX != null ? String(dataValue.scrollX) : '');
            setScrollY(dataValue.scrollY != null ? String(dataValue.scrollY) : '');
          }
          break;
        }
        if (dataValue?.["value"]) {
          const parsed = parseScrollValue(String(dataValue["value"]));
          if (isActive) {
            setScrollX(parsed.x);
            setScrollY(parsed.y);
          }
          break;
        }
      }
    };
    resolveValue();
    return () => {
      isActive = false;
    };
  }, [draft.action_datas, draft.action_data_generation]);

  // Hàm update action data value - giữ nguyên các action_data khác
  const updateActionDataValue = (x: string, y: string) => {
    const xVal = x.trim() || '0';
    const yVal = y.trim() || '0';
    const scrollX = Number(xVal) || 0;
    const scrollY = Number(yVal) || 0;
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
      
      // Cập nhật action_data tại foundIndex, giữ nguyên các action_data khác
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          scrollX,
          scrollY,
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
            <label className="rcd-action-detail-kv-label">Position X</label>
            <input
              type="number"
              className="rcd-action-detail-input"
              value={scrollX}
              onChange={(e) => {
                const newX = e.target.value;
                setScrollX(newX);
                updateActionDataValue(newX, scrollY);
              }}
              placeholder="Enter X position"
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Position Y</label>
            <input
              type="number"
              className="rcd-action-detail-input"
              value={scrollY}
              onChange={(e) => {
                const newY = e.target.value;
                setScrollY(newY);
                updateActionDataValue(scrollX, newY);
              }}
              placeholder="Enter Y position"
            />
          </div>
        </div>
      </div>

      {renderElements()}
    </>
  );
};

export default ScrollActionDetail;

