import React, { useMemo } from 'react';
import { BrowserStorageType } from '../../../types/browser_storage';

interface EditBrowserStorageModalProps {
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

const validateCookieArray = (parsed: unknown) => {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  return parsed.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const obj = item as Record<string, any>;
    return (
      typeof obj.domain === 'string' &&
      typeof obj.path === 'string' &&
      typeof obj.sameSite === 'string' &&
      typeof obj.secure === 'boolean' &&
      typeof obj.value === 'string'
    );
  });
};

const validateKeyValueObject = (parsed: unknown) => {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  return Object.keys(parsed).every((key) => typeof (parsed as any)[key] === 'string');
};

const EditBrowserStorageModal: React.FC<EditBrowserStorageModalProps> = ({ isOpen, onClose, onSave, isSaving, name, description, value, type, setName, setDescription, setValue, setType }) => {
  if (!isOpen) return null;

  const isValueValidJSON = useMemo(() => {
    if (!value.trim()) return false;
    try {
      const parsed = JSON.parse(value);
      if (type === BrowserStorageType.COOKIE) {
        return validateCookieArray(parsed);
      }
      if (
        type === BrowserStorageType.LOCAL_STORAGE ||
        type === BrowserStorageType.SESSION_STORAGE
      ) {
        return validateKeyValueObject(parsed);
      }
      return true;
    } catch {
      return false;
    }
  }, [value]);

  const isSaveDisabled =
    isSaving ||
    !name.trim() ||
    !value.trim() ||
    !type ||
    !isValueValidJSON;

  return (
    <div className="cookies-modal-overlay" onClick={onClose}>
      <div className="cookies-modal" onClick={e => e.stopPropagation()}>
        <div className="cookies-modal-header">
          Edit Browser Storage
          <button className="modal-close-btn" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="cookies-modal-body">
          <label className="cookies-modal-label">
            Name <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input className="cookies-modal-input" value={name} onChange={e => setName(e.target.value)} placeholder="Browser storage name" />

          <label className="cookies-modal-label">Description</label>
          <input className="cookies-modal-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />

          <label className="cookies-modal-label">
            Type <span style={{ color: '#dc2626' }}>*</span>
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

          <label className="cookies-modal-label">
            Value <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <textarea className="cookies-modal-textarea" rows={6} value={value} onChange={e => setValue(e.target.value)} placeholder='Enter value (JSON or text)'></textarea>
          {!isValueValidJSON && value.trim().length > 0 && (
            <div className="cookies-textarea-error">
              {type === BrowserStorageType.COOKIE
                ? 'Value must be an array of cookie objects with domain, path, sameSite, secure, value.'
                : 'Value must be a valid JSON object with key-value string pairs.'}
            </div>
          )}
        </div>
        <div className="cookies-modal-footer">
          <button className="cookies-btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            className="cookies-btn-primary"
            onClick={onSave}
            disabled={isSaveDisabled}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBrowserStorageModal;
