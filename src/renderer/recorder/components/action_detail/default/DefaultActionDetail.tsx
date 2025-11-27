import React from 'react';
import { Action } from '../../../types/actions';
import "../ActionDetailModal.css"

interface DefaultActionDetailProps {
  draft: Action;
  updateField: (key: keyof Action, value: any) => void;
}

const DefaultActionDetail: React.FC<DefaultActionDetailProps> = ({ draft, updateField }) => {
  const canEditDescription = typeof draft.description !== 'undefined';

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

          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">Description</label>
            {canEditDescription ? (
              <input
                className="rcd-action-detail-input"
                value={draft.description || ''}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Enter action description"
              />
            ) : (
              <div className="rcd-action-detail-warning">
                This action type is not supported to edit. Contact support if you need to edit this action.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DefaultActionDetail;

