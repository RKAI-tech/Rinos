import React, { useEffect } from 'react';
import './DeleteConnection.css';

interface ConnectionRef {
  connection_id: string;
  name?: string;
}

interface DeleteConnectionProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (connectionId: string) => void;
  connection: ConnectionRef | null;
}

const DeleteConnection: React.FC<DeleteConnectionProps> = ({ isOpen, onClose, onDelete, connection }) => {
  const handleDelete = () => {
    if (connection) {
      onDelete(connection.connection_id);
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

  if (!isOpen || !connection) return null;

  return (
    <div className="dc-modal-overlay">
      <div className="dc-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="dc-modal-header">
          <h2 className="dc-modal-title">Confirm Delete Connection</h2>
          <button className="dc-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="dc-modal-content">
          <p className="dc-modal-message">
            Are you sure you want to delete this connection{connection.name ? ` "${connection.name}"` : ''}? This action cannot be undone.
          </p>
        </div>

        <div className="dc-modal-actions">
          <button type="button" className="dc-btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="dc-btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConnection;


