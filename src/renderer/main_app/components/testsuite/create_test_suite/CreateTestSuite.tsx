import React, { useState, useEffect, useRef } from 'react';
import './CreateTestSuite.css';
import { BrowserType } from '../../../types/testcases';

interface CreateTestSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { projectId: string; name: string; description: string; browser_type?: string }) => void;
  projectId?: string;
}

const CreateTestSuite: React.FC<CreateTestSuiteProps> = ({ isOpen, onClose, onSave, projectId = '' }) => {
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [browserType, setBrowserType] = useState<string>('');
  const suiteNameInputRef = useRef<HTMLInputElement>(null);

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
      browser_type: browserType || undefined,
    });

    setSuiteName('');
    setSuiteDescription('');
    setBrowserType('');
    onClose();
  };

  const handleClose = () => {
    setSuiteName('');
    setSuiteDescription('');
    setBrowserType('');
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

  // Auto-focus on first input when modal opens
  useEffect(() => {
    if (isOpen && suiteNameInputRef.current) {
      setTimeout(() => {
        suiteNameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="tsuite-modal-overlay">
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
              ref={suiteNameInputRef}
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

          <div className="tsuite-form-group">
            <label htmlFor="browserType" className="tsuite-form-label">
              Browser Type
            </label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="tsuite-form-input"
            >
              <option value="">Select browser type (optional)</option>
              <option value={BrowserType.chrome}>Chrome</option>
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
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


