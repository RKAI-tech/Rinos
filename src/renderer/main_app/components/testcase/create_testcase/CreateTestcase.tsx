import React, { useState, useEffect } from 'react';
import './CreateTestcase.css';

interface CreateTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testcaseData: { projectId: string; name: string; tag: string }) => void;
  projectId?: string;
}

const CreateTestcase: React.FC<CreateTestcaseProps> = ({ isOpen, onClose, onSave, projectId = '' }) => {
  const [testcaseName, setTestcaseName] = useState('');
  
  const [testcaseTag, setTestcaseTag] = useState('');
  const [errors, setErrors] = useState<{ name?: string; tag?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; tag?: string } = {};
    if (!testcaseName.trim()) {
      newErrors.name = 'Testcase name is required';
    }
    // Tag is optional; no validation needed

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      projectId,
      name: testcaseName.trim(),
      tag: testcaseTag.trim()
    });

    setTestcaseName('');
    setTestcaseTag('');
    setErrors({});
    onClose();
  };

  const handleClose = () => {
    setTestcaseName('');
    setTestcaseTag('');
    setErrors({});
    onClose();
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="testcase-modal-overlay" onClick={handleClose}>
      <div className="testcase-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="testcase-modal-header">
          <h2 className="testcase-modal-title">Create New Testcase</h2>
          <button className="testcase-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="testcase-modal-instructions">
          Fill in the details below to create a new testcase.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="testcase-modal-form">
          {/* Testcase Name */}
          <div className="testcase-form-group">
            <label htmlFor="testcaseName" className="testcase-form-label">
              Testcase Name <span className="testcase-required-asterisk">*</span>
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Enter a descriptive name for your testcase. This will help identify the testcase in the list.
                </div>
              </div>
            </label>
            <input
              type="text"
              id="testcaseName"
              value={testcaseName}
              onChange={(e) => setTestcaseName(e.target.value)}
              placeholder="Enter testcase name"
              className={`testcase-form-input ${errors.name ? 'testcase-error' : ''}`}
            />
            {errors.name && <span className="testcase-error-message">{errors.name}</span>}
          </div>

          {/* Testcase Tag */}
          <div className="testcase-form-group">
            <label htmlFor="testcaseTag" className="testcase-form-label">
              Tag
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Optional tag to categorize your testcase (e.g., smoke, regression, critical). This helps organize and filter testcases.
                </div>
              </div>
            </label>
            <input
              type="text"
              id="testcaseTag"
              value={testcaseTag}
              onChange={(e) => setTestcaseTag(e.target.value)}
              placeholder="Enter tag (e.g., smoke, regression)"
              className={`testcase-form-input ${errors.tag ? 'testcase-error' : ''}`}
            />
            {errors.tag && <span className="testcase-error-message">{errors.tag}</span>}
          </div>

        

          {/* Action Buttons */}
          <div className="testcase-modal-actions">
            <button type="button" className="testcase-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="testcase-btn-save">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTestcase;


