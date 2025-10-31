import React, { useEffect } from 'react';
import './DeleteVariable.css';

interface VariableRef { id: string; name?: string }

interface DeleteVariableProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (variableId: string) => void;
  variable: VariableRef | null;
}

const DeleteVariable: React.FC<DeleteVariableProps> = ({ isOpen, onClose, onDelete, variable }) => {
  if (!isOpen || !variable) return null;

  const handleDelete = () => {
    onDelete(variable.id);
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
    <div className="dv-modal-overlay" onClick={onClose}>
      <div className="dv-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="dv-modal-header">
          <h2 className="dv-modal-title">Confirm Delete Variable</h2>
          <button className="dv-modal-close-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="dv-modal-content">
          <p className="dv-modal-message">
            Are you sure you want to delete this variable{variable.name ? ` "${variable.name}"` : ''}? This action cannot be undone.
          </p>
        </div>
        <div className="dv-modal-actions">
          <button type="button" className="dv-btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="dv-btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteVariable;


