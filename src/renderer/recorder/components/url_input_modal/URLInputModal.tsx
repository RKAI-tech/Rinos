import React, { useState, useEffect, useRef } from 'react';
import './URLInputModal.css';

interface URLInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}

const URLInputModal: React.FC<URLInputModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [url, setUrl] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleConfirm = () => {
    if (url.trim()) {
      onConfirm(url.trim());
      setUrl('');
      onClose();
    }
  };

  const handleCancel = () => {
    setUrl('');
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

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
    <div className="url-input-modal-overlay">
      <div className="url-input-modal">
        <div className="url-input-modal-header">
          <h3>Assert Page Has URL</h3>
        </div>
        <div className="url-input-modal-body">
          <label htmlFor="url-input">Enter URL to verify:</label>
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
            disabled={!url.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default URLInputModal;
