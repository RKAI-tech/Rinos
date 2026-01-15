import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import userService from '../../services/users';
import './ProfileModal.css';
import type { UpdateProfilePayload } from '../../types/user';

type UserForm = {
  email: string;
  username: string;
  password: string;
};

type FieldErrors = Partial<Record<keyof UserForm, string>>;

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: (nextEmail: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9_. ]+$/;

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M1.5 12C3.3 6.75 7.5 4 12 4C16.5 4 20.7 6.75 22.5 12C20.7 17.25 16.5 20 12 20C7.5 20 3.3 17.25 1.5 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {!visible && <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
  </svg>
);

const Tooltip = ({ text }: { text: string }) => (
  <div className="tooltip-container">
    <span className="tooltip-icon" tabIndex={0} role="button" aria-label="Help">
      ?
    </span>
    <div className="tooltip-content" role="tooltip">
      {text}
    </div>
  </div>
);

function validate(form: UserForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_RE.test(form.email.trim())) {
    errors.email = 'Invalid email format';
  }

  if (!form.username.trim()) {
    errors.username = 'Username is required';
  } else if (!USERNAME_RE.test(form.username.trim())) {
    errors.username = 'Username can contain only letters, numbers, "_", "." and spaces';
  }

  // password: optional; no validation required per spec
  return errors;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onProfileUpdated }) => {
  const { logout, updateIdentity } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnactivating, setIsUnactivating] = useState(false);
  const [showUnactiveConfirm, setShowUnactiveConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [initial, setInitial] = useState<{ email: string; username: string } | null>(null);
  const [form, setForm] = useState<UserForm>({ email: '', username: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  const isBusy = isLoading || isSaving || isUnactivating;

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    (async () => {
      setIsLoading(true);
      setErrors({});
      setShowUnactiveConfirm(false);
      setShowPassword(false);
      try {
        const resp = await userService.getMe();
        if (!resp.success || !resp.data) {
          throw new Error(resp.error || 'Failed to load profile');
        }
        if (!mounted) return;
        setInitial({ email: resp.data.email || '', username: resp.data.username || '' });
        setForm({ email: resp.data.email || '', username: resp.data.username || '', password: '' });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBusy) {
        if (showUnactiveConfirm) {
          setShowUnactiveConfirm(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBusy, onClose, showUnactiveConfirm]);

  const canSave = useMemo(() => {
    if (!initial) return false;
    const trimmedEmail = form.email.trim();
    const trimmedUsername = form.username.trim();
    const changedEmail = trimmedEmail !== initial.email;
    const changedUsername = trimmedUsername !== initial.username;
    const changedPassword = form.password.trim().length > 0;
    return changedEmail || changedUsername || changedPassword;
  }, [form.email, form.username, form.password, initial]);

  const handleChange = (key: keyof UserForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSave = async () => {
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!initial) return;
    if (!canSave) return;

    const trimmedEmail = form.email.trim();
    const trimmedUsername = form.username.trim();

    const payload: UpdateProfilePayload = {};
    if (trimmedEmail !== initial.email) payload.email = trimmedEmail;
    if (trimmedUsername !== initial.username) payload.username = trimmedUsername;
    if (form.password.trim()) payload.password = form.password;

    setIsSaving(true);
    try {
      const resp = await userService.updateProfile(payload);
      if (!resp.success) throw new Error(resp.error || 'Failed to save profile');
      toast.success(resp.message || 'Profile updated successfully');
      setInitial({ email: trimmedEmail, username: trimmedUsername });
      setForm((prev) => ({ ...prev, email: trimmedEmail, username: trimmedUsername, password: '' }));
      await updateIdentity({ email: trimmedEmail, username: trimmedUsername });
      onProfileUpdated?.(trimmedEmail);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnactive = async () => {
    setShowUnactiveConfirm(false);
    setIsUnactivating(true);
    try {
      const resp = await userService.unactivateAccount();
      if (!resp.success) throw new Error(resp.error || 'Failed to unactive account');
      toast.success(resp.message || 'Account unactivated');
      await logout();
      await (window as any).electronAPI?.window?.closeAllWindows({ preserveSender: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to unactive account');
    } finally {
      setIsUnactivating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2 className="profile-modal-title">Profile</h2>
          <button className="profile-modal-close-btn" onClick={onClose} disabled={isBusy} aria-label="Close" title="Close">
            ✕
          </button>
        </div>

        <div className="profile-modal-content">
          {isLoading ? (
            <div className="profile-modal-loading">Loading...</div>
          ) : (
            <>
              <div className="profile-field">
                <label className="profile-label profile-label-row">
                  Email
                  <Tooltip text="Enter a valid email (e.g., name@example.com). This is used for sign-in and notifications." />
                </label>
                <input
                  className={`profile-input ${errors.email ? 'invalid' : ''}`}
                  type="text"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={isBusy}
                  autoComplete="email"
                />
                {errors.email && <div className="profile-error">{errors.email}</div>}
              </div>

              <div className="profile-field">
                <label className="profile-label profile-label-row">
                  Username
                  <Tooltip text='Allowed characters: letters, numbers, "_", "." and spaces. Example: john_doe.01 or john doe' />
                </label>
                <input
                  className={`profile-input ${errors.username ? 'invalid' : ''}`}
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  disabled={isBusy}
                  autoComplete="username"
                />
                {errors.username && <div className="profile-error">{errors.username}</div>}
              </div>

              <div className="profile-field">
                <label className="profile-label profile-label-row">
                  Password
                  <Tooltip text="Leave blank to keep your current password. Enter a new password only if you want to change it." />
                </label>
                <div className="profile-password-wrapper">
                  <input
                    className="profile-input profile-input-with-toggle"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    disabled={isBusy}
                    autoComplete="new-password"
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    className="profile-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isBusy}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="profile-modal-footer">
          <button
            className="profile-btn profile-btn-danger"
            onClick={() => setShowUnactiveConfirm(true)}
            disabled={isBusy || isLoading}
            title="Deactivate your account and sign out."
          >
            {isUnactivating ? 'Deactivating...' : 'Deactivate account'}
          </button>
          <button
            className="profile-btn profile-btn-primary"
            onClick={handleSave}
            disabled={isBusy || isLoading || !canSave}
            title="Save your changes."
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {showUnactiveConfirm && (
          <div className="profile-confirm-overlay" onClick={() => (!isBusy ? setShowUnactiveConfirm(false) : undefined)}>
            <div className="profile-confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="profile-confirm-header">
                <h3 className="profile-confirm-title">Deactivate account</h3>
                <button
                  className="profile-confirm-close-btn"
                  onClick={() => setShowUnactiveConfirm(false)}
                  disabled={isBusy}
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
              </div>
              <div className="profile-confirm-content">
                <p className="profile-confirm-message">
                  Are you sure you want to deactivate this account? You will be signed out and must contact an administrator to reactivate it.
                </p>
              </div>
              <div className="profile-confirm-actions">
                <button
                  type="button"
                  className="profile-confirm-btn-cancel"
                  onClick={() => setShowUnactiveConfirm(false)}
                  disabled={isBusy}
                  title="Go back without deactivating."
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="profile-confirm-btn-danger"
                  onClick={handleUnactive}
                  disabled={isBusy}
                  title="Deactivate now and sign out."
                >
                  {isUnactivating ? 'Deactivating...' : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;