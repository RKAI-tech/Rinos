import React, { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

export type BrowserActionType = 'back' | 'forward' | 'reload';

interface BrowserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (pageInfo: SelectedPageInfo) => void;
  actionType: BrowserActionType;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
}

const getActionLabel = (actionType: BrowserActionType): string => {
  switch (actionType) {
    case 'back':
      return 'Go Back';
    case 'forward':
      return 'Go Forward';
    case 'reload':
      return 'Reload';
    default:
      return 'Browser Action';
  }
};

const getActionDescription = (actionType: BrowserActionType): string => {
  switch (actionType) {
    case 'back':
      return 'Navigate to the previous page in browser history';
    case 'forward':
      return 'Navigate to the next page in browser history';
    case 'reload':
      return 'Reload the current page';
    default:
      return '';
  }
};

const BrowserActionModal: React.FC<BrowserActionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  actionType,
  selectedPageInfo,
  onClearPage
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPageInfo) {
      console.log(`[BrowserActionModal] Page info received for ${actionType}:`, selectedPageInfo);
      toast.success('Page selected successfully');
    }
  }, [selectedPageInfo, actionType]);

  if (!isOpen) return null;

  const hasSelectedPage = !!selectedPageInfo;
  const disabled = !hasSelectedPage;

  const submit = () => {
    if (!hasSelectedPage) {
      toast.warning('Please select a page first');
      return;
    }
    onConfirm(selectedPageInfo!);
    onClose();
  };

  const handleClearPage = () => {
    onClearPage?.();
  };

  return (
    <div
      style={{ 
        position: 'fixed', 
        inset: 0, 
        background: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 1000 
      }}
    >
      <div
        ref={modalRef}
        style={{ 
          background: '#fff', 
          borderRadius: 12, 
          width: 380, 
          maxWidth: '90vw', 
          minWidth: 320,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>
            {getActionLabel(actionType)}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', boxSizing: 'border-box' }}>
          <div>
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

export default BrowserActionModal;

