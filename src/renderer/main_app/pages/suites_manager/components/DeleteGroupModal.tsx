import React from 'react';
import { TreeGroup } from '../utils/treeOperations';

interface DeleteGroupModalProps {
  group: TreeGroup | null;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: (groupId: string) => void;
}

const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  group,
  isDeleting,
  onClose,
  onDelete,
}) => {
  if (!group) return null;

  return (
    <div
      className="ds-modal-overlay"
      onClick={() => {
        if (!isDeleting) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483647
      }}
    >
      <div
        className="ds-modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: 0,
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
        }}
      >
        <div className="ds-modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 className="ds-modal-title" style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Confirm Delete Group</h2>
          <button
            className="ds-modal-close-btn"
            onClick={() => {
              if (!isDeleting) {
                onClose();
              }
            }}
            aria-label="Close"
            disabled={isDeleting}
            style={{ background: 'none', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer', padding: '4px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="ds-modal-content" style={{ padding: '24px' }}>
          <p className="ds-modal-message" style={{ margin: 0, color: '#374151' }}>
            Are you sure you want to delete group{group.name ? ` "${group.name}"` : ''}? This action cannot be undone.
          </p>
        </div>

        <div className="ds-modal-actions" style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => {
              if (!isDeleting) {
                onClose();
              }
            }}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onDelete(group.group_id)}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: isDeleting ? '#9ca3af' : '#ef4444',
              color: 'white',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              fontWeight: 500
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteGroupModal;

