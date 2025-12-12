import React from 'react';
import './DeleteAllActions.css';

interface DeleteAllActionsProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  testcaseId?: string | null;
}

const DeleteAllActions: React.FC<DeleteAllActionsProps> = ({ isOpen, onClose, onDelete, testcaseId }) => {
  const handleDelete = () => {
    onDelete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="rcd-delete-modal-overlay">
      <div className="rcd-delete-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rcd-delete-modal-header">
          <h2 className="rcd-delete-modal-title">Confirm Deletion</h2>
          <button className="rcd-delete-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="rcd-delete-modal-content">
          <p className="rcd-delete-modal-message">
            Are you sure you want to delete all actions{testcaseId ? ` for this testcase` : ''}? This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="rcd-delete-modal-actions">
          <button type="button" className="rcd-delete-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="rcd-delete-btn-delete" onClick={handleDelete}>
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteAllActions;
