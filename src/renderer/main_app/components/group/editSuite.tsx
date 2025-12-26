import React, { useEffect, useState, useRef } from 'react';
import './editSuite.css';
import { GroupSuiteItem } from '../../types/group';
import { BrowserType } from '../../types/testcases';

interface EditSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { test_suite_id: string; name: string; description: string; browser_type?: string }) => void;
  suite: GroupSuiteItem | null;
  isSaving?: boolean;
}

const EditSuite: React.FC<EditSuiteProps> = ({ isOpen, onClose, onSave, suite, isSaving = false }) => {
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [browserType, setBrowserType] = useState<string>('');
  const suiteNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (suite) {
      setSuiteName(suite.name || '');
      setSuiteDescription(suite.description || '');
      setBrowserType(suite.browser_type || '');
    }
  }, [suite]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suite) return;

    // Validation - nếu không có tên thì không làm gì (nút đã bị disable)
    if (!suiteName.trim()) {
      return;
    }

    onSave({
      test_suite_id: suite.test_suite_id,
      name: suiteName.trim(),
      description: suiteDescription.trim() || '',
      browser_type: browserType || undefined
    });
  };

  const handleClose = () => {
    if (!isSaving) {
      setSuiteName('');
      setSuiteDescription('');
      setBrowserType('');
      onClose();
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSaving) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSaving]);

  // Auto-focus on first input when modal opens
  useEffect(() => {
    if (isOpen && suite && suiteNameInputRef.current) {
      setTimeout(() => {
        suiteNameInputRef.current?.focus();
        // Select all text for easy editing
        suiteNameInputRef.current?.select();
      }, 100);
    }
  }, [isOpen, suite]);

  if (!isOpen || !suite) return null;

  return (
    <div className="esuite-edit-modal-overlay" onClick={handleClose}>
      <div className="esuite-edit-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="esuite-edit-modal-header">
          <h2 className="esuite-edit-modal-title">Edit Suite</h2>
          <button className="esuite-edit-modal-close-btn" onClick={handleClose} disabled={isSaving}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="esuite-edit-modal-instructions">Update the suite details below.</p>

        <form onSubmit={handleSubmit} className="esuite-edit-modal-form">
          <div className="esuite-edit-form-group">
            <label htmlFor="suiteName" className="esuite-edit-form-label">
              Suite Name <span className="esuite-edit-required-asterisk">*</span>
            </label>
            <input
              ref={suiteNameInputRef}
              type="text"
              id="suiteName"
              value={suiteName}
              onChange={(e) => setSuiteName(e.target.value)}
              placeholder="Enter suite name"
              className="esuite-edit-form-input"
              disabled={isSaving}
            />
          </div>

          <div className="esuite-edit-form-group">
            <label htmlFor="suiteDescription" className="esuite-edit-form-label">Description</label>
            <textarea
              id="suiteDescription"
              value={suiteDescription}
              onChange={(e) => setSuiteDescription(e.target.value)}
              placeholder="Enter suite description"
              className="esuite-edit-form-textarea"
              rows={4}
              disabled={isSaving}
            />
          </div>

          <div className="esuite-edit-form-group">
            <label htmlFor="browserType" className="esuite-edit-form-label">Browser Type</label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="esuite-edit-form-input"
              disabled={isSaving}
            >
              <option value="">Select browser type (optional)</option>
              <option value={BrowserType.chrome}>Chrome</option>
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
          </div>

          <div className="esuite-edit-modal-actions">
            <button type="button" className="esuite-edit-btn-cancel" onClick={handleClose} disabled={isSaving}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="esuite-edit-btn-save"
              disabled={!suiteName.trim() || isSaving}
            >
              {isSaving ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSuite;

