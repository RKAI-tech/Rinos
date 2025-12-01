import React, { useEffect, useState, useRef } from 'react';
import './EditTestSuite.css';
import { BrowserType } from '../../../types/testcases';

interface MinimalTestSuite {
  testsuite_id: string;
  name: string;
  description?: string;
  browser_type?: string;
}

interface EditTestSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id: string; name: string; description?: string; browser_type?: string }) => void;
  testsuite: MinimalTestSuite | null;
}

const EditTestSuite: React.FC<EditTestSuiteProps> = ({ isOpen, onClose, onSave, testsuite }) => {
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [browserType, setBrowserType] = useState<string>('');
  const suiteNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (testsuite) {
      setSuiteName(testsuite.name || '');
      setSuiteDescription(testsuite.description || '');
      setBrowserType(testsuite.browser_type || '');
    }
  }, [testsuite]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testsuite) return;

    // Validation - nếu không có tên thì không làm gì (nút đã bị disable)
    if (!suiteName.trim()) {
      return;
    }

    onSave({ id: testsuite.testsuite_id, name: suiteName.trim(), description: suiteDescription.trim() || '', browser_type: browserType || undefined });
    handleClose();
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
    if (isOpen && testsuite && suiteNameInputRef.current) {
      setTimeout(() => {
        suiteNameInputRef.current?.focus();
        // Select all text for easy editing
        suiteNameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, testsuite]);

  if (!isOpen || !testsuite) return null;

  return (
    <div className="tsuite-edit-modal-overlay" onClick={handleClose}>
      <div className="tsuite-edit-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tsuite-edit-modal-header">
          <h2 className="tsuite-edit-modal-title">Edit Test Suite</h2>
          <button className="tsuite-edit-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="tsuite-edit-modal-instructions">Update the test suite details below.</p>

        <form onSubmit={handleSubmit} className="tsuite-edit-modal-form">
          <div className="tsuite-edit-form-group">
            <label htmlFor="suiteName" className="tsuite-edit-form-label">
              Test Suite Name <span className="tsuite-edit-required-asterisk">*</span>
            </label>
            <input
              ref={suiteNameInputRef}
              type="text"
              id="suiteName"
              value={suiteName}
              onChange={(e) => setSuiteName(e.target.value)}
              placeholder="Enter test suite name"
              className="tsuite-edit-form-input"
            />
          </div>

          <div className="tsuite-edit-form-group">
            <label htmlFor="suiteDescription" className="tsuite-edit-form-label">Description</label>
            <textarea
              id="suiteDescription"
              value={suiteDescription}
              onChange={(e) => setSuiteDescription(e.target.value)}
              placeholder="Enter test suite description"
              className="tsuite-edit-form-textarea"
              rows={4}
            />
          </div>

          <div className="tsuite-edit-form-group">
            <label htmlFor="browserType" className="tsuite-edit-form-label">Browser Type</label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="tsuite-edit-form-input"
            >
              <option value="">Select browser type (optional)</option>
              <option value={BrowserType.chrome}>Chrome</option>
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
          </div>

          <div className="tsuite-edit-modal-actions">
            <button type="button" className="tsuite-edit-btn-cancel" onClick={handleClose}>Cancel</button>
            <button 
              type="submit" 
              className="tsuite-edit-btn-save"
              disabled={!suiteName.trim()}
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTestSuite;


