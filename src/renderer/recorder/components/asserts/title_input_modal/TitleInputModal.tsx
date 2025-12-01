import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import './TitleInputModal.css';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

interface TitleInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, pageInfo?: SelectedPageInfo) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
}

const TitleInputModal: React.FC<TitleInputModalProps> = ({ isOpen, onClose, onConfirm, selectedPageInfo, onClearPage }) => {
  const [title, setTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = () => {
    if (!title.trim()) {
      toast.warning('Please enter a title');
      return;
    }
    if (!selectedPageInfo) {
      toast.warning('Please select a page first');
      return;
    }
    onConfirm(title.trim(), selectedPageInfo);
    setTitle('');
    onClose();
  };

  const handleCancel = () => {
    setTitle('');
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

  const handleClearPage = () => {
    onClearPage?.();
  };

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPageInfo) {
      toast.success('Page selected successfully');
      if (selectedPageInfo.page_title && title === '' ) {
        setTitle(selectedPageInfo.page_title);
      }
    }
  }, [selectedPageInfo]);

  const hasSelectedPage = !!selectedPageInfo;
  const disabled = !title.trim() || !hasSelectedPage;

  if (!isOpen) return null;

  return (
    <div className="title-input-modal-overlay" onClick={handleCancel}>
      <div className="title-input-modal" onClick={(e) => e.stopPropagation()}>
        <div className="title-input-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Assert Page Has Title</h3>
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
        <div className="title-input-modal-body">
          <div style={{ marginBottom: '24px' }}>
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
          <label htmlFor="title-input" style={{ display: 'block', marginBottom: 8 }}>
            Enter title to verify <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            ref={titleInputRef}
            id="title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Page Title"
          />
        </div>
        <div className="title-input-modal-footer">
          <button 
            className="title-input-modal-cancel" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="title-input-modal-confirm" 
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

export default TitleInputModal;
