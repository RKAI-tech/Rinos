import React, { useEffect, useState } from 'react';
import { Action, AssertType, Element } from '../../../../types/actions';
import '../../ActionDetailModal.css';

type CssPropertyType = 'background-color' | 'color' | 'font-size' | 'font-family' | 'font-weight';

const CSS_PROPERTIES: { value: CssPropertyType; label: string; isColor: boolean; isNumber: boolean }[] = [
  { value: 'background-color', label: 'Background Color', isColor: true, isNumber: false },
  { value: 'color', label: 'Color', isColor: true, isNumber: false },
  { value: 'font-size', label: 'Font Size', isColor: false, isNumber: true },
  { value: 'font-family', label: 'Font Family', isColor: false, isNumber: false },
  { value: 'font-weight', label: 'Font Weight', isColor: false, isNumber: true },
];

interface AssertToHaveCssActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

export const isToHaveCssAssertType = (assertType?: AssertType | null): boolean =>
  assertType === AssertType.toHaveCSS;

export const normalizeAssertToHaveCssAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  cloned.action_datas = (source.action_datas || []).map(ad => {
    if (!ad.value) return ad;
    if (ad.value.css_property !== undefined || ad.value.css_value !== undefined) {
      return {
        ...ad,
        value: {
          ...(ad.value || {}),
          css_property: ad.value.css_property ? String(ad.value.css_property) : undefined,
          css_value: ad.value.css_value ? String(ad.value.css_value) : undefined,
        }
      };
    }
    return ad;
  });

  return cloned;
};

const AssertToHaveCssActionDetail: React.FC<AssertToHaveCssActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
  const [cssProperty, setCssProperty] = useState<CssPropertyType>('background-color');
  const [cssValue, setCssValue] = useState<string>('');

  useEffect(() => {
    // Tìm action_data chứa css_property và css_value
    for (const ad of draft.action_datas || []) {
      if (ad.value && (ad.value.css_property !== undefined || ad.value.css_value !== undefined)) {
        const property = ad.value.css_property as CssPropertyType;
        const value = ad.value.css_value as string;
        if (property && CSS_PROPERTIES.some(p => p.value === property)) {
          setCssProperty(property);
        }
        setCssValue(value || '');
        return;
      }
    }
    setCssProperty('background-color');
    setCssValue('');
  }, [draft.action_datas]);

  const updateCssData = (data: Partial<{ css_property: CssPropertyType; css_value: string }>) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      let index = actionDatas.findIndex(ad =>
        ad.value &&
        (typeof ad.value.css_property !== 'undefined' || typeof ad.value.css_value !== 'undefined')
      );

      if (index === -1) {
        actionDatas.push({ value: {} });
        index = actionDatas.length - 1;
      }

      actionDatas[index] = {
        ...actionDatas[index],
        value: {
          ...(actionDatas[index].value || {}),
          ...data,
        },
      };

      next.action_datas = actionDatas;
      return next;
    });
  };

  const handlePropertyChange = (property: CssPropertyType) => {
    setCssProperty(property);
    updateCssData({ css_property: property });
    // Reset value khi đổi property
    setCssValue('');
    updateCssData({ css_value: '' });
  };

  const handleValueChange = (value: string) => {
    const selectedProp = CSS_PROPERTIES.find(p => p.value === cssProperty);
    if (selectedProp?.isNumber) {
      // Chỉ cho phép số và các ký tự đặc biệt cho đơn vị (px, em, rem, %, etc.)
      const numberPattern = /^[\d.]*[a-z%]*$/i;
      if (value === '' || numberPattern.test(value)) {
        setCssValue(value);
        updateCssData({ css_value: value });
      }
    } else {
      setCssValue(value);
      updateCssData({ css_value: value });
    }
  };

  const selectedProp = CSS_PROPERTIES.find(p => p.value === cssProperty);
  const isColorInput = selectedProp?.isColor || false;
  const isNumberInput = selectedProp?.isNumber || false;

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
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 5V19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 12H19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
                          onChange={e => updateSelector(idx, selIdx, e.target.value)}
                          placeholder="Enter CSS selector"
                        />
                        <button
                          type="button"
                          className="rcd-action-detail-remove-btn"
                          onClick={() => removeSelector(idx, selIdx)}
                          title="Remove selector"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M18 6L6 18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M6 6L18 18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
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
        <div className="rcd-action-detail-section-title">CSS Assert</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.action_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Assert Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.assert_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">
              CSS Property <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="rcd-action-detail-input"
              value={cssProperty}
              onChange={e => handlePropertyChange(e.target.value as CssPropertyType)}
              style={{ cursor: 'pointer' }}
            >
              {CSS_PROPERTIES.map(prop => (
                <option key={prop.value} value={prop.value}>
                  {prop.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">
              CSS Value <span style={{ color: '#ef4444' }}>*</span>
              {isColorInput && (
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                  (RGB, hex, or color name)
                </span>
              )}
              {isNumberInput && (
                <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal' }}>
                  (Numbers only, e.g., 16px, 1.5em, 400)
                </span>
              )}
            </label>
            <input
              className="rcd-action-detail-input"
              type="text"
              value={cssValue}
              onChange={e => handleValueChange(e.target.value)}
              placeholder={
                isColorInput 
                  ? 'e.g., #ff0000, rgb(255,0,0), red' 
                  : isNumberInput 
                    ? 'e.g., 16px, 1.5em, 400'
                    : 'Enter CSS value'
              }
            />
          </div>
        </div>
      </div>
      {renderElements()}
    </>
  );
};

export default AssertToHaveCssActionDetail;

