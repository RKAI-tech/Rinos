import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project } from '../../../types/projects';
import { generateKey, exportKeyToPEM, importKeyFromPEM, downloadPEMFile, validateKeyFormat, EncryptionError } from '../../../services/encryption';
import { toast } from 'react-toastify';
import './KeyManagementModal.css';

// Tooltip component
const Tooltip = ({ text }: { text: string }) => (
  <div className="tooltip-container">
    <span className="tooltip-icon">?</span>
    <div className="tooltip-content">{text}</div>
  </div>
);

interface KeyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

const KeyManagementModal: React.FC<KeyManagementModalProps> = ({ isOpen, onClose, project }) => {
  const [key, setKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNewKeyOptions, setShowNewKeyOptions] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [manualKeyInput, setManualKeyInput] = useState('');
  const [manualKeyError, setManualKeyError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const shareButtonRef = useRef<HTMLDivElement>(null);
  const newKeyButtonRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = project?.user_permissions?.includes('CAN_MANAGE') || false;

  // Load key when modal opens
  useEffect(() => {
    if (isOpen && project) {
      loadKey();
    } else {
      // Reset state when modal closes
      setKey(null);
      setHasKey(false);
      setShowShareDropdown(false);
      setShowConfirmDialog(false);
      setShowNewKeyOptions(false);
      setShowManualEntry(false);
      setShowRemoveConfirm(false);
      setManualKeyInput('');
      setManualKeyError(null);
    }
  }, [isOpen, project]);

  const loadKey = async () => {
    if (!project) return;
    
    try {
      setIsLoading(true);
      const keyExists = await window.encryptionStore?.hasKey(project.project_id);
      setHasKey(keyExists || false);
      
      if (keyExists) {
        const projectKey = await window.encryptionStore?.getKey(project.project_id);
        setKey(projectKey || null);
      }
    } catch (error) {
      /* console.error('Error loading key:', error); */
      toast.error('Failed to load key');
    } finally {
      setIsLoading(false);
    }
  };

  // Close share dropdown when clicking outside
  useEffect(() => {
    if (!showShareDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (shareButtonRef.current && !shareButtonRef.current.contains(event.target as Node)) {
        setShowShareDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareDropdown]);

  // Close new key options dropdown when clicking outside
  useEffect(() => {
    if (!showNewKeyOptions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (newKeyButtonRef.current && !newKeyButtonRef.current.contains(event.target as Node)) {
        setShowNewKeyOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNewKeyOptions]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showConfirmDialog) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, showConfirmDialog, onClose]);

  const handleCopyKey = async () => {
    if (!key) return;
    
    try {
      await navigator.clipboard.writeText(key);
      toast.success('Key copied to clipboard');
      setShowShareDropdown(false);
    } catch (error) {
      toast.error('Failed to copy key to clipboard');
    }
  };

  const handleExportKey = () => {
    if (!key || !project) return;
    
    try {
      const filename = `project-${project.project_id}-key`;
      downloadPEMFile(key, filename);
      toast.success('Key exported successfully');
      setShowShareDropdown(false);
    } catch (error) {
      const errorMessage = error instanceof EncryptionError ? error.message : 'Failed to export key';
      toast.error(errorMessage);
    }
  };

  const handleNewKeyClick = () => {
    if (hasKey && key) {
      // If key exists, show confirmation dialog first
      setShowConfirmDialog(true);
    } else {
      // If no key, show options directly
      setShowNewKeyOptions(true);
    }
  };

  const handleConfirmNewKey = () => {
    setShowConfirmDialog(false);
    setShowNewKeyOptions(true);
  };

  const handleGenerateNewKey = async () => {
    if (!project) return;
    
    try {
      setIsGenerating(true);
      const newKey = await generateKey();
      const success = await window.encryptionStore?.setKey(project.project_id, newKey);
      
      if (success) {
        setKey(newKey);
        setHasKey(true);
        toast.success('New key generated successfully');
        setShowNewKeyOptions(false);
        setShowManualEntry(false);
      } else {
        toast.error('Failed to save new key');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate new key';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualKeySubmit = async () => {
    if (!project || !manualKeyInput.trim()) return;
    
    try {
      // Validate key format
      validateKeyFormat(manualKeyInput.trim());
      
      const success = await window.encryptionStore?.setKey(project.project_id, manualKeyInput.trim());
      
      if (success) {
        setKey(manualKeyInput.trim());
        setHasKey(true);
        setShowManualEntry(false);
        setShowNewKeyOptions(false);
        setManualKeyInput('');
        setManualKeyError(null);
        toast.success('Key saved successfully');
      } else {
        toast.error('Failed to save key');
      }
    } catch (error) {
      const errorMessage = error instanceof EncryptionError ? error.message : 'Invalid key format';
      setManualKeyError(errorMessage);
    }
  };

  const handleImportPEM = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!project || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    
    try {
      const fileContent = await file.text();
      const importedKey = importKeyFromPEM(fileContent);
      
      const success = await window.encryptionStore?.setKey(project.project_id, importedKey);
      
      if (success) {
        setKey(importedKey);
        setHasKey(true);
        setShowNewKeyOptions(false);
        toast.success('Key imported successfully');
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error('Failed to save imported key');
      }
    } catch (error) {
      const errorMessage = error instanceof EncryptionError ? error.message : 'Failed to import PEM file';
      toast.error(errorMessage);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAutoGenerateKey = async () => {
    if (!project) return;
    
    try {
      setIsGenerating(true);
      const newKey = await generateKey();
      const success = await window.encryptionStore?.setKey(project.project_id, newKey);
      
      if (success) {
        setKey(newKey);
        setHasKey(true);
        setShowNewKeyOptions(false);
        toast.success('Key generated successfully');
      } else {
        toast.error('Failed to save generated key');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate key';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!project || !canManage) return;
    
    try {
      const success = await window.encryptionStore?.removeKey(project.project_id);
      
      if (success) {
        setKey(null);
        setHasKey(false);
        setShowRemoveConfirm(false);
        toast.success('Key removed successfully');
      } else {
        toast.error('Failed to remove key');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove key';
      toast.error(errorMessage);
    }
  };

  const getTruncatedKey = (keyValue: string): string => {
    if (keyValue.length <= 30) return keyValue + '...';
    return keyValue.substring(0, 30) + '...';
  };

  if (!isOpen || !project) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container key-management-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Manage Project Key</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="modal-form">
          {isLoading ? (
            <div className="key-loading">
              <p>Loading key information...</p>
            </div>
          ) : hasKey && key ? (
            <>
              {/* Key Display */}
              <div className="form-group">
                <label className="form-label">
                  Project Key
                  <Tooltip text="This is the encryption key used to encrypt and decrypt sensitive data in this project. The key is displayed in a truncated format for security." />
                </label>
                <div className="key-display-row">
                  <div className="key-display-container">
                    <input
                      type="text"
                      value={getTruncatedKey(key)}
                      readOnly
                      className="form-input key-display-input"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-remove-key"
                    onClick={() => setShowRemoveConfirm(true)}
                    disabled={!canManage}
                    title={!canManage ? 'You need CAN_MANAGE permission to remove key' : 'Remove key'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <div className="share-button-container" ref={shareButtonRef}>
                    <button
                      type="button"
                      className="btn-share"
                      onClick={() => setShowShareDropdown(!showShareDropdown)}
                      title="Share key options"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 8a3 3 0 1 0-2.83-4H15a3 3 0 0 0 0 6h.17A3 3 0 0 0 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 14a3 3 0 1 0-2.83 4H3a3 3 0 0 0 0-6h.17A3 3 0 0 0 6 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 13l8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 19l8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Share
                    </button>
                    
                    {showShareDropdown && (
                      <div className="share-dropdown">
                        <button
                          type="button"
                          className="share-dropdown-item"
                          onClick={handleCopyKey}
                          title="Copy key to clipboard"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Copy
                        </button>
                        <button
                          type="button"
                          className="share-dropdown-item"
                          onClick={handleExportKey}
                          title="Export key as PEM file"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Export
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* No Key Message */}
              <div className="form-group">
                <p className="no-key-message">This project does not have an encryption key yet.</p>
              </div>
            </>
          )}


          {/* Manual Entry Section */}
          {showManualEntry && (
            <div className="form-group manual-entry-section">
              <label className="form-label">
                Enter Base64 Key <span className="required-asterisk">*</span>
              </label>
              <input
                type="text"
                value={manualKeyInput}
                onChange={(e) => {
                  setManualKeyInput(e.target.value);
                  setManualKeyError(null);
                }}
                placeholder="Enter 44-character Base64 key"
                className={`form-input ${manualKeyError ? 'error' : ''}`}
              />
              {manualKeyError && (
                <span className="error-message">{manualKeyError}</span>
              )}
              <div className="manual-entry-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualKeyInput('');
                    setManualKeyError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save"
                  onClick={handleManualKeySubmit}
                  disabled={!manualKeyInput.trim()}
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Hidden file input for PEM import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pem"
            onChange={handleImportPEM}
            style={{ display: 'none' }}
            id="pem-file-input"
          />
        </div>

        {/* Action Buttons */}
        <div className="modal-actions key-modal-actions">
          <div className="new-key-button-container" ref={newKeyButtonRef}>
              <button
                type="button"
                className="btn-new-key"
                onClick={handleNewKeyClick}
                disabled={hasKey && !canManage}
                title={hasKey && !canManage ? 'You need CAN_MANAGE permission to generate a new key' : 'Create or generate a new encryption key'}
              >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              New Key
            </button>

            {/* New Key Options Dropdown */}
            {showNewKeyOptions && (
              <div className="new-key-options-dropdown">
                  <button
                    type="button"
                    className="new-key-option-item"
                    onClick={handleAutoGenerateKey}
                    disabled={isGenerating}
                    title="Automatically generate a new encryption key"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isGenerating ? 'Generating...' : 'Auto Generate Key'}
                </button>
                  <button
                    type="button"
                    className="new-key-option-item"
                    onClick={() => {
                      setShowManualEntry(true);
                      setShowNewKeyOptions(false);
                    }}
                    title="Enter a Base64 encoded key manually"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Enter Key Manually
                </button>
                  <button
                    type="button"
                    className="new-key-option-item"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowNewKeyOptions(false);
                    }}
                    title="Import key from a PEM file"
                  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Import from PEM File
                </button>
              </div>
            )}
          </div>
          <button type="button" className="btn-cancel" onClick={onClose} title="Close modal">
            Close
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="confirm-dialog-title">Confirm New Key Generation</h3>
              <p className="confirm-dialog-message">
                Encrypted data will not be decryptable with the new key. Are you sure you want to create a new key?
              </p>
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isGenerating}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save"
                  onClick={handleConfirmNewKey}
                  disabled={isGenerating}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Remove Key Confirmation Dialog */}
        {showRemoveConfirm && (
          <div className="confirm-dialog-overlay">
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <h3 className="confirm-dialog-title">Confirm Key Removal</h3>
              <p className="confirm-dialog-message">
                Are you sure you want to remove this key? Encrypted data will not be decryptable after removing the key.
              </p>
              <div className="confirm-dialog-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRemoveConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-save delete"
                  onClick={handleRemoveKey}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyManagementModal;

