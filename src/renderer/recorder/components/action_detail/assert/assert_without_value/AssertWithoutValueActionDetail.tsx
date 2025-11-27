import React from 'react';
import { Action, AssertType } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface AssertWithoutValueActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

const ASSERT_WITHOUT_VALUE_TYPES: AssertType[] = [
  AssertType.toBeVisible,
  AssertType.toBeEnabled,
  AssertType.toBeDisabled,
  AssertType.toBeChecked,
  AssertType.toBeUnchecked,
  AssertType.toBeFocused,
  AssertType.toBeHidden,
  AssertType.toBeEditable,
  AssertType.toBeReadOnly,
  AssertType.toBeEmpty,
];

export const isAssertWithoutValueType = (assertType?: AssertType | null): boolean =>
  !!assertType && ASSERT_WITHOUT_VALUE_TYPES.includes(assertType);

export const normalizeAssertWithoutValueAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const AssertWithoutValueActionDetail: React.FC<AssertWithoutValueActionDetailProps> = ({
  draft,
  updateField,
}) => {
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
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={e => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AssertWithoutValueActionDetail;

