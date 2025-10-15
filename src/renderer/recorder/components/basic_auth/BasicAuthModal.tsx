import React, { useEffect, useMemo, useState } from 'react';
import './BasicAuthModal.css';
import { BasicAuthentication } from '../../types/basic_auth';
import { BasicAuthService } from '../../services/basic_auth';
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

const BasicAuthModal: React.FC<BasicAuthModalProps> = ({ isOpen, testcaseId, onClose, onSaved, basicAuth }) => {
  const service = useMemo(() => new BasicAuthService(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAuth, setCurrentAuth] = useState<BasicAuthentication>(emptyItem(testcaseId));
  const [hasAuthData, setHasAuthData] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (!testcaseId) {
      setCurrentAuth(emptyItem(testcaseId));
      setHasAuthData(false);
      setShowForm(false);
      return;
    }
    const load = async () => {
      setIsLoading(true);
      try {
        const resp = await service.getBasicAuthenticationByTestcaseId(testcaseId);
        console.log('resp', resp);
        if (resp.success && resp.data && resp.data.username) {
          setCurrentAuth({
            username: resp.data.username,
            password: resp.data.password,
          });
          setHasAuthData(true);
          setShowForm(true);
        } else {
          setCurrentAuth(emptyItem(testcaseId));
          setHasAuthData(false);
          setShowForm(false);
          if (resp.error) toast.error(resp.error);
        }
      } catch (e) {
        setCurrentAuth(emptyItem(testcaseId));
        setHasAuthData(false);
        setShowForm(false);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, testcaseId, service]);

  if (!isOpen) return null;

  const updateField = (field: keyof BasicAuthentication, value: string) => {
    setCurrentAuth(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAuth = () => {
    setCurrentAuth(emptyItem(testcaseId));
    setShowForm(true);
  };

  const handleSave = () => {
    if (!testcaseId) {
      toast.error('Missing testcase ID');
      return;
    }
    
    const authToSave = { ...currentAuth, testcase_id: testcaseId };
    
    if (!authToSave.username?.trim()) {
      toast.warning('Please enter a username');
      return;
    }
    
    // Chỉ lưu trên UI, không gọi API
    setHasAuthData(true);
    toast.success('HTTP Authentication saved');
    if (onSaved) onSaved(authToSave);
    onClose();
  };

  const handleDelete = () => {
    if (!hasAuthData) {
      toast.warning('No authentication data to delete');
      return;
    }
    
    const confirmed = window.confirm('Are you sure you want to delete the HTTP authentication?');
    if (!confirmed) return;
    
    // Chỉ xóa trên UI, không gọi API
    setCurrentAuth(emptyItem(testcaseId));
    setHasAuthData(false);
    setShowForm(false);
    toast.success('HTTP Authentication removed');
    if (onSaved) onSaved(undefined);
  };

  return (
    <div className="rcd-ba-overlay" onClick={onClose}>
      <div className="rcd-ba-container" onClick={(e) => e.stopPropagation()}>
        <div className="rcd-ba-header">
          <h2 className="rcd-ba-title">HTTP Authentication</h2>
          <button className="rcd-ba-close" onClick={onClose} title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="rcd-ba-content">
          {isLoading ? (
            <div className="rcd-ba-empty">Loading...</div>
          ) : !showForm ? (
            <div className="rcd-ba-empty">
              <div className="rcd-ba-empty-text">No HTTP authentication configured</div>
              <button className="rcd-ba-btn" onClick={handleAddAuth}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 6 }}>
                  <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Add Basic Authentication
              </button>
            </div>
          ) : (
            <div className="rcd-ba-form">
              <div className="rcd-ba-field">
                <label className="rcd-ba-label">Username</label>
                <input
                  className="rcd-ba-input"
                  value={currentAuth.username || ''}
                  onChange={(e) => updateField('username', e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="rcd-ba-field">
                <label className="rcd-ba-label">Password</label>
                <input
                  className="rcd-ba-input"
                  type="password"
                  value={currentAuth.password || ''}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Enter password"
                />
              </div>
            </div>
          )}
        </div>

        <div className="rcd-ba-footer">
          <button className="rcd-ba-btn" onClick={onClose}>Cancel</button>
          {hasAuthData && (
            <button className="rcd-ba-btn danger" onClick={handleDelete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 6 }}>
                <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Delete
            </button>
          )}
          {showForm && (
            <button className="rcd-ba-btn primary" onClick={handleSave}>Save</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BasicAuthModal;


