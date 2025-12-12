import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

interface NavigateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, pageInfo?: SelectedPageInfo) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
}

const isLikelyUrl = (text: string): boolean => {
  const t = text.trim();
  if (!t) return false;
  // Allow without protocol but must contain at least a dot or a slash
  return /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+.*$/.test(t) || /^(https?:\/\/)?\/?[\w.-]/.test(t);
};

const NavigateModal: React.FC<NavigateModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  selectedPageInfo,
  onClearPage
}) => {
  const [input, setInput] = useState<string>('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPageInfo) {
      console.log('[NavigateModal] Page info received:', selectedPageInfo);
      toast.success('Page selected successfully');
    }
  }, [selectedPageInfo]);

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalized = input.trim();
  const valid = isLikelyUrl(normalized);
  const hasSelectedPage = !!selectedPageInfo;
  const disabled = !valid || !hasSelectedPage;

  const submit = () => {
    if (!valid) {
      toast.warning('Please enter a valid URL');
      return;
    }
    if (!hasSelectedPage) {
      toast.warning('Please select a page first');
      return;
    }
    const url = normalized.startsWith('http') ? normalized : `https://${normalized}`;
    onConfirm(url, selectedPageInfo || undefined);
    onClose();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!valid) {
        toast.warning('Please enter a valid URL');
        return;
      }
      if (!hasSelectedPage) {
        toast.warning('Please select a page first');
        return;
      }
      const url = normalized.startsWith('http') ? normalized : `https://${normalized}`;
      onConfirm(url, selectedPageInfo || undefined);
      onClose();
    }
  };

  const handleClearPage = () => {
    onClearPage?.();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        style={{ 
          background: '#fff', 
          borderRadius: 12, 
          width: 420, 
          maxWidth: '92vw', 
          minWidth: 320,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Navigate</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Page</label>
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
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>URL</label>
            <input
              ref={urlInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com or example.com"
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                border: '1px solid #d1d5db', 
                borderRadius: 8, 
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f9fafb' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
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
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigateModal;


