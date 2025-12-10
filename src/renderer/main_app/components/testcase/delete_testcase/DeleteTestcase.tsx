import React, { useEffect } from 'react';
import './DeleteTestcase.css';

interface MinimalTestcase {
  testcase_id: string;
  name?: string;
}

interface DeleteTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (testcaseId: string) => void;
  testcase: MinimalTestcase | null;
}

const DeleteTestcase: React.FC<DeleteTestcaseProps> = ({ isOpen, onClose, onDelete, testcase }) => {
  const handleDelete = () => {
    if (testcase) {
      onDelete(testcase.testcase_id);
      onClose();
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !testcase) return null;

  return (
    <div className="tcase-delete-modal-overlay">
      <div className="tcase-delete-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tcase-delete-modal-header">
          <h2 className="tcase-delete-modal-title">Confirm Deletion</h2>
          <button className="tcase-delete-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="tcase-delete-modal-content">
          <p className="tcase-delete-modal-message">
            Are you sure you want to delete this testcase{testcase.name ? ` "${testcase.name}"` : ''}? This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="tcase-delete-modal-actions">
          <button type="button" className="tcase-delete-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="tcase-delete-btn-delete" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTestcase;


