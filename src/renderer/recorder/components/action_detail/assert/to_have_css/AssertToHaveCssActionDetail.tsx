import React, { useEffect, useState } from 'react';
import { Action, AssertType } from '../../../../types/actions';
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
    </>
  );
};

export default AssertToHaveCssActionDetail;

