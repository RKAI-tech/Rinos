import React from 'react';
import './DeleteTestSuite.css';

interface MinimalTestSuite {
  testsuite_id: string;
  name?: string;
}

interface DeleteTestSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (testsuiteId: string) => void;
  testsuite: MinimalTestSuite | null;
}

const DeleteTestSuite: React.FC<DeleteTestSuiteProps> = ({ isOpen, onClose, onDelete, testsuite }) => {
  const handleDelete = () => {
    if (testsuite) {
      onDelete(testsuite.testsuite_id);
      onClose();
    }
  };

  if (!isOpen || !testsuite) return null;

  return (
    <div className="tsuite-delete-modal-overlay" onClick={onClose}>
      <div className="tsuite-delete-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tsuite-delete-modal-header">
          <h2 className="tsuite-delete-modal-title">Confirm Deletion</h2>
          <button className="tsuite-delete-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="tsuite-delete-modal-content">
          <p className="tsuite-delete-modal-message">
            Are you sure you want to delete this test suite{testsuite.name ? ` "${testsuite.name}"` : ''}? This action cannot be undone.
          </p>
        </div>

        <div className="tsuite-delete-modal-actions">
          <button type="button" className="tsuite-delete-btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="tsuite-delete-btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTestSuite;


