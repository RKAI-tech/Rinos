import React, { useEffect, useMemo, useState } from 'react';
import { Action, AssertType } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface AssertWithValueActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
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
      if (ad.value?.['value'] !== undefined && typeof ad.value['value'] === 'string') {
        setAssertValue(ad.value['value']);
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

      let valueIndex = actionDatas.findIndex(
        ad => ad.value !== undefined && ad.value?.['value'] !== undefined && typeof ad.value['value'] === 'string',
      );

      if (valueIndex === -1) {
        actionDatas.push({ value: {} });
        valueIndex = actionDatas.length - 1;
      }

      actionDatas[valueIndex] = {
        ...actionDatas[valueIndex],
        value: {
          ...(actionDatas[valueIndex].value || {}),
          value,
        },
      };

      next.action_datas = actionDatas;
      return next;
    });
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
    </>
  );
};

export default AssertWithValueActionDetail;

