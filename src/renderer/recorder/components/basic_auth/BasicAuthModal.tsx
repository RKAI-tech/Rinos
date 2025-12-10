import React, { useEffect, useState, useRef } from 'react';
import './BasicAuthModal.css';
import { BasicAuthentication } from '../../types/basic_auth';
import { toast } from 'react-toastify';

interface BasicAuthModalProps {
  isOpen: boolean;
  testcaseId?: string | null;
  onClose: () => void;
  onSaved?: (
    basicAuth:
      | BasicAuthentication
      | undefined
  ) => void;
  basicAuth?: BasicAuthentication;
}

const emptyItem = (testcaseId?: string | null): BasicAuthentication => ({
  testcase_id: testcaseId || undefined,
  username: '',
  password: '',
});

const BasicAuthModal: React.FC<BasicAuthModalProps> = ({
  isOpen,
  testcaseId,
  onClose,
  onSaved,
  basicAuth
}) => {
  const [currentAuth, setCurrentAuth] = useState<BasicAuthentication>(emptyItem(testcaseId));
  const [hasAuthData, setHasAuthData] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const usernameInputRef = useRef<HTMLInputElement | null>(null);

  
  useEffect(() => {
    if (!isOpen || !showForm) return;
    const timeoutId = window.setTimeout(() => {
      usernameInputRef.current?.focus();
    }, 100);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, showForm]);

  useEffect(() => {
    if (!isOpen) return;
    if (basicAuth && (basicAuth.username || basicAuth.password)) {
      setCurrentAuth({
        username: basicAuth.username || '',
        password: basicAuth.password || '',
      });
      setHasAuthData(true);
      setShowForm(true);
      setErrors({});
    } else {
      setCurrentAuth(emptyItem(testcaseId));
      setHasAuthData(false);
      setShowForm(false);
      setErrors({});
    }
  }, [isOpen, basicAuth, testcaseId]);

  if (!isOpen) return null;

  const updateField = (field: keyof BasicAuthentication, value: string) => {
    setCurrentAuth(prev => ({ ...prev, [field]: value }));
    if (field === 'username' || field === 'password') {
      if (value && value.trim().length > 0) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    }
  };

  const handleAddAuth = () => {
    setCurrentAuth(emptyItem(testcaseId));
    setShowForm(true);
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors: { username?: string; password?: string } = {};
    if (!currentAuth.username || currentAuth.username.trim().length === 0) {
      newErrors.username = 'Username is required';
    }
    if (!currentAuth.password || currentAuth.password.trim().length === 0) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!testcaseId) {
      toast.error('Missing testcase ID');
      return;
    }
    
    const authToSave = { ...currentAuth, testcase_id: testcaseId };
    if (!validate()) return;

    setHasAuthData(true);
    if (onSaved) onSaved(authToSave);
    onClose();
  };

  const handleDelete = () => {
    if (!hasAuthData) {
      toast.warning('No authentication data to delete');
      return;
    }   
    // Chỉ xóa trên UI, không gọi API
    setCurrentAuth(emptyItem(testcaseId));
    setHasAuthData(false);
    setShowForm(false);
    setErrors({});
    if (onSaved) onSaved(undefined);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          width: 480,
          maxWidth: '90vw',
          minWidth: 380,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>HTTP Authentication</h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4
            }}
            title="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px', boxSizing: 'border-box' }}>
          {!showForm ? (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: 14, 
                color: '#6b7280', 
                marginBottom: 20 
              }}>
                No HTTP authentication configured
              </div>
              <button 
                onClick={handleAddAuth}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#3b82f6',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Basic Authentication
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: 500 }}>Username</label>
                <input
                  ref={usernameInputRef}
                  value={currentAuth.username || ''}
                  onChange={(e) => updateField('username', e.target.value)}
                  placeholder="Enter username"
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    border: errors.username ? '1px solid #dc2626' : '1px solid #d1d5db', 
                    borderRadius: 8, 
                    fontSize: 14,
                    boxSizing: 'border-box',
                    backgroundColor: errors.username ? '#fff7f7' : '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = errors.username ? '#dc2626' : '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = errors.username ? '#dc2626' : '#d1d5db'}
                />
                {errors.username && (
                  <div style={{ marginTop: 6, color: '#dc2626', fontSize: 12 }}>{errors.username}</div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: 500 }}>Password</label>
                <input
                  type="password"
                  value={currentAuth.password || ''}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Enter password"
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    border: errors.password ? '1px solid #dc2626' : '1px solid #d1d5db', 
                    borderRadius: 8, 
                    fontSize: 14,
                    boxSizing: 'border-box',
                    backgroundColor: errors.password ? '#fff7f7' : '#fff',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = errors.password ? '#dc2626' : '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = errors.password ? '#dc2626' : '#d1d5db'}
                />
                {errors.password && (
                  <div style={{ marginTop: 6, color: '#dc2626', fontSize: 12 }}>{errors.password}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ 
          padding: '12px 20px', 
          borderTop: '1px solid #e5e7eb', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: 8, 
          background: '#f9fafb' 
        }}>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: '1px solid #d1d5db', 
              borderRadius: 8, 
              padding: '8px 16px', 
              color: '#6b7280', 
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            Cancel
          </button>
          {hasAuthData && (
            <button 
              onClick={handleDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#dc2626',
                border: 'none',
                color: '#fff',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          )}
          {showForm && (
            <button 
              onClick={handleSave}
              style={{ 
                background: '#3b82f6', 
                border: 'none', 
                color: '#fff', 
                borderRadius: 8, 
                padding: '8px 16px', 
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicAuthModal;


