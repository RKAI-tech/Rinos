import React, { useEffect, useMemo, useState } from 'react';
import { Action, AssertType, Element } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface AssertWithValueActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

const ASSERT_WITH_VALUE_TYPES: AssertType[] = [
  AssertType.toHaveText,
  AssertType.toContainText,
  AssertType.toHaveValue,
  AssertType.toHaveValues,
  AssertType.pageHasATitle,
  AssertType.pageHasAURL,
];

export const isAssertWithValueType = (assertType?: AssertType | null): boolean =>
  !!assertType && ASSERT_WITH_VALUE_TYPES.includes(assertType);

export const normalizeAssertWithValueAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  cloned.action_datas = (source.action_datas || []).map(ad => {
    if(!ad.value) return ad;
    if (!("value" in ad.value)) return ad;
      return {
      ...ad,
      value: {
        ...(ad.value || {}),
        value: String(ad.value.value),
      }
    };
  });

  return cloned;
};

const AssertWithValueActionDetail: React.FC<AssertWithValueActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
  const [assertValue, setAssertValue] = useState<string>('');

  const hasStatement = useMemo(
    () => (draft.action_datas || []).some(ad => ad.statement),
    [draft.action_datas],
  );
  const hasApiRequest = useMemo(
    () => (draft.action_datas || []).some(ad => ad.api_request),
    [draft.action_datas],
  );

  useEffect(() => {
    for (const ad of draft.action_datas || []) {
      if (ad.value && typeof ad.value === 'object') {
        if (typeof ad.value['key'] === 'string') {
          setAssertValue(ad.value['key']);
          return;
        }
        if (typeof ad.value['column'] === 'string') {
          setAssertValue(ad.value['column']);
          return;
        }
        if (typeof ad.value['value'] === 'string') {
          setAssertValue(ad.value['value']);
          return;
        }
        return;
      }
    }
    setAssertValue('');
  }, [draft.action_datas]);

  const updateAssertValue = (value: string) => {
    setAssertValue(value);
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];

      const targetField = (() => {
        for (const ad of actionDatas) {
          if (ad.value && typeof ad.value === 'object') {
            if (ad.value['key'] !== undefined) return 'key';
            if (ad.value['column'] !== undefined) return 'column';
            if (ad.value['value'] !== undefined) return 'value';
          }
        }
        return 'value';
      })();

      let valueIndex = actionDatas.findIndex(
        ad => ad.value !== undefined && ad.value?.[targetField] !== undefined && typeof ad.value?.[targetField] === 'string',
      );

      if (valueIndex === -1) {
        actionDatas.push({ value: {} });
        valueIndex = actionDatas.length - 1;
      }

      actionDatas[valueIndex] = {
        ...actionDatas[valueIndex],
        value: {
          ...(actionDatas[valueIndex].value || {}),
          [targetField]: value,
        },
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
        <div className="rcd-action-detail-section-title">General</div>
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
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">
              Value <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="rcd-action-detail-input"
              value={assertValue}
              onChange={e => updateAssertValue(e.target.value)}
              placeholder="Enter expected value"
            />
            {(hasStatement || hasApiRequest) && (
              <div
                style={{
                  marginTop: 6,
                  padding: '8px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#92400e',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                }}
              >
                {hasStatement && hasApiRequest
                  ? 'This value is linked to both database query and API data. Updating it here will not modify those data sources.'
                  : hasStatement
                  ? 'This value is linked to database query results. Updating it here will not modify the database data.'
                  : 'This value is linked to API response data. Updating it here will not modify the API data.'}
              </div>
            )}
          </div>
        </div>
      </div>
      {renderElements()}
    </>
  );
};

export default AssertWithValueActionDetail;

