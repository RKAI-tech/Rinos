import React, { useState, useEffect } from 'react';
import { Action } from '../../../../types/actions';
import { ApiRequestData, ApiRequestMethod } from '../../../../types/actions';
import '../../ActionDetailModal.css';

interface ApiRequestActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizeApiRequestAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Preserve all action_datas as is (including api_request and page_index)
  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const ApiRequestActionDetail: React.FC<ApiRequestActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [method, setMethod] = useState<ApiRequestMethod>('get');
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    // Find api_request from action_datas
    const apiRequestData = (draft.action_datas || []).find(ad => ad.api_request)?.api_request;
    if (apiRequestData) {
      setMethod((apiRequestData.method || 'get').toLowerCase() as ApiRequestMethod);
      setUrl(apiRequestData.url || '');
    } else {
      setMethod('get');
      setUrl('');
    }
  }, [draft.action_datas]);

  const updateApiRequestMethod = (newMethod: ApiRequestMethod) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có api_request, nếu không có thì tạo mới
      let foundIndex = actionDatas.findIndex(ad => ad.api_request !== undefined);
      if (foundIndex === -1) {
        actionDatas.push({ api_request: {} as ApiRequestData });
        foundIndex = actionDatas.length - 1;
      }
      
      // Cập nhật api_request tại foundIndex, giữ nguyên các action_data khác
      const currentApiRequest = actionDatas[foundIndex].api_request || {} as ApiRequestData;
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        api_request: {
          ...currentApiRequest,
          method: newMethod,
        } as ApiRequestData,
      };
      
      next.action_datas = actionDatas;
      return next;
    });
  };

  const updateApiRequestUrl = (newUrl: string) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có api_request, nếu không có thì tạo mới
      let foundIndex = actionDatas.findIndex(ad => ad.api_request !== undefined);
      if (foundIndex === -1) {
        actionDatas.push({ api_request: {} as ApiRequestData });
        foundIndex = actionDatas.length - 1;
      }
      
      // Cập nhật api_request tại foundIndex, giữ nguyên các action_data khác
      const currentApiRequest = actionDatas[foundIndex].api_request || {} as ApiRequestData;
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        api_request: {
          ...currentApiRequest,
          url: newUrl,
        } as ApiRequestData,
      };
      
      next.action_datas = actionDatas;
      return next;
    });
  };

  const methodOptions: ApiRequestMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'trace'];

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
              Method <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="rcd-action-detail-input"
              value={method}
              onChange={(e) => {
                const newMethod = e.target.value.toLowerCase() as ApiRequestMethod;
                setMethod(newMethod);
                updateApiRequestMethod(newMethod);
              }}
            >
              {methodOptions.map(m => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">
              URL <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="rcd-action-detail-input"
              value={url}
              onChange={(e) => {
                const newUrl = e.target.value;
                setUrl(newUrl);
                updateApiRequestUrl(newUrl);
              }}
              placeholder="Enter API URL (e.g., https://api.example.com/users)"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default ApiRequestActionDetail;

