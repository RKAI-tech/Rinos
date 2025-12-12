import React, { useMemo } from 'react';
import { BrowserStorageType } from '../../../types/browser_storage';

interface CreateBrowserStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  name: string;
  description: string;
  value: string;
  type: BrowserStorageType;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setValue: (value: string) => void;
  setType: (value: BrowserStorageType) => void;
}

const CreateBrowserStorageModal: React.FC<CreateBrowserStorageModalProps> = ({ isOpen, onClose, onSave, isSaving, name, description, value, type, setName, setDescription, setValue, setType }) => {
  if (!isOpen) return null;

  const handleValuePlaceholder = (type: BrowserStorageType) => {
    if (type === BrowserStorageType.COOKIE) {
      return `[\n` +
        `  {\n` +
        `    "domain": "automation-test.rikkei.org",\n` +
        `    "hostOnly": true,\n` +
        `    "path": "/",\n` +
        `    "sameSite": "Lax",\n` +
        `    "secure": false,\n` +
        `    "value": "################################"\n` +
        `  }` +
        `\n]`;
    } else if (type === BrowserStorageType.LOCAL_STORAGE) {
      return `{\n` +
        `  "user_data": "##########",\n` +
        `  "access_token": "##########",\n` +
        `  "refresh_token": "##########"\n` +
        `}`;
    } else if (type === BrowserStorageType.SESSION_STORAGE) {
      return `{\n` +
        `  "user_data": "##########",\n` +
        `  "access_token": "##########",\n` +
        `  "refresh_token": "##########"\n` +
        `}`;
    }
  };

  const isCreateDisabled =
    isSaving ||
    !name.trim() ||
    !value.trim() ||
    !type;

  return (
    <div className="cookies-modal-overlay">
      <div className="cookies-modal" onClick={e => e.stopPropagation()}>
        <div className="cookies-modal-header">
          Create Browser Storage
          <button className="modal-close-btn" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="cookies-modal-body">
          <label className="cookies-modal-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Name <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
            <div className="tooltip-container">
              <span className="tooltip-icon">?</span>
              <div className="tooltip-content">
                The name of the browser storage item which helps identify it uniquely.
              </div>
            </div>
          </label>
          <input className="cookies-modal-input-placeholder" value={name} onChange={e => setName(e.target.value)} placeholder="Browser storage name" />

          <label className="cookies-modal-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Description
            <div className="tooltip-container">
              <span className="tooltip-icon">?</span>
              <div className="tooltip-content">
                Optional description or note about this browser storage item. This helps provide context for what it is for.
              </div>
            </div>
          </label>
          <input className="cookies-modal-input-placeholder" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />

          <label className="cookies-modal-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Type <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
            <div className="tooltip-container">
              <span className="tooltip-icon">?</span>
              <div className="tooltip-content">
                Select where this item is stored in the browser.
              </div>
            </div>
          </label>
          <select
            className="cookies-modal-input"
            value={type}
            onChange={e => setType(e.target.value as BrowserStorageType)}
          >
            <option value={BrowserStorageType.COOKIE}>Cookie</option>
            <option value={BrowserStorageType.LOCAL_STORAGE}>Local Storage</option>
            <option value={BrowserStorageType.SESSION_STORAGE}>Session Storage</option>
          </select>

          <label className="cookies-modal-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Value <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>
            <div className="tooltip-container">
              <span className="tooltip-icon">?</span>
              <div className="tooltip-content">
                Enter the value for the browser storage item. Please ensure valid JSON syntax.
              </div>
            </div>
          </label>
          <textarea
            className="cookies-modal-textarea-placeholder"
            rows={6}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={handleValuePlaceholder(type)}
          ></textarea>
        </div>
        <div className="cookies-modal-footer">
          <button className="cookies-btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            className="cookies-btn-primary"
            onClick={onSave}
            disabled={isCreateDisabled}
          >
            {isSaving ? 'Saving...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBrowserStorageModal;
