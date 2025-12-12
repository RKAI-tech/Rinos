import React, { useEffect } from 'react';
import './DeleteQuery.css';

interface QueryRef { id: string; name?: string }

interface DeleteQueryProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (statementId: string) => void;
  query: QueryRef | null;
}

const DeleteQuery: React.FC<DeleteQueryProps> = ({ isOpen, onClose, onDelete, query }) => {
  if (!isOpen || !query) return null;

  const handleDelete = () => {
    onDelete(query.id);
    onClose();
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
    <div className="dq-modal-overlay">
      <div className="dq-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="dq-modal-header">
          <h2 className="dq-modal-title">Confirm Delete Query</h2>
          <button className="dq-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="dq-modal-content">
          <p className="dq-modal-message">
            Are you sure you want to delete this query{query.name ? ` "${query.name}"` : ''}? This action cannot be undone.
          </p>
        </div>

        <div className="dq-modal-actions">
          <button type="button" className="dq-btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="dq-btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteQuery;


