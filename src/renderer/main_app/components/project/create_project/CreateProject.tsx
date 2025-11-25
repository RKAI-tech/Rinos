import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CreateProject.css';
import { BrowserType } from '../../../types/projects';

interface CreateProjectProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: { name: string; description: string; browser_type?: string }) => void;
}

const CreateProject: React.FC<CreateProjectProps> = ({ isOpen, onClose, onSave }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [browserType, setBrowserType] = useState<string>('');
  const projectNameInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation - nếu không có tên thì không làm gì (nút đã bị disable)
    if (!projectName.trim()) {
      return;
    }

    // Save project
    onSave({
      name: projectName.trim(),
      description: projectDescription.trim(),
      browser_type: browserType || undefined
    });

    // Reset form
    setProjectName('');
    setProjectDescription('');
    setBrowserType('');
    onClose();
  }, [projectName, projectDescription, onSave, onClose]);

  const handleClose = useCallback(() => {
    setProjectName('');
    setProjectDescription('');
    setBrowserType('');
    onClose();
  }, [onClose]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Auto-focus on first input when modal opens
  useEffect(() => {
    if (isOpen && projectNameInputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        projectNameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Create New Project</h2>
          <button className="modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="modal-instructions">
          Fill in the details below to create a new project.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          {/* Project Name */}
          <div className="form-group">
            <label htmlFor="projectName" className="form-label">
              Project Name <span className="required-asterisk">*</span>
            </label>
            <input
              ref={projectNameInputRef}
              type="text"
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              className="form-input"
            />
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

          {/* Browser Type */}
          <div className="form-group">
            <label htmlFor="browserType" className="form-label">
              Browser Type
            </label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="form-input"
            >
              <option value="">Select browser type (optional)</option>
              <option value={BrowserType.chrome}>Chrome</option>  
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={!projectName.trim()}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
