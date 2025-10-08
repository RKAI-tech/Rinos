import React, { useState } from 'react';
import './TitleInputModal.css';

interface TitleInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string) => void;
}

const TitleInputModal: React.FC<TitleInputModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [title, setTitle] = useState('');

  const handleConfirm = () => {
    if (title.trim()) {
      onConfirm(title.trim());
      setTitle('');
      onClose();
    }
  };

  const handleCancel = () => {
    setTitle('');
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
    <div className="title-input-modal-overlay">
      <div className="title-input-modal">
        <div className="title-input-modal-header">
          <h3>Assert Page Has Title</h3>
        </div>
        <div className="title-input-modal-body">
          <label htmlFor="title-input">Enter title to verify:</label>
          <input
            id="title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Page Title"
            autoFocus
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
            disabled={!title.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleInputModal;
