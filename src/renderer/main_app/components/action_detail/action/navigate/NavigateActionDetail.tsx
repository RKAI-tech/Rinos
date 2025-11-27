import React, { useState, useEffect } from 'react';
import { Action } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface NavigateActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

// Export normalize function for navigate action
export const normalizeNavigateAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // For navigate action, normalize all action_datas that have value
  // Preserve all existing properties in action_datas
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    if(!ad.value) return ad;
    if (!("value" in ad.value)) return ad;
    return {
      ...ad,
      value: {
        ...(ad.value || {}),
        value:String(ad.value.value),
      }
    }
    return ad;
  });

  return cloned;
};

const NavigateActionDetail: React.FC<NavigateActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [url, setUrl] = useState("");
  useEffect(() => {
    console.log(draft.action_datas);
    for (const ad of draft.action_datas || []) {
      if (ad.value?.["value"]) {
        setUrl(ad.value?.["value"]);
        break;
      }
    }
  }, [draft.action_datas]);

  // Hàm update action data value - giữ nguyên các action_data khác
  const updateActionDataValue = (value: string) => {
    console.log("action_datas before update", draft.action_datas);
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value property, nếu không có thì tạo mới
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
          value
        }
      };
      next.action_datas = actionDatas;
      return next;
    });
  };
  return (
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
          <label className="rcd-action-detail-kv-label">URL</label>
          <input
            className="rcd-action-detail-input"
            value={url}
            onChange={(e) => {
              const newUrl = e.target.value;
              setUrl(newUrl);
              updateActionDataValue(newUrl);
            }}
            placeholder="Enter URL"
          />
        </div>
      </div>
    </div>
  );
};

export default NavigateActionDetail;

