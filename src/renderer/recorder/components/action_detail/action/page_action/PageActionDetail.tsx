import React, { useState, useEffect } from 'react';
import { Action, ActionType } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface PageActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizePageAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Preserve all action_datas as is (including page_index, opener_index, url)
  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const PageActionDetail: React.FC<PageActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    // Load current values from draft
    if (draft.action_type === ActionType.page_create) {
      // For page_create: 
      // - URL is in action_data where value.value is a string (not page_index)
      let urlFound = false;
      for (const ad of draft.action_datas || []) {
        // Find URL: value.value is string and not page_index
        if (ad.value?.value !== undefined && typeof ad.value.value === 'string' && ad.value.page_index === undefined) {
          setUrl(ad.value.value);
          urlFound = true;
        }
      }
      if (!urlFound) {
        setUrl('');
      }
    } else {
      // For page_close and page_focus, reset URL
      setUrl('');
    }
  }, [draft.action_datas, draft.action_type]);

  const updateUrl = (newUrl: string) => {
    if (draft.action_type !== ActionType.page_create) return;
    
    setUrl(newUrl);
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value.value là string (URL), không phải action_data có page_index
      let foundIndex = actionDatas.findIndex(ad => 
        ad.value !== undefined && 
        ad.value?.["value"] !== undefined && 
        typeof ad.value["value"] === 'string' &&
        ad.value.page_index === undefined
      );
      if (foundIndex === -1) {
        // Tạo action_data mới nếu chưa có
        actionDatas.push({ value: {} });
        foundIndex = actionDatas.length - 1;
      }
      
      // Cập nhật URL, giữ nguyên các action_data khác (như page_index, opener_index)
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          value: newUrl
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
          {draft.action_type === ActionType.page_create && (
            <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
              <label className="rcd-action-detail-kv-label">URL</label>
              <input
                className="rcd-action-detail-input"
                value={url}
                onChange={(e) => updateUrl(e.target.value)}
                placeholder="Enter page URL"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PageActionDetail;

