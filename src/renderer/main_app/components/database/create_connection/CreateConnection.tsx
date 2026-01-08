import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import './CreateConnection.css';

// Tooltip for inline hints like in Cookies.tsx
const Tooltip = ({ text }: { text: string }) => (
  <div className="tooltip-container">
    <span className="tooltip-icon">?</span>
    <div className="tooltip-content">{text}</div>
  </div>
);

type DbTypeOption = 'postgres' | 'mysql' | 'mssql';

interface CreateConnectionProps {
  isOpen: boolean;
  projectId?: string;
  onClose: () => void;
  onSave: (payload: {
    project_id: string;
    db_type: DbTypeOption;
    db_name: string;
    host: string;
    port: number;
    username: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }> | { success: boolean; error?: string };
}

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
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
    {!visible && (
      <path
        d="M4 4L20 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    )}
  </svg>
);

const CreateConnection: React.FC<CreateConnectionProps> = ({ isOpen, projectId, onClose, onSave }) => {
  const [dbType, setDbType] = useState<DbTypeOption>('postgres');
  const [dbName, setDbName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'db_name' | 'host' | 'port' | 'username' | 'password', string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const dbNameInputRef = useRef<HTMLInputElement>(null);

  const isFormValid = useMemo(() => {
    const parsedPort = Number(port);
    return Boolean(
      projectId &&
      dbName.trim() &&
      host.trim() &&
      port.trim() &&
      !Number.isNaN(parsedPort) &&
      parsedPort > 0 &&
      username.trim() &&
      password
    );
  }, [projectId, dbName, host, port, username, password]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setDbType('postgres');
      setDbName('');
      setHost('');
      setPort('');
      setUsername('');
      setPassword('');
      setErrors({});
      setTestResult(null);
      setIsTesting(false);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-focus on first input when modal opens
  useEffect(() => {
    if (isOpen && dbNameInputRef.current) {
      setTimeout(() => {
        dbNameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    const newErrors: typeof errors = {};
    const parsedPort = Number(port);
    if (!dbName.trim()) newErrors.db_name = 'Database name is required';
    if (!host.trim()) newErrors.host = 'Host is required';
    if (!port.trim() || Number.isNaN(parsedPort) || parsedPort <= 0 || !Number.isInteger(parsedPort)) newErrors.port = 'Port must be a positive integer';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.database) {
        toast.error('Database API is not available');
        return;
      }

      const result = await electronAPI.database.testConnection({
        db_type: dbType,
        host: host.trim(),
        port: parsedPort,
        db_name: dbName.trim(),
        username: username.trim(),
        password,
      });

      setTestResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test connection';
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    const parsedPort = Number(port);
    if (!dbName.trim()) newErrors.db_name = 'Database name is required';
    if (!host.trim()) newErrors.host = 'Host is required';
    if (!port.trim() || Number.isNaN(parsedPort) || parsedPort <= 0 || !Number.isInteger(parsedPort)) newErrors.port = 'Port must be a positive integer';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    if (!projectId) newErrors.host = (newErrors.host ? newErrors.host + ' | ' : '') + 'Missing project id';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    const payload = {
      project_id: projectId as string,
      db_type: dbType,
      db_name: dbName.trim(),
      host: host.trim(),
      port: parsedPort,
      username: username.trim(),
      password,
    };

    setIsSaving(true);
    let shouldClose = true;
    try {
      let response: any;
      try {
        response = await Promise.resolve(onSave(payload));
      } catch (error) {
        const message = 'Failed to create database connection. Please check your connection details and try again.';
        toast.warning(message);
        shouldClose = false;
        return;
      }

      const hasSuccessField = response && typeof response === 'object' && 'success' in response;

      if (hasSuccessField) {
        if (response.success) {
          toast.success('Database connection created successfully');
        } else {
          const errorMessage = response.error || 'Failed to create database connection. Please check your connection details and try again.';
          toast.error(errorMessage);
          shouldClose = false;
        }
      } else {
        // Không có cấu trúc success → coi như thất bại để tránh đóng modal ngoài ý muốn
        toast.error(response.error || 'Failed to create database connection. Please check your connection details and try again.');
        shouldClose = false;
      }
    } finally {
      setIsSaving(false);
      if (shouldClose) {
        handleClose();
      }
    }
  };

  const handleClose = () => {
    setDbType('postgres');
    setDbName('');
    setHost('');
    setPort('');
    setUsername('');
    setPassword('');
    setErrors({});
    setShowPassword(false);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="cc-modal-overlay">
      <div className="cc-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <h2 className="cc-modal-title">Create Database Connection</h2>
          <button className="cc-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="cc-modal-instructions">Enter connection details below.</p>

        <form onSubmit={handleSubmit} className="cc-modal-form">
          <div className="cc-form-row">
            <div className="cc-form-group">
              <label htmlFor="dbType" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Database Type <span className="cc-required">*</span>
                <Tooltip text="Select the type of database you want to connect to (PostgreSQL, MySQL, or Microsoft SQL Server)." />
              </label>
              <select id="dbType" className="cc-form-select" value={dbType} onChange={(e) => setDbType(e.target.value as DbTypeOption)}>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="mssql">Microsoft SQL Server</option>
              </select>
            </div>
            <div className="cc-form-group">
              <label htmlFor="dbName" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Database Name <span className="cc-required">*</span>
                <Tooltip text="The name of the database you want to connect to. This field is required." />
              </label>
              <input ref={dbNameInputRef} id="dbName" type="text" className={`cc-form-input ${errors.db_name ? 'cc-error' : ''}`} value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="e.g. app_db" />
              {errors.db_name && <span className="cc-error-message">{errors.db_name}</span>}
            </div>
          </div>

          <div className="cc-form-row">
            <div className="cc-form-group">
              <label htmlFor="host" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Host <span className="cc-required">*</span>
                <Tooltip text="The IP address or domain name where your database server is hosted (e.g., 127.0.0.1)." />
              </label>
              <input id="host" type="text" className={`cc-form-input ${errors.host ? 'cc-error' : ''}`} value={host} onChange={(e) => setHost(e.target.value)} placeholder="e.g. 127.0.0.1" />
              {errors.host && <span className="cc-error-message">{errors.host}</span>}
            </div>
            <div className="cc-form-group">
              <label htmlFor="port" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Port <span className="cc-required">*</span>
                <Tooltip text="The network port number to connect to your database (default: 5432 for PostgreSQL, 3306 for MySQL)." />
              </label>
              <input
                id="port"
                type="text"
                className={`cc-form-input ${errors.port ? 'cc-error' : ''}`}
                value={port}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^\d*$/.test(value)) {
                    setPort(value);
                  }
                }}
                placeholder={dbType === 'postgres' ? '5432' : '3306'}
              />
              {errors.port && <span className="cc-error-message">{errors.port}</span>}
            </div>
          </div>

          <div className="cc-form-row">
            <div className="cc-form-group">
              <label htmlFor="username" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Username <span className="cc-required">*</span>
                <Tooltip text="The username for your database connection. This is usually provided by your DBA or set during database setup." />
              </label>
              <input id="username" type="text" className={`cc-form-input ${errors.username ? 'cc-error' : ''}`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. dbuser" />
              {errors.username && <span className="cc-error-message">{errors.username}</span>}
            </div>
            <div className="cc-form-group">
              <label htmlFor="password" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Password <span className="cc-required">*</span>
                <Tooltip text="The password for your database connection. This is required to authenticate." />
              </label>
              <div className="cc-password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`cc-form-input ${errors.password ? 'cc-error' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="cc-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
              {errors.password && <span className="cc-error-message">{errors.password}</span>}
            </div>
          </div>

          {testResult && (
            <div className={`cc-test-result ${testResult.success ? 'cc-test-success' : 'cc-test-error'}`}>
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="cc-modal-actions">
            <button type="button" className="cc-btn cc-btn-cancel" onClick={handleClose}>Cancel</button>
            <button 
              type="button" 
              className="cc-btn cc-btn-test" 
              onClick={handleTestConnection}
              disabled={!isFormValid || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="submit" className="cc-btn cc-btn-save" disabled={!isFormValid || isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateConnection;


