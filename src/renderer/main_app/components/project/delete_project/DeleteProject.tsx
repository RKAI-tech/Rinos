import React from 'react';
import { Project } from '../../../types/projects';
import './DeleteProject.css';

interface DeleteProjectProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: (projectId: string) => void;
  project: Project | null;
}

const DeleteProject: React.FC<DeleteProjectProps> = ({ isOpen, onClose, onDelete, project }) => {
  const handleDelete = () => {
    if (project) {
      onDelete(project.project_id);
      onClose();
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="delete-modal-overlay" onClick={onClose}>
      <div className="delete-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="delete-modal-header">
          <h2 className="delete-modal-title">Confirm Deletion</h2>
          <button className="delete-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Message */}
        <div className="delete-modal-content">
          <p className="delete-modal-message">
            Are you sure you want to delete this project? This action cannot be undone.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="delete-modal-actions">
          <button type="button" className="delete-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="delete-btn-delete" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteProject;
