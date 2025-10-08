import React, { useState } from 'react';
import './URLInputModal.css';

interface URLInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}

const URLInputModal: React.FC<URLInputModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [url, setUrl] = useState('');

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
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="https://example.com"
            autoFocus
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
