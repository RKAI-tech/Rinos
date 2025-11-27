import React from 'react';
import { Action } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface ReloadBackForwardActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizeReloadBackForwardAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Preserve all action_datas as is (e.g., page_index)
  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const ReloadBackForwardActionDetail: React.FC<ReloadBackForwardActionDetailProps> = ({
  draft,
  updateDraft,
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
    </>
  );
};

export default ReloadBackForwardActionDetail;

