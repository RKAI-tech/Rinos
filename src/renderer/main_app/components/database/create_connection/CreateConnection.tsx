import React, { useState, useEffect } from 'react';
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
  }) => void;
}

const CreateConnection: React.FC<CreateConnectionProps> = ({ isOpen, projectId, onClose, onSave }) => {
  const [dbType, setDbType] = useState<DbTypeOption>('postgres');
  const [dbName, setDbName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'db_name' | 'host' | 'port' | 'username' | 'password', string>>>({});

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!dbName.trim()) newErrors.db_name = 'Database name is required';
    if (!host.trim()) newErrors.host = 'Host is required';
    if (!port || isNaN(Number(port))) newErrors.port = 'Port must be a number';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!password) newErrors.password = 'Password is required';
    if (!projectId) newErrors.host = (newErrors.host ? newErrors.host + ' | ' : '') + 'Missing project id';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    onSave({
      project_id: projectId as string,
      db_type: dbType,
      db_name: dbName.trim(),
      host: host.trim(),
      port: Number(port),
      username: username.trim(),
      password,
    });
  };

  const handleClose = () => {
    setDbType('postgres');
    setDbName('');
    setHost('');
    setPort('');
    setUsername('');
    setPassword('');
    setErrors({});
    onClose();
  };

  return (
    <div className="cc-modal-overlay" onClick={handleClose}>
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
              <input id="dbName" type="text" className={`cc-form-input ${errors.db_name ? 'cc-error' : ''}`} value={dbName} onChange={(e) => setDbName(e.target.value)} placeholder="e.g. app_db" />
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
              <input id="port" type="text" className={`cc-form-input ${errors.port ? 'cc-error' : ''}`} value={port} onChange={(e) => setPort(e.target.value)} placeholder={dbType === 'postgres' ? '5432' : '3306'} />
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
              <input id="password" type="password" className={`cc-form-input ${errors.password ? 'cc-error' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              {errors.password && <span className="cc-error-message">{errors.password}</span>}
            </div>
          </div>

          <div className="cc-modal-actions">
            <button type="button" className="cc-btn cc-btn-cancel" onClick={handleClose}>Cancel</button>
            <button type="submit" className="cc-btn cc-btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateConnection;


