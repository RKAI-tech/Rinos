import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { browserStorageService } from '../../../services/browser_storage';
import { BrowserStorageListItem } from '../../../types/browser_storage';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

interface AddBrowserStorageModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onConfirm: (browserStorage: BrowserStorageListItem, pageInfo?: SelectedPageInfo) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
}

const AddBrowserStorageModal: React.FC<AddBrowserStorageModalProps> = ({ 
  isOpen, 
  projectId, 
  onClose, 
  onConfirm,
  selectedPageInfo,
  onClearPage
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserStorages, setBrowserStorages] = useState<BrowserStorageListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selectedBrowserStorage = useMemo(() => browserStorages.find(c => c.browser_storage_id === selectedId), [browserStorages, selectedId]);

  useEffect(() => {
    if (selectedPageInfo) {
      console.log('[AddBrowserStorageModal] Page info received:', selectedPageInfo);
      toast.success('Page selected successfully');
    }
  }, [selectedPageInfo]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId('');
      setError(null);
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

  const hasSelectedPage = !!selectedPageInfo;
  const hasSelectedStorage = !!selectedBrowserStorage;
  const disabled = !hasSelectedStorage || !hasSelectedPage;

  const handleClearPage = () => {
    onClearPage?.();
  };

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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Add Browser Storage</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>
              Page <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {!selectedPageInfo && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: 8,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13, color: '#92400e' }}>
                  Please click on an element on the screen to select the page
                </span>
              </div>
            )}
            {selectedPageInfo ? (
              <div style={{ 
                border: '1px solid #d1d5db', 
                borderRadius: 8, 
                padding: '12px',
                backgroundColor: '#f9fafb',
                marginBottom: 8
              }}>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 500, marginBottom: 4 }}>
                  {selectedPageInfo.page_title || 'Untitled Page'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, wordBreak: 'break-all' }}>
                  {selectedPageInfo.page_url}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  Page Index: {selectedPageInfo.page_index}
                </div>
                <button
                  onClick={handleClearPage}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>
              Select browser storage <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={isLoading || !!error}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                color: '#111827',
                background: '#fff',
                boxSizing: 'border-box'
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 14, color: '#374151' }}>Name</label>
              <input
                value={selectedBrowserStorage?.name || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 14, color: '#374151' }}>Description</label>
              <input
                value={selectedBrowserStorage?.description || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 14, color: '#374151' }}>Type</label>
            <input
              value={selectedBrowserStorage?.storage_type || ''}
              readOnly
              placeholder=""
              style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 14, color: '#374151' }}>Value</label>
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

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f9fafb' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#6b7280',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!selectedBrowserStorage) {
                toast.warning('Please select a browser storage first');
                return;
              }
              if (!hasSelectedPage) {
                toast.warning('Please select a page first');
                return;
              }
              onConfirm(selectedBrowserStorage, selectedPageInfo || undefined);
              onClose();
            }}
            disabled={disabled}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1
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


