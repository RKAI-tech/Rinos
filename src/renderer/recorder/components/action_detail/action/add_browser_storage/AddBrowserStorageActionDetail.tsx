import React, { useEffect, useState, useMemo } from 'react';
import { Action } from '../../../../types/actions';
import { BrowserStorageResponse } from '../../../../types/browser_storage';
import { BrowserStorageListItem } from '../../../../types/browser_storage';
import { browserStorageService } from '../../../../services/browser_storage';
import { logErrorAndGetFriendlyMessage } from '../../../../../shared/utils/friendlyError';
import '../../ActionDetailModal.css';

interface AddBrowserStorageActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizeAddBrowserStorageAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Preserve all action_datas as is (including browser_storage and page_info)
  cloned.action_datas = source.action_datas || [];

  return cloned;
};

const AddBrowserStorageActionDetail: React.FC<AddBrowserStorageActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserStorages, setBrowserStorages] = useState<BrowserStorageListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selectedBrowserStorage = useMemo(() => browserStorages.find(c => c.browser_storage_id === selectedId), [browserStorages, selectedId]);

  // Load browser storages on mount
  useEffect(() => {
    const loadBrowserStorages = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const projectId = await (window as any).browserAPI?.browser?.getProjectId?.();
        if (!projectId) {
          setBrowserStorages([]);
          setError('Project ID not found');
          return;
        }
        const resp = await browserStorageService.getBrowserStoragesByProject(projectId);
        if (resp.success && resp.data) {
          setBrowserStorages(resp.data.items || []);
        } else {
          setBrowserStorages([]);
          const message = logErrorAndGetFriendlyMessage(
            '[AddBrowserStorageActionDetail] loadBrowserStorages',
            resp.error,
            'Failed to load browser storages. Please try again.'
          );
          setError(message);
        }
      } catch (e) {
        const message = logErrorAndGetFriendlyMessage(
          '[AddBrowserStorageActionDetail] loadBrowserStorages',
          e,
          'Failed to load browser storages. Please try again.'
        );
        setError(message);
        setBrowserStorages([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadBrowserStorages();
  }, []);

  // Load current selected browser storage from draft
  useEffect(() => {
    const browserStorageData = (draft.action_datas || []).find(ad => ad.browser_storage)?.browser_storage;
    if (browserStorageData && browserStorageData.browser_storage_id) {
      setSelectedId(browserStorageData.browser_storage_id);
    } else {
      setSelectedId('');
    }
  }, [draft.action_datas]);

  const handleBrowserStorageChange = (browserStorageId: string) => {
    setSelectedId(browserStorageId);
    const selectedStorage = browserStorages.find(c => c.browser_storage_id === browserStorageId);
    if (selectedStorage) {
      updateDraft(prev => {
        const next = { ...prev } as Action;
        const actionDatas = [...(next.action_datas || [])];
        
        // Tìm action_data có browser_storage, nếu không có thì tạo mới
        let foundIndex = actionDatas.findIndex(ad => ad.browser_storage !== undefined);
        if (foundIndex === -1) {
          actionDatas.push({ browser_storage: {} as BrowserStorageResponse });
          foundIndex = actionDatas.length - 1;
        }
        
        // Cập nhật browser_storage tại foundIndex, giữ nguyên các action_data khác (như page_info)
        actionDatas[foundIndex] = {
          ...actionDatas[foundIndex],
          browser_storage: {
            browser_storage_id: selectedStorage.browser_storage_id,
            name: selectedStorage.name,
            description: selectedStorage.description,
            value: selectedStorage.value,
            storage_type: selectedStorage.storage_type,
          } as BrowserStorageResponse,
        };
        
        next.action_datas = actionDatas;
        return next;
      });
    }
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
        </div>
      </div>

      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">Browser Storage</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">
              Select browser storage <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="rcd-action-detail-input"
              value={selectedId}
              onChange={(e) => handleBrowserStorageChange(e.target.value)}
              disabled={isLoading || !!error}
            >
              <option value="" disabled>
                {isLoading ? 'Loading...' : (error ? 'Failed to load browser storages' : 'Choose a browser storage...')}
              </option>
              {browserStorages.map((c) => (
                <option key={c.browser_storage_id} value={c.browser_storage_id}>
                  {c.name}
                </option>
              ))}
            </select>
            {error && (
              <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '4px' }}>{error}</div>
            )}
          </div>

          {selectedBrowserStorage && (
            <>
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Name</label>
                <input
                  className="rcd-action-detail-input"
                  value={selectedBrowserStorage.name || ''}
                  readOnly
                  style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                />
              </div>
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Description</label>
                <input
                  className="rcd-action-detail-input"
                  value={selectedBrowserStorage.description || ''}
                  readOnly
                  style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                />
              </div>
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">Type</label>
                <input
                  className="rcd-action-detail-input"
                  value={selectedBrowserStorage.storage_type || ''}
                  readOnly
                  style={{ background: '#f9fafb', cursor: 'not-allowed' }}
                />
              </div>
              <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
                <label className="rcd-action-detail-kv-label">Value</label>
                <textarea
                  className="rcd-action-detail-input"
                  value={selectedBrowserStorage ? JSON.stringify(selectedBrowserStorage.value, null, 2) : ''}
                  readOnly
                  style={{
                    minHeight: '140px',
                    background: '#f9fafb',
                    cursor: 'not-allowed',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '12px',
                    whiteSpace: 'pre',
                    overflow: 'auto'
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AddBrowserStorageActionDetail;

