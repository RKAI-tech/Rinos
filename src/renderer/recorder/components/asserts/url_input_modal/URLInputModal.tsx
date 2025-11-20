import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import './URLInputModal.css';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

interface URLInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, pageInfo?: SelectedPageInfo) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
}

const URLInputModal: React.FC<URLInputModalProps> = ({ isOpen, onClose, onConfirm, selectedPageInfo, onClearPage }) => {
  const [url, setUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedPageInfo) {
      console.log('[URLInputModal] Page info received:', selectedPageInfo);
      toast.success('Page selected successfully');
      if (selectedPageInfo.page_url && url === '' ) {
        setUrl(selectedPageInfo.page_url);
      }
    }
  }, [selectedPageInfo]);

  const handleConfirm = () => {
    if (!url.trim()) {
      toast.warning('Please enter a URL');
      return;
    }
    if (!selectedPageInfo) {
      toast.warning('Please select a page first');
      return;
    }
    onConfirm(url.trim(), selectedPageInfo);
    setUrl('');
    onClose();
  };

  const handleClearPage = () => {
    onClearPage?.();
  };

  const handleCancel = () => {
    setUrl('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const hasSelectedPage = !!selectedPageInfo;
  const disabled = !url.trim() || !hasSelectedPage;

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="url-input-modal-overlay" onClick={handleCancel}>
      <div className="url-input-modal" onClick={(e) => e.stopPropagation()}>
        <div className="url-input-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Assert Page Has URL</h3>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="url-input-modal-body">
                    {/* Page Selection */}
                    <div style={{ marginTop: '16px', marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Page <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {selectedPageInfo ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedPageInfo.page_title || `Page ${selectedPageInfo.page_index + 1}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedPageInfo.page_url}
                  </div>
                </div>
                <button
                  onClick={handleClearPage}
                  style={{
                    marginLeft: '8px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: '#6b7280',
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fbbf24', fontSize: '13px', color: '#92400e' }}>
                Please click on a page in the browser to select it
              </div>
            )}
          </div>
          <label htmlFor="url-input" style={{ display: 'block', marginBottom: 8 }}>
            Enter URL to verify <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            ref={urlInputRef}
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="https://example.com"
          />
 
        </div>
        <div className="url-input-modal-footer">
          <button 
            className="url-input-modal-cancel" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="url-input-modal-confirm" 
            onClick={handleConfirm}
            disabled={disabled}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default URLInputModal;
