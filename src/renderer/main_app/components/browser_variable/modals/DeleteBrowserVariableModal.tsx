import React from 'react';
import './BrowserVariableModals.css';

interface DeleteBrowserVariableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  variableName?: string;
}

const DeleteBrowserVariableModal: React.FC<DeleteBrowserVariableModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  variableName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="browser-vars-modal-overlay">
      <div className="browser-vars-modal" onClick={(e) => e.stopPropagation()}>
        <div className="browser-vars-modal-header">
          Delete Browser Variable
          <button className="browser-vars-modal-close-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="browser-vars-modal-body">
          <div className="browser-vars-modal-warning">
            Are you sure you want to delete{variableName ? ` "${variableName}"` : ''}? This action cannot be undone.
          </div>
        </div>
        <div className="browser-vars-modal-footer">
          <button className="browser-vars-modal-btn-secondary" onClick={onClose} disabled={isDeleting}>Cancel</button>
          <button className="browser-vars-modal-btn-danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteBrowserVariableModal;
