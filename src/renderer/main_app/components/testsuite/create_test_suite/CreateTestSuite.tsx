import React, { useState, useEffect } from 'react';
import './CreateTestSuite.css';

interface CreateTestSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { projectId: string; name: string; description: string }) => void;
  projectId?: string;
}

const CreateTestSuite: React.FC<CreateTestSuiteProps> = ({ isOpen, onClose, onSave, projectId = '' }) => {
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - nếu không có tên thì không làm gì (nút đã bị disable)
    if (!suiteName.trim()) {
      return;
    }

    onSave({
      projectId,
      name: suiteName.trim(),
      description: suiteDescription.trim(),
    });

    setSuiteName('');
    setSuiteDescription('');
    onClose();
  };

  const handleClose = () => {
    setSuiteName('');
    setSuiteDescription('');
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
    <div className="tsuite-modal-overlay" onClick={handleClose}>
      <div className="tsuite-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tsuite-modal-header">
          <h2 className="tsuite-modal-title">Create New Test Suite</h2>
          <button className="tsuite-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="tsuite-modal-instructions">
          Fill in the details below to create a new test suite.
        </p>

        <form onSubmit={handleSubmit} className="tsuite-modal-form">
          <div className="tsuite-form-group">
            <label htmlFor="suiteName" className="tsuite-form-label">
              Test Suite Name <span className="tsuite-required-asterisk">*</span>
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Enter a descriptive name for your test suite. This will help identify the test suite in the list.
                </div>
              </div>
            </label>
            <input
              type="text"
              id="suiteName"
              value={suiteName}
              onChange={(e) => setSuiteName(e.target.value)}
              placeholder="Enter test suite name"
              className="tsuite-form-input"
            />
          </div>

          <div className="tsuite-form-group">
            <label htmlFor="suiteDescription" className="tsuite-form-label">
              Description
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Optional description to provide more details about this test suite (e.g., purpose, scope, or notes). This helps organize and document your test suites.
                </div>
              </div>
            </label>
            <textarea
              id="suiteDescription"
              value={suiteDescription}
              onChange={(e) => setSuiteDescription(e.target.value)}
              placeholder="Enter test suite description"
              className="tsuite-form-textarea"
              rows={4}
            />
          </div>

          <div className="tsuite-modal-actions">
            <button type="button" className="tsuite-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="tsuite-btn-save"
              disabled={!suiteName.trim()}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTestSuite;


