import React, { useEffect } from 'react';
import './deleteSuite.css';
import { GroupSuiteItem } from '../../types/group';

interface DeleteSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (suiteId: string) => void;
  suite: GroupSuiteItem | null;
  isDeleting?: boolean;
}

const DeleteSuite: React.FC<DeleteSuiteProps> = ({ isOpen, onClose, onDelete, suite, isDeleting = false }) => {
  if (!isOpen || !suite) return null;

  const handleDelete = () => {
    onDelete(suite.test_suite_id);
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

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ds-modal-header">
          <h2 className="ds-modal-title">Confirm Delete Suite</h2>
          <button className="ds-modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="ds-modal-content">
          <p className="ds-modal-message">
            Are you sure you want to delete suite{suite.name ? ` "${suite.name}"` : ''}? This action cannot be undone.
          </p>
        </div>

        <div className="ds-modal-actions">
          <button type="button" className="ds-btn-cancel" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="ds-btn-delete" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteSuite;

