import React, { useEffect, useMemo, useState, useCallback } from 'react';
import '../../../project/create_project/CreateProject.css';
import { UserService } from '../../../../services/user';
import { ProjectService } from '../../../../services/projects';
import { toast } from 'react-toastify';
import { AddUserToProjectRequest, UserInProject } from '../../../../types/projects';

interface AddUserProps {
  isOpen: boolean;
  projectId: string | null;
  onClose: () => void;
  onSuccess?: () => Promise<void> | void;
}

type Permission = 'CAN_VIEW' | 'CAN_EDIT' | 'CAN_MANAGE';

export const AddUser: React.FC<AddUserProps> = ({ isOpen, projectId, onClose, onSuccess }) => {
  const [allUsers, setAllUsers] = useState<{ user_id: string; email: string; role: string }[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Record<string, Permission>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');

  // Manage tab state
  const [members, setMembers] = useState<UserInProject[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserInProject | null>(null);
  const [removingUser, setRemovingUser] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      try {
        const svc = new UserService();
        const resp = await svc.getAllUsers({ limit: 1000, offset: 0 });
        if (mounted && resp.success && resp.data) {
          setAllUsers(resp.data.users || []);
        }
      } catch {
        /* noop */
      }
    })();
    return () => { mounted = false; };
  }, [isOpen]);

  // Load members when opening modal or switching to manage tab
  useEffect(() => {
    if (!isOpen || activeTab !== 'manage' || !projectId) return;
    let mounted = true;
    (async () => {
      try {
        setLoadingMembers(true);
        setMembersError(null);
        const svc = new ProjectService();
        const resp = await svc.getUsersInProject(projectId);
        if (!mounted) return;
        if (resp.success && resp.data) {
          setMembers(resp.data);
        } else {
          setMembers([]);
          setMembersError(resp.error || 'Failed to load members');
        }
      } catch (e) {
        if (mounted) {
          setMembersError('Failed to load members');
        }
      } finally {
        if (mounted) setLoadingMembers(false);
      }
    })();
    return () => { mounted = false; };
  }, [isOpen, activeTab, projectId]);

  useEffect(() => {
    if (!isOpen) {
      setUserSearchTerm('');
      setSelectedUsers({});
      setActiveTab('add');
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredUsers = useMemo(() => {
    const q = userSearchTerm.trim().toLowerCase();
    if (!q) return [];
    return allUsers.filter(u => u.email.toLowerCase().includes(q));
  }, [allUsers, userSearchTerm]);

  const handleToggleSelectUser = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const next = { ...prev } as typeof prev;
      if (next[userId]) {
        delete next[userId];
      } else {
        next[userId] = 'CAN_VIEW';
      }
      return next;
    });
  }, []);

  const handleChangeUserPermission = useCallback((userId: string, perm: Permission) => {
    setSelectedUsers(prev => ({ ...prev, [userId]: perm }));
  }, []);

  const handleRemoveUser = useCallback((user: UserInProject) => {
    setUserToRemove(user);
    setShowRemoveConfirm(true);
  }, []);

  const handleConfirmRemove = async () => {
    if (!userToRemove || !projectId) return;
    
    try {
      setRemovingUser(true);
      const svc = new ProjectService();
      const resp = await svc.removeUserFromProject({
        user_id: userToRemove.user_id,
        project_id: projectId,
      });
      
      if (resp.success) {
        toast.success('User removed successfully');
        // Refresh the members list
        const membersResp = await svc.getUsersInProject(projectId);
        if (membersResp.success && membersResp.data) {
          setMembers(membersResp.data);
        }
        if (onSuccess) await onSuccess();
      } else {
        toast.error(resp.error || 'Failed to remove user');
      }
    } catch (error) {
      toast.error('Failed to remove user');
    } finally {
      setRemovingUser(false);
      setShowRemoveConfirm(false);
      setUserToRemove(null);
    }
  };

  const handleCancelRemove = useCallback(() => {
    setShowRemoveConfirm(false);
    setUserToRemove(null);
  }, []);

  const handleSubmit = async () => {
    if (!projectId) return;
    const users = Object.entries(selectedUsers).map(([user_id, permission]) => ({
      user_id,
      project_id: projectId,
      permission,
    }));
    if (users.length === 0) {
      toast.warn('Please select at least one user');
      return;
    }
    try {
      setSubmitting(true);
      const svc = new ProjectService();

      const payload: AddUserToProjectRequest = {
        users: users.map(user => ({
          user_id: user.user_id,
          role: 'MEMBER',
          project_permissions: user.permission,
        })),
        project_id: projectId,
      };

      console.log(payload);

      const resp = await svc.addUserToProject(payload);
      if (resp.success) {
        toast.success('Shared project successfully');
        setActiveTab('manage');
        if (onSuccess) await onSuccess();
      } else {
        toast.error(resp.error || 'Failed to share project');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-container add-user-modal-container"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="modal-header">
          <h2 className="modal-title">Share Project</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-form">
          {/* Tabs header */}
          <div className="tab-header">
            <button
              type="button"
              className={`tab-button ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              Add member
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              Manage
            </button>
          </div>

          {activeTab === 'add' && (
            <>
              <div className="form-group">
                <label className="form-label">Search users</label>
                <input
                  type="text"
                  placeholder="Search users by email..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="form-input"
                />
              </div>

              {userSearchTerm.trim().length > 0 && (
                <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  {filteredUsers.map(u => (
                    <div
                      key={u.user_id}
                      onClick={() => handleToggleSelectUser(u.user_id)}
                      style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedUsers[u.user_id] ? '#f5f7ff' : 'transparent' }}
                    >
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#6b7280' }}>
                          <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M20 22c0-4.418-3.582-8-8-8s-8 3.582-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div>
                          <div>{u.email}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{u.role}</div>
                        </div>
                      </div>
                      {selectedUsers[u.user_id] && (
                        <div style={{ color: '#5549f5', fontWeight: 600 }}>Selected</div>
                      )}
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div style={{ padding: 16, color: '#6b7280' }}>No users found</div>
                  )}
                </div>
              )}

              {Object.keys(selectedUsers).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="form-label" style={{ marginBottom: 8 }}>Selected users</div>
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    {Object.keys(selectedUsers).map(uid => {
                      const info = allUsers.find(u => u.user_id === uid);
                      return (
                        <div key={uid} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#6b7280' }}>
                              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M20 22c0-4.418-3.582-8-8-8s-8 3.582-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <div>
                              <div>{info?.email || uid}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{info?.role || ''}</div>
                            </div>
                          </div>
                          <select
                            value={selectedUsers[uid]}
                            onChange={(e) => handleChangeUserPermission(uid, e.target.value as Permission)}
                            className="form-input"
                            style={{ width: 180, marginRight: 8 }}
                          >
                            <option value="CAN_VIEW">Can view</option>
                            <option value="CAN_EDIT">Can edit</option>
                            <option value="CAN_MANAGE">Can manage</option>
                          </select>
                          <button
                            type="button"
                            className="modal-close-btn"
                            onClick={() => handleToggleSelectUser(uid)}
                            aria-label="Remove user"
                            title="Remove"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>Cancel</button>
                <button type="button" className="btn-save" onClick={handleSubmit} disabled={submitting}>Save</button>
              </div>
            </>
          )}

          {activeTab === 'manage' && (
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, minHeight: 420 }}>
              {loadingMembers && (
                <div style={{ padding: 16, color: '#6b7280' }}>Loading members...</div>
              )}
              {membersError && !loadingMembers && (
                <div style={{ padding: 16, color: '#b91c1c' }}>{membersError}</div>
              )}
              {!loadingMembers && !membersError && members.length === 0 && (
                <div style={{ padding: 16, color: '#6b7280' }}>No members in this project</div>
              )}
              {!loadingMembers && !membersError && members.length > 0 && (
                <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {members.map(m => (
                    <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#6b7280' }}>
                          <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M20 22c0-4.418-3.582-8-8-8s-8 3.582-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div>
                          <div>{m.email || m.user_id}</div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{m.role || ''}</div>
                        </div>
                      </div>
                      <div style={{ width: '20%', fontSize: 12, color: '#374151', textAlign: 'right' }}>
                        {m.permissions || '-'}
                      </div>
                      <div style={{ width: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveUser(m)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Remove user from project"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Remove User Confirmation Dialog */}
      {showRemoveConfirm && userToRemove && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Remove User
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', lineHeight: '1.5' }}>
              Are you sure you want to remove <strong>{userToRemove.email || userToRemove.user_id}</strong> from this project? 
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelRemove}
                disabled={removingUser}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: removingUser ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removingUser}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: removingUser ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  cursor: removingUser ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                {removingUser ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddUser;


