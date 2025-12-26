import React, { useState, useEffect, useRef } from 'react';
import './CreateTestcaseInSuite.css';
import { BrowserType } from '../../../types/testcases';

interface CreateTestcaseInSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testcaseData: { projectId: string; name: string; tag: string; browser_type?: string; level: number }) => void;
  projectId?: string;
  defaultLevel?: number;
}

const CreateTestcaseInSuite: React.FC<CreateTestcaseInSuiteProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  projectId = '',
  defaultLevel = 1
}) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [browserType, setBrowserType] = useState<string>(BrowserType.chrome);
  const [level, setLevel] = useState<number>(defaultLevel);
  const testcaseNameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens/closes or defaultLevel changes
  useEffect(() => {
    if (isOpen) {
      setLevel(defaultLevel);
    } else {
      setTestcaseName('');
      setTestcaseTag('');
      setBrowserType(BrowserType.chrome);
      setLevel(1);
    }
  }, [isOpen, defaultLevel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - nếu không có tên thì không làm gì (nút đã bị disable)
    if (!testcaseName.trim()) {
      return;
    }

    // Validate level - must be a positive integer
    const levelNum = Number(level);
    if (isNaN(levelNum) || levelNum < 1 || !Number.isInteger(levelNum)) {
      return;
    }

    onSave({
      projectId,
      name: testcaseName.trim(),
      tag: testcaseTag.trim(),
      browser_type: browserType || BrowserType.chrome,
      level: levelNum
    });

    setTestcaseName('');
    setTestcaseTag('');
    setBrowserType(BrowserType.chrome);
    setLevel(1);
    onClose();
  };

  const handleClose = () => {
    setTestcaseName('');
    setTestcaseTag('');
    setBrowserType(BrowserType.chrome);
    setLevel(1);
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
    if (isOpen && testcaseNameInputRef.current) {
      setTimeout(() => {
        testcaseNameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const levelNum = Number(level);
  const isLevelValid = !isNaN(levelNum) && levelNum >= 1 && Number.isInteger(levelNum);

  return (
    <div className="testcase-modal-overlay">
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
          Fill in the details below to create a new testcase and add it to the suite.
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
              ref={testcaseNameInputRef}
              type="text"
              id="testcaseName"
              value={testcaseName}
              onChange={(e) => setTestcaseName(e.target.value)}
              placeholder="Enter testcase name"
              className="testcase-form-input"
            />
          </div>

          {/* Testcase Tag */}
          <div className="testcase-form-group">
            <label htmlFor="testcaseTag" className="testcase-form-label">
              Description
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Optional description to categorize your testcase (e.g., smoke, regression, critical). This helps organize and filter testcases.
                </div>
              </div>
            </label>
            <input
              type="text"
              id="testcaseTag"
              value={testcaseTag}
              onChange={(e) => setTestcaseTag(e.target.value)}
              placeholder="Enter tag (e.g., smoke, regression)"
              className="testcase-form-input"
            />
          </div>

          {/* Browser Type */}
          <div className="testcase-form-group">
            <label htmlFor="browserType" className="testcase-form-label">
              Browser Type <span className="testcase-required-asterisk">*</span>
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Select the browser type for this testcase (e.g., chromium, firefox, webkit).
                </div>
              </div>
            </label>
            <select
              id="browserType"
              value={browserType}
              onChange={(e) => setBrowserType(e.target.value)}
              className="testcase-form-input"
              required
            >
              <option value={BrowserType.chrome}>Chrome</option>  
              <option value={BrowserType.edge}>Edge</option>
              <option value={BrowserType.firefox}>Firefox</option>
              <option value={BrowserType.safari}>Safari</option>
            </select>
          </div>

          {/* Level */}
          <div className="testcase-form-group">
            <label htmlFor="level" className="testcase-form-label">
              Level <span className="testcase-required-asterisk">*</span>
              <div className="tooltip-container">
                <span className="tooltip-icon">?</span>
                <div className="tooltip-content">
                  Enter the level for this testcase in the suite. Level must be a positive integer (1, 2, 3, ...).
                </div>
              </div>
            </label>
            <input
              type="number"
              id="level"
              value={level}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (!isNaN(Number(value)) && Number(value) >= 1)) {
                  setLevel(value === '' ? 1 : Number(value));
                }
              }}
              placeholder="Enter level (e.g., 1, 2, 3)"
              className="testcase-form-input"
              min="1"
              step="1"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="testcase-modal-actions">
            <button type="button" className="testcase-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="testcase-btn-save"
              disabled={!testcaseName.trim() || !browserType || !isLevelValid}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTestcaseInSuite;

