import React, { useEffect, useMemo, useState } from 'react';
import { browserStorageService } from '../../services/browser_storage';
import { BrowserStorageListItem } from '../../types/browser_storage';

interface AddBrowserStorageModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onConfirm: (browserStorage: BrowserStorageListItem) => void;
}

const AddBrowserStorageModal: React.FC<AddBrowserStorageModalProps> = ({ isOpen, projectId, onClose, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserStorages, setBrowserStorages] = useState<BrowserStorageListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selectedBrowserStorage = useMemo(() => browserStorages.find(c => c.browser_storage_id === selectedId), [browserStorages, selectedId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId('');
      setError(null);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await browserStorageService.getBrowserStoragesByProject(projectId);
        if (resp.success && resp.data) {
          console.log(resp.data.items);
          setBrowserStorages(resp.data.items || []);
        } else {
          setBrowserStorages([]);
          setError(resp.error || 'Failed to load browser storages');
        }
      } catch (e) {
        setError('Failed to load browser storages');
        setBrowserStorages([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: '520px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Add Browser Storage</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Select a browser storage to add to this testcase</div>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', color: '#374151' }}>Select browser storage</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={isLoading || !!error}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#111827',
              background: '#fff',
            }}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#374151' }}>Name</label>
              <input
                value={selectedBrowserStorage?.name || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#374151' }}>Description</label>
              <input
                value={selectedBrowserStorage?.description || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#374151' }}>Type</label>
            <input
              value={selectedBrowserStorage?.storage_type || ''}
              readOnly
              placeholder=""
              style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#374151' }}>Value</label>
            <textarea
              value={selectedBrowserStorage ? JSON.stringify(selectedBrowserStorage.value, null, 2) : ''}
              readOnly
              placeholder=""
              style={{
                minHeight: '140px',
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#f9fafb',
                color: '#111827',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '12px',
                whiteSpace: 'pre',
                overflow: 'auto'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#b91c1c', fontSize: '12px' }}>{error}</div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#fff',
              color: '#374151',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selectedBrowserStorage && onConfirm(selectedBrowserStorage)}
            disabled={!selectedBrowserStorage}
            style={{
              padding: '8px 12px',
              border: '1px solid transparent',
              borderRadius: '6px',
              background: selectedBrowserStorage ? '#10b981' : '#d1d5db',
              color: selectedBrowserStorage ? '#fff' : '#6b7280',
              fontSize: '13px',
              cursor: selectedBrowserStorage ? 'pointer' : 'not-allowed'
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBrowserStorageModal;


