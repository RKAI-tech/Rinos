import React from 'react';
import './BrowserVariableModals.css';

interface CreateBrowserVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  name: string;
  value: string;
  setName: (value: string) => void;
  setValue: (value: string) => void;
}

const CreateBrowserVariableModal: React.FC<CreateBrowserVariableModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving,
  name,
  value,
  setName,
  setValue,
}) => {
  if (!isOpen) return null;

  const isCreateDisabled = isSaving || !name.trim() || !value.trim();

  return (
    <div className="browser-vars-modal-overlay">
      <div className="browser-vars-modal" onClick={(e) => e.stopPropagation()}>
        <div className="browser-vars-modal-header">
          Create Browser Variable
          <button className="browser-vars-modal-close-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="browser-vars-modal-body">
          <label className="browser-vars-modal-label">
            Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            className="browser-vars-modal-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Browser variable name"
          />

          <label className="browser-vars-modal-label">
            Value <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea
            className="browser-vars-modal-textarea"
            rows={6}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter value"
          ></textarea>
        </div>
        <div className="browser-vars-modal-footer">
          <button className="browser-vars-modal-btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            className="browser-vars-modal-btn-primary"
            onClick={onSave}
            disabled={isCreateDisabled}
          >
            {isSaving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBrowserVariableModal;
