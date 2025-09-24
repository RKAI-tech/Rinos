import React, { useState, useEffect } from 'react';
import { Project } from '../../../types/projects';
import './EditProject.css';

interface EditProjectProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: { id: string; name: string; description: string }) => void;
  project: Project | null;
}

const EditProject: React.FC<EditProjectProps> = ({ isOpen, onClose, onSave, project }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string }>({});

  // Populate form when project data is available
  useEffect(() => {
    if (project) {
      setProjectName(project.name);
      setProjectDescription(project.description);
      setErrors({});
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!project) return;
    
    // Validation
    const newErrors: { name?: string } = {};
    if (!projectName.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Save project
    onSave({
      id: project.project_id,
      name: projectName.trim(),
      description: projectDescription.trim()
    });

    // Reset form
    setProjectName('');
    setProjectDescription('');
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setProjectName('');
    setProjectDescription('');
    setErrors({});
    onClose();
  };

  if (!isOpen || !project) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Edit Project</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="modal-instructions">
          Update the project details below.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Project Name */}
          <div className="form-group">
            <label htmlFor="projectName" className="form-label">
              Project Name <span className="required-asterisk">*</span>
            </label>
            <input
              type="text"
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className={`form-input ${errors.name ? 'error' : ''}`}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>

          {/* Project Description */}
          <div className="form-group">
            <label htmlFor="projectDescription" className="form-label">
              Project Description
            </label>
            <textarea
              id="projectDescription"
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Enter project description"
              className="form-textarea"
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProject;
