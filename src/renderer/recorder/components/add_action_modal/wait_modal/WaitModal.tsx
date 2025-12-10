import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';

interface WaitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (milliseconds: number) => void;
}

const WaitModal: React.FC<WaitModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm
}) => {
  const [ms, setMs] = useState<string>('1000');
  const msInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMs('1000');
    }
  }, [isOpen]);

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && msInputRef.current) {
      setTimeout(() => {
        msInputRef.current?.focus();
        msInputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const msTrimmed = (ms ?? '').toString().trim();
  const isIntegerString = /^\d+$/.test(msTrimmed);
  const parsed = isIntegerString ? parseInt(msTrimmed, 10) : NaN;
  const hasValidMs = isIntegerString;
  // Disable confirm nếu chưa nhập thời gian
  const disabled = !hasValidMs;

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasValidMs) {
        toast.warning('Please enter a valid non-negative integer milliseconds');
        return;
      }
      onConfirm(parsed);
      onClose();
    }
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: 380,
          maxWidth: '90vw',
          minWidth: 320,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Wait</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', boxSizing: 'border-box' }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Milliseconds</label>
            <input
              ref={msInputRef}
              type="text"
              value={ms}
              onChange={(e) => setMs(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 1000"
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
            onClick={() => {
              if (!hasValidMs) {
                toast.warning('Please enter a valid non-negative integer milliseconds');
                return;
              }
              onConfirm(parsed);
              onClose();
            }}
            disabled={disabled}
            style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default WaitModal;


