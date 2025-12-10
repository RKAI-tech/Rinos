import React from 'react';

interface DeleteBrowserStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  cookieName?: string;
}

const DeleteBrowserStorageModal: React.FC<DeleteBrowserStorageModalProps> = ({ isOpen, onClose, onConfirm, isDeleting, cookieName }) => {
  if (!isOpen) return null;
  return (
    <div className="cookies-modal-overlay">
      <div className="cookies-modal" onClick={e => e.stopPropagation()}>
        <div className="cookies-modal-header">
          Delete Browser Storage
          <button className="modal-close-btn" aria-label="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <div className="cookies-modal-body">
          <div className="cookies-modal-warning">
            Are you sure you want to delete
            {cookieName ? ` "${cookieName}"` : ''}? This action cannot be undone.
          </div>
        </div>
        <div className="cookies-modal-footer">
          <button className="cookies-btn-secondary" onClick={onClose} disabled={isDeleting}>Cancel</button>
          <button className="cookies-btn-danger" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteBrowserStorageModal;
