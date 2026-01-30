import React, { useState, useEffect } from 'react';
import { Action, Element } from '../../../../types/actions';
import { getSelectedValueId, resolveSelectedGenerationValue } from '../../../../../shared/utils/actionDataGeneration';
import { browserVariableService } from '../../../../services/browser_variable';
import '../../ActionDetailModal.css';

interface WindowResizeActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

// Export normalize function for window_resize action
export const normalizeWindowResizeAction = (source: Action): Action => {
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

  // For window_resize action, normalize all action_datas that have value
  // Preserve all existing properties in action_datas (like page_index, elementText)
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    if (!ad.value || typeof ad.value !== 'object') return ad;
    const dataValue: any = ad.value;
    if (dataValue.selected_value_id !== undefined) return ad;
    let width = dataValue.width;
    let height = dataValue.height;
    if ((width == null || height == null) && dataValue.value != null) {
      const parsed = parseWindowResizeValue(String(dataValue.value));
      if (width == null && parsed.width !== '') width = parsed.width;
      if (height == null && parsed.height !== '') height = parsed.height;
    }
    if (width == null && height == null) return ad;
    return {
      ...ad,
      value: {
        ...(dataValue || {}),
        width,
        height,
      }
    }
  });

  return cloned;
};

// Parse value từ format "Width:100, Height:200" thành {width: 100, height: 200}
const parseWindowResizeValue = (value: string): { width: string; height: string } => {
  if (!value) return { width: '', height: '' };
  
  const widthMatch = value.match(/Width\s*:\s*(\d+)/i);
  const heightMatch = value.match(/Height\s*:\s*(\d+)/i);
  
  return {
    width: widthMatch ? widthMatch[1] : '',
    height: heightMatch ? heightMatch[1] : '',
  };
};

// Combine width và height thành format "Width:width, Height:height"
const combineWindowResizeValue = (width: string, height: string): string => {
  const widthVal = width.trim() || '0';
  const heightVal = height.trim() || '0';
  return `Width:${widthVal}, Height:${heightVal}`;
};

const WindowResizeActionDetail: React.FC<WindowResizeActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
  const [windowWidth, setWindowWidth] = useState("");
  const [windowHeight, setWindowHeight] = useState("");
  
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
        if (generationValue && typeof generationValue === 'object' && (generationValue.width != null || generationValue.height != null)) {
          if (isActive) {
            setWindowWidth(generationValue.width != null ? String(generationValue.width) : '');
            setWindowHeight(generationValue.height != null ? String(generationValue.height) : '');
          }
          return;
        }
        if (generationValue != null) {
          const parsed = parseWindowResizeValue(String(generationValue));
          if (isActive) {
            setWindowWidth(parsed.width);
            setWindowHeight(parsed.height);
          }
          return;
        }
      }

      // Find value from any action_data in the array, not just [0]
      for (const ad of draft.action_datas || []) {
        const dataValue: any = ad.value;
        if (dataValue && typeof dataValue === 'object' && (dataValue.width != null || dataValue.height != null)) {
          if (isActive) {
            setWindowWidth(dataValue.width != null ? String(dataValue.width) : '');
            setWindowHeight(dataValue.height != null ? String(dataValue.height) : '');
          }
          break;
        }
        if (dataValue?.["value"]) {
          const parsed = parseWindowResizeValue(String(dataValue["value"]));
          if (isActive) {
            setWindowWidth(parsed.width);
            setWindowHeight(parsed.height);
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

  // Hàm update action data value - giữ nguyên các action_data khác (như page_index, elementText)
  const updateActionDataValue = (width: string, height: string) => {
    const widthVal = width.trim() || '0';
    const heightVal = height.trim() || '0';
    const normalizedWidth = Number(widthVal) || 0;
    const normalizedHeight = Number(heightVal) || 0;
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value property với value field, nếu không có thì tạo mới
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
          width: normalizedWidth,
          height: normalizedHeight,
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
            <label className="rcd-action-detail-kv-label">Width</label>
            <input
              type="number"
              className="rcd-action-detail-input"
              value={windowWidth}
              onChange={(e) => {
                const newWidth = e.target.value;
                setWindowWidth(newWidth);
                updateActionDataValue(newWidth, windowHeight);
              }}
              placeholder="Enter window width"
              min="0"
              step="1"
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Height</label>
            <input
              type="number"
              className="rcd-action-detail-input"
              value={windowHeight}
              onChange={(e) => {
                const newHeight = e.target.value;
                setWindowHeight(newHeight);
                updateActionDataValue(windowWidth, newHeight);
              }}
              placeholder="Enter window height"
              min="0"
              step="1"
            />
          </div>
        </div>
      </div>

      {renderElements()}
    </>
  );
};

export default WindowResizeActionDetail;

