import React, { useState, useEffect } from 'react';
import { Action } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface WaitActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizeWaitAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Normalize wait time value, preserve other action_datas (like page_info)
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    // If this action_data has a value property with value field, normalize it
    if (!ad.value) return ad;
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

const WaitActionDetail: React.FC<WaitActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [waitTime, setWaitTime] = useState<string>('1000');
  
  useEffect(() => {
    // Find value from action_data that has value.value (wait time)
    for (const ad of draft.action_datas || []) {
      if (ad.value?.["value"]) {
        setWaitTime(String(ad.value?.["value"]));
        break;
      }
    }
  }, [draft.action_datas]);

  // Hàm update action data value - giữ nguyên các action_data khác (như page_info)
  const updateActionDataValue = (value: string) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value.value property (wait time), nếu không có thì tạo mới
      let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined && ad.value?.["value"] !== undefined);
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
          value: value
        }
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
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">
              Wait Time (milliseconds) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className="rcd-action-detail-input"
              value={waitTime}
              onChange={(e) => {
                const newValue = e.target.value;
                setWaitTime(newValue);
                updateActionDataValue(newValue);
              }}
              placeholder="e.g. 1000"
              min="0"
              step="1"
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Enter the number of milliseconds to wait
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WaitActionDetail;

