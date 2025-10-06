import React from 'react';
import './ConfirmCloseModal.css';

interface ConfirmCloseModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSaveAndClose: () => void;
  hasUnsavedActions: boolean;
}

const ConfirmCloseModal: React.FC<ConfirmCloseModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  onSaveAndClose,
  hasUnsavedActions
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-close-overlay">
      <div className="confirm-close-modal">
        <div className="confirm-close-header">
          <h3>Confirm Close Window</h3>
        </div>
        <div className="confirm-close-content">
          <p>Are you sure you want to close the recorder window?</p>
          {hasUnsavedActions && (
            <p className="confirm-close-warning">
              All unsaved data will be lost.
            </p>
          )}
        </div>
        <div className="confirm-close-actions">
          <button
            className="confirm-close-btn confirm-close-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          {hasUnsavedActions && (
            <button
              className="confirm-close-btn confirm-close-save"
              onClick={onSaveAndClose}
            >
              Save & Close
            </button>
          )}
          <button
            className="confirm-close-btn confirm-close-confirm"
            onClick={onConfirm}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCloseModal;
