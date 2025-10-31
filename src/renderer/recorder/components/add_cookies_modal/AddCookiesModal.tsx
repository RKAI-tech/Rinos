import React, { useEffect, useMemo, useState } from 'react';
import { cookiesService } from '../../services/cookies';
import { CookiesListItem } from '../../types/cookies';

interface AddCookiesModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onConfirm: (cookie: CookiesListItem) => void;
}

const AddCookiesModal: React.FC<AddCookiesModalProps> = ({ isOpen, projectId, onClose, onConfirm }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookies, setCookies] = useState<CookiesListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selectedCookie = useMemo(() => cookies.find(c => c.cookies_id === selectedId), [cookies, selectedId]);

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
        const resp = await cookiesService.getCookiesByProject(projectId);
        if (resp.success && resp.data) {
          setCookies(resp.data.items || []);
        } else {
          setCookies([]);
          setError(resp.error || 'Failed to load cookies');
        }
      } catch (e) {
        setError('Failed to load cookies');
        setCookies([]);
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
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>Add Cookies</div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Select a cookie set to add to this testcase</div>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ fontSize: '12px', color: '#374151' }}>Select cookies</label>
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
              {isLoading ? 'Loading...' : (error ? 'Failed to load cookies' : 'Choose a cookie...')}
            </option>
            {cookies.map((c) => (
              <option key={c.cookies_id} value={c.cookies_id}>
                {c.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#374151' }}>Name</label>
              <input
                value={selectedCookie?.name || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#374151' }}>Description</label>
              <input
                value={selectedCookie?.description || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', color: '#374151' }}>Value</label>
            <textarea
              value={selectedCookie ? JSON.stringify(selectedCookie.value, null, 2) : ''}
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
            onClick={() => selectedCookie && onConfirm(selectedCookie)}
            disabled={!selectedCookie}
            style={{
              padding: '8px 12px',
              border: '1px solid transparent',
              borderRadius: '6px',
              background: selectedCookie ? '#10b981' : '#d1d5db',
              color: selectedCookie ? '#fff' : '#6b7280',
              fontSize: '13px',
              cursor: selectedCookie ? 'pointer' : 'not-allowed'
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCookiesModal;


