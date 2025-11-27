import React from 'react';
import { Action, Element } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface ClickActionsDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

// Export normalize function for click actions (click, double_click, right_click, shift_click)
export const normalizeClickAction = (source: Action): Action => {
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

  // For click actions, preserve all action_datas as is (no value normalization needed)
  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const ClickActionsDetail: React.FC<ClickActionsDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
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
        </div>
      </div>

      {renderElements()}
    </>
  );
};

export default ClickActionsDetail;

