import React, { useEffect, useState } from 'react';
import './EditTestcase.css';

interface MinimalTestcase {
  testcase_id: string;
  name: string;
  tag: string;
}

interface EditTestcaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id: string; name: string; tag: string }) => void;
  testcase: MinimalTestcase | null;
}

const EditTestcase: React.FC<EditTestcaseProps> = ({ isOpen, onClose, onSave, testcase }) => {
  const [testcaseName, setTestcaseName] = useState('');
  const [testcaseTag, setTestcaseTag] = useState('');
  const [errors, setErrors] = useState<{ name?: string; tag?: string }>({});

  useEffect(() => {
    if (testcase) {
      setTestcaseName(testcase.name || '');
      setTestcaseTag(testcase.tag || '');
      setErrors({});
    }
  }, [testcase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testcase) return;

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
      id: testcase.testcase_id,
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

  if (!isOpen || !testcase) return null;

  return (
    <div className="tcase-edit-modal-overlay" onClick={handleClose}>
      <div className="tcase-edit-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tcase-edit-modal-header">
          <h2 className="tcase-edit-modal-title">Edit Testcase</h2>
          <button className="tcase-edit-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="tcase-edit-modal-instructions">Update the testcase details below.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="tcase-edit-modal-form">
          <div className="tcase-edit-form-group">
            <label htmlFor="testcaseName" className="tcase-edit-form-label">
              Testcase Name <span className="tcase-edit-required-asterisk">*</span>
            </label>
            <input
              type="text"
              id="testcaseName"
              value={testcaseName}
              onChange={(e) => setTestcaseName(e.target.value)}
              placeholder="Enter testcase name"
              className={`tcase-edit-form-input ${errors.name ? 'tcase-edit-error' : ''}`}
            />
            {errors.name && <span className="tcase-edit-error-message">{errors.name}</span>}
          </div>

          <div className="tcase-edit-form-group">
            <label htmlFor="testcaseTag" className="tcase-edit-form-label">
              Tag
            </label>
            <input
              type="text"
              id="testcaseTag"
              value={testcaseTag}
              onChange={(e) => setTestcaseTag(e.target.value)}
              placeholder="Enter tag (e.g., smoke, regression)"
              className={`tcase-edit-form-input ${errors.tag ? 'tcase-edit-error' : ''}`}
            />
            {errors.tag && <span className="tcase-edit-error-message">{errors.tag}</span>}
          </div>

          

          <div className="tcase-edit-modal-actions">
            <button type="button" className="tcase-edit-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="tcase-edit-btn-save">
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTestcase;


