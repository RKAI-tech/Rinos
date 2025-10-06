import React, { useEffect, useMemo, useState } from 'react';
import './BasicAuthModal.css';
import { BasicAuthentication } from '../../types/basic_auth';
import { BasicAuthService } from '../../services/basic_auth';
import { toast } from 'react-toastify';

interface BasicAuthModalProps {
  isOpen: boolean;
  testcaseId?: string | null;
  onClose: () => void;
  onSaved?: (
    items:
      | BasicAuthentication[]
      | ((prev: BasicAuthentication[]) => BasicAuthentication[])
  ) => void;
  items?: BasicAuthentication[];
}

const emptyItem = (testcaseId?: string | null): BasicAuthentication => ({
  testcase_id: testcaseId || undefined,
  username: '',
  password: '',
});

const BasicAuthModal: React.FC<BasicAuthModalProps> = ({ isOpen, testcaseId, onClose, onSaved, items = [] }) => {
  const service = useMemo(() => new BasicAuthService(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!testcaseId) {
      onSaved?.([]);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      try {
        const resp = await service.getBasicAuthenticationByTestcaseId(testcaseId);
        if (resp.success) {
          const auths = (resp.data || []).map(x => ({ ...x }));
          onSaved?.(auths);
        } else {
          onSaved?.([]);
          if (resp.error) toast.error(resp.error);
        }
      } catch (e) {
        onSaved?.([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, testcaseId, service]);

  if (!isOpen) return null;

  const updateItem = (index: number, field: keyof BasicAuthentication, value: string) => {
    onSaved?.((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } as BasicAuthentication : it));
  };

  const addItem = () => {
    onSaved?.((prev) => [...prev, emptyItem(testcaseId)]);
  };

  const removeItem = (index: number) => {
    onSaved?.((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!testcaseId) {
      toast.error('Missing testcase ID');
      return;
    }
    const cleaned = items
      .map(x => ({ ...x, testcase_id: testcaseId }))
      .filter(x => (x.username || '').trim().length > 0);
    if (cleaned.length === 0) {
      toast.warning('Please add at least one username');
      return;
    }
    setIsSaving(true);
    try {
      const resp = await service.upsertMultipleBasicAuthentication(cleaned);
      if (resp.success) {
        toast.success('Saved HTTP Authentication');
        if (onSaved) onSaved(resp.data || cleaned);
        onClose();
      } else {
        toast.error(resp.error || 'Failed to save');
      }
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rcd-ba-overlay" onClick={onClose}>
      <div className="rcd-ba-container" onClick={(e) => e.stopPropagation()}>
        <div className="rcd-ba-header">
          <h2 className="rcd-ba-title">HTTP Authentication</h2>
          <button className="rcd-ba-close" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="rcd-ba-content">
          {isLoading ? (
            <div className="rcd-ba-empty">Loading...</div>
          ) : (
            <>
              <div className="rcd-ba-list">
                {items.length === 0 ? (
                  <div className="rcd-ba-empty">No HTTP authentication entries</div>
                ) : (
                  items.map((it, idx) => (
                    <div key={idx} className="rcd-ba-row">
                      <div className="rcd-ba-field">
                        <label className="rcd-ba-label">Username</label>
                        <input
                          className="rcd-ba-input"
                          value={it.username || ''}
                          onChange={(e) => updateItem(idx, 'username', e.target.value)}
                          placeholder="Enter username"
                        />
                      </div>
                      <div className="rcd-ba-field">
                        <label className="rcd-ba-label">Password</label>
                        <input
                          className="rcd-ba-input"
                          type="password"
                          value={it.password || ''}
                          onChange={(e) => updateItem(idx, 'password', e.target.value)}
                          placeholder="Enter password"
                        />
                      </div>
                      <button className="rcd-ba-remove" title="Remove" onClick={() => removeItem(idx)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="rcd-ba-actions">
                <button className="rcd-ba-btn" onClick={addItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 6 }}>
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Add authentication
                </button>
              </div>
            </>
          )}
        </div>

        <div className="rcd-ba-footer">
          <button className="rcd-ba-btn" onClick={onClose}>Cancel</button>
          <button className="rcd-ba-btn primary" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
};

export default BasicAuthModal;


