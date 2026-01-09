import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import './UpdateConnection.css';
import { testDatabaseConnection, DatabaseConnectionTestParams } from '../../../utils/databaseConnection';
import { DatabaseService } from '../../../services/database';
import { DatabaseConnection } from '../../../types/databases';

// Tooltip for inline hints like in Cookies.tsx
const Tooltip = ({ text }: { text: string }) => (
  <div className="tooltip-container">
    <span className="tooltip-icon">?</span>
    <div className="tooltip-content">{text}</div>
  </div>
);

type DbTypeOption = 'postgres' | 'mysql' | 'mssql';

interface UpdateConnectionProps {
  isOpen: boolean;
  projectId?: string;
  connection: DatabaseConnection | null;
  onClose: () => void;
  onSave: () => Promise<void> | void;
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

const UpdateConnection: React.FC<UpdateConnectionProps> = ({ isOpen, projectId, connection, onClose, onSave }) => {
  const databaseService = useMemo(() => new DatabaseService(), []);
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
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);
  const dbNameInputRef = useRef<HTMLInputElement>(null);

  // Security options
  const [securityType, setSecurityType] = useState<'none' | 'ssl' | 'ssh'>('none');
  
  // SSL/TLS fields
  const [sslMode, setSslMode] = useState('require');
  const [caCertificateFile, setCaCertificateFile] = useState<File | null>(null);
  const [clientCertificateFile, setClientCertificateFile] = useState<File | null>(null);
  const [clientPrivateKeyFile, setClientPrivateKeyFile] = useState<File | null>(null);
  const [sslKeyPassphrase, setSslKeyPassphrase] = useState('');
  const [showSslPassphrase, setShowSslPassphrase] = useState(false);
  
  // Track existing certificates (base64) - for display purposes
  const [existingCaCertificate, setExistingCaCertificate] = useState<string | undefined>(undefined);
  const [existingClientCertificate, setExistingClientCertificate] = useState<string | undefined>(undefined);
  const [existingClientPrivateKey, setExistingClientPrivateKey] = useState<string | undefined>(undefined);
  const [existingSshPrivateKey, setExistingSshPrivateKey] = useState<string | undefined>(undefined);
  
  // SSH Tunnel fields
  const [sshHost, setSshHost] = useState('bastion.example.com');
  const [sshPort, setSshPort] = useState('22');
  const [sshUsername, setSshUsername] = useState('ec2-user');
  const [sshAuthMethod, setSshAuthMethod] = useState<'private_key' | 'password'>('private_key');
  const [sshPrivateKeyFile, setSshPrivateKeyFile] = useState<File | null>(null);
  const [sshKeyPassphrase, setSshKeyPassphrase] = useState('');
  const [showSshKeyPassphrase, setShowSshKeyPassphrase] = useState(false);
  const [sshPassword, setSshPassword] = useState('');
  const [showSshPassword, setShowSshPassword] = useState(false);
  const [localPort, setLocalPort] = useState('Auto');

  const isFormValid = useMemo(() => {
    const parsedPort = Number(port);
    return Boolean(
      projectId &&
      connection?.connection_id &&
      dbName.trim() &&
      host.trim() &&
      port.trim() &&
      !Number.isNaN(parsedPort) &&
      parsedPort > 0 &&
      username.trim()
      // Password is optional for update (only required if user wants to change it)
    );
  }, [projectId, connection, dbName, host, port, username]);

  // Pre-fill form when connection changes
  useEffect(() => {
    if (isOpen && connection) {
      setDbType(connection.db_type as DbTypeOption);
      setDbName(connection.db_name || '');
      setHost(connection.host || '');
      setPort(String(connection.port || ''));
      setUsername(connection.username || '');
      setPassword(''); // Don't pre-fill password for security
      setSecurityType(connection.security_type || 'none');
      
      if (connection.security_type === 'ssl') {
        setSslMode(connection.ssl_mode || 'require');
        setExistingCaCertificate(connection.ca_certificate);
        setExistingClientCertificate(connection.client_certificate);
        setExistingClientPrivateKey(connection.client_private_key);
        setSslKeyPassphrase(''); // Don't pre-fill passphrase
      }
      
      if (connection.security_type === 'ssh') {
        setSshHost(connection.ssh_host || '');
        setSshPort(String(connection.ssh_port || 22));
        setSshUsername(connection.ssh_username || '');
        setSshAuthMethod(connection.ssh_auth_method || 'private_key');
        setExistingSshPrivateKey(connection.ssh_private_key);
        setSshKeyPassphrase(''); // Don't pre-fill passphrase
        setSshPassword(''); // Don't pre-fill password
        if (connection.local_port) {
          setLocalPort(typeof connection.local_port === 'number' ? String(connection.local_port) : connection.local_port);
        } else {
          setLocalPort('Auto');
        }
      }
    }
  }, [isOpen, connection]);

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
      setSecurityType('none');
      setSslMode('require');
      setCaCertificateFile(null);
      setClientCertificateFile(null);
      setClientPrivateKeyFile(null);
      setSslKeyPassphrase('');
      setShowSslPassphrase(false);
      setSshHost('bastion.example.com');
      setSshPort('22');
      setSshUsername('ec2-user');
      setSshAuthMethod('private_key');
      setSshPrivateKeyFile(null);
      setSshKeyPassphrase('');
      setShowSshKeyPassphrase(false);
      setSshPassword('');
      setShowSshPassword(false);
      setLocalPort('Auto');
      setTestResult(null);
      setIsTesting(false);
      setExistingCaCertificate(undefined);
      setExistingClientCertificate(undefined);
      setExistingClientPrivateKey(undefined);
      setExistingSshPrivateKey(undefined);
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

  // Clear test result when any connection config changes
  useEffect(() => {
    // Only clear if modal is open and there's a test result to clear
    if (isOpen && testResult !== null) {
      setTestResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dbType,
    dbName,
    host,
    port,
    username,
    password,
    securityType,
    sslMode,
    caCertificateFile,
    clientCertificateFile,
    clientPrivateKeyFile,
    sslKeyPassphrase,
    sshHost,
    sshPort,
    sshUsername,
    sshAuthMethod,
    sshPrivateKeyFile,
    sshKeyPassphrase,
    sshPassword,
    localPort
  ]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    // Validate basic fields
    const newErrors: typeof errors = {};
    const parsedPort = Number(port);
    if (!dbName.trim()) newErrors.db_name = 'Database name is required';
    if (!host.trim()) newErrors.host = 'Host is required';
    if (!port.trim() || Number.isNaN(parsedPort) || parsedPort <= 0 || !Number.isInteger(parsedPort)) newErrors.port = 'Port must be a positive integer';
    if (!username.trim()) newErrors.username = 'Username is required';
    // Password is optional - use existing password if not provided
    if (!projectId) {
      toast.error('Project ID is required');
      return;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Use existing password from connection if password field is empty
    const passwordToUse = password || connection?.password || '';
    if (!passwordToUse) {
      toast.error('Password is required to test connection. Please enter the password.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const tempFilePaths: string[] = [];
    const electronAPI = (window as any).electronAPI;

    try {
      // Save SSL/TLS certificate files to temp location if needed
      let caCertPath: string | undefined;
      let clientCertPath: string | undefined;
      let clientKeyPath: string | undefined;
      let sshKeyPath: string | undefined;

      if (securityType === 'ssl') {
        if (caCertificateFile) {
          caCertPath = await saveFileToTemp(caCertificateFile);
          if (caCertPath) tempFilePaths.push(caCertPath);
        } else if (existingCaCertificate && connection?.ca_certificate) {
          caCertPath = await saveBase64ToTemp(connection.ca_certificate, 'ca-cert');
          if (caCertPath) tempFilePaths.push(caCertPath);
        }
        if (clientCertificateFile) {
          clientCertPath = await saveFileToTemp(clientCertificateFile);
          if (clientCertPath) tempFilePaths.push(clientCertPath);
        } else if (existingClientCertificate && connection?.client_certificate) {
          clientCertPath = await saveBase64ToTemp(connection.client_certificate, 'client-cert');
          if (clientCertPath) tempFilePaths.push(clientCertPath);
        }
        if (clientPrivateKeyFile) {
          clientKeyPath = await saveFileToTemp(clientPrivateKeyFile);
          if (clientKeyPath) tempFilePaths.push(clientKeyPath);
        } else if (existingClientPrivateKey && connection?.client_private_key) {
          clientKeyPath = await saveBase64ToTemp(connection.client_private_key, 'client-key');
          if (clientKeyPath) tempFilePaths.push(clientKeyPath);
        }
      }

      // Save SSH private key file to temp location if needed
      if (securityType === 'ssh' && sshAuthMethod === 'private_key') {
        if (sshPrivateKeyFile) {
          sshKeyPath = await saveFileToTemp(sshPrivateKeyFile);
          if (sshKeyPath) tempFilePaths.push(sshKeyPath);
        } else if (existingSshPrivateKey && connection?.ssh_private_key) {
          sshKeyPath = await saveBase64ToTemp(connection.ssh_private_key, 'ssh-key');
          if (sshKeyPath) tempFilePaths.push(sshKeyPath);
        }
      }

      const testParams: DatabaseConnectionTestParams = {
        project_id: projectId as string,
        db_type: dbType,
        db_name: dbName.trim(),
        host: host.trim(),
        port: parsedPort,
        username: username.trim(),
        password: passwordToUse,
        security_type: securityType,
      };

      // Add SSL/TLS options if enabled
      if (securityType === 'ssl') {
        testParams.ssl_mode = sslMode as 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
        
        // Add certificate file paths
        if (caCertPath) {
          testParams.ca_certificate_path = caCertPath;
        }
        if (clientCertPath) {
          testParams.client_certificate_path = clientCertPath;
        }
        if (clientKeyPath) {
          testParams.client_private_key_path = clientKeyPath;
        }
        
        // Use existing passphrase if not provided
        if (sslKeyPassphrase) {
          testParams.ssl_key_passphrase = sslKeyPassphrase;
        } else if (connection?.ssl_key_passphrase) {
          testParams.ssl_key_passphrase = connection.ssl_key_passphrase;
        }
      }

      // Add SSH Tunnel options if enabled
      if (securityType === 'ssh') {
        testParams.ssh_host = sshHost;
        testParams.ssh_port = Number(sshPort) || 22;
        testParams.ssh_username = sshUsername;
        testParams.ssh_auth_method = sshAuthMethod;
        if (sshAuthMethod === 'password') {
          testParams.ssh_password = sshPassword || connection?.ssh_password || '';
        } else if (sshAuthMethod === 'private_key') {
          if (sshKeyPath) {
            testParams.ssh_private_key_path = sshKeyPath;
          } else if (!existingSshPrivateKey || !connection?.ssh_private_key) {
            toast.warning('SSH private key file is required for private key authentication.');
            setIsTesting(false);
            return;
          }
        }
        if (localPort && localPort !== 'Auto') {
          testParams.local_port = Number(localPort);
        } else if (connection?.local_port) {
          testParams.local_port = connection.local_port;
        }
        // Use existing passphrase if not provided
        if (sshKeyPassphrase) {
          testParams.ssh_key_passphrase = sshKeyPassphrase;
        } else if (connection?.ssh_key_passphrase) {
          testParams.ssh_key_passphrase = connection.ssh_key_passphrase;
        }
      }

      const result = await testDatabaseConnection(testParams);
      setTestResult(result);

      if (result.success) {
        toast.success(result.message || 'Connection test successful!');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResult({
        success: false,
        error: errorMessage,
      });
      toast.error(`Connection test failed: ${errorMessage}`);
    } finally {
      // Cleanup temp files
      if (electronAPI?.fs && tempFilePaths.length > 0) {
        for (const tempPath of tempFilePaths) {
          try {
            await electronAPI.fs.deleteFile(tempPath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', tempPath, cleanupError);
          }
        }
      }
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connection?.connection_id) {
      toast.error('Connection not found');
      return;
    }

    const newErrors: typeof errors = {};
    const parsedPort = Number(port);
    if (!dbName.trim()) newErrors.db_name = 'Database name is required';
    if (!host.trim()) newErrors.host = 'Host is required';
    if (!port.trim() || Number.isNaN(parsedPort) || parsedPort <= 0 || !Number.isInteger(parsedPort)) newErrors.port = 'Port must be a positive integer';
    if (!username.trim()) newErrors.username = 'Username is required';
    if (!projectId) newErrors.host = (newErrors.host ? newErrors.host + ' | ' : '') + 'Missing project id';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsSaving(true);
    let shouldClose = true;
    try {
      // Build payload - only include fields that should be updated
      const payload: any = {
        connection_id: connection.connection_id,
        project_id: projectId,
      };

      // Only include fields that have changed or are being set
      if (dbType !== connection.db_type) payload.db_type = dbType;
      if (dbName.trim() !== connection.db_name) payload.db_name = dbName.trim();
      if (host.trim() !== connection.host) payload.host = host.trim();
      if (parsedPort !== connection.port) payload.port = parsedPort;
      if (username.trim() !== connection.username) payload.username = username.trim();
      
      // Only include password if user provided one (to change it)
      if (password) {
        payload.password = password;
      }

      // SSL/TLS options
      if (securityType === 'ssl') {
        payload.security_type = securityType;
        if (sslMode !== connection.ssl_mode) payload.ssl_mode = sslMode;
        
        // Only update certificates if new files are uploaded
        if (caCertificateFile) {
          payload.ca_certificate = await fileToBase64(caCertificateFile);
        }
        if (clientCertificateFile) {
          payload.client_certificate = await fileToBase64(clientCertificateFile);
        }
        if (clientPrivateKeyFile) {
          payload.client_private_key = await fileToBase64(clientPrivateKeyFile);
        }
        
        // Only include passphrase if user provided one
        if (sslKeyPassphrase) {
          payload.ssl_key_passphrase = sslKeyPassphrase;
        }
      } else if (securityType === 'none' && connection.security_type === 'ssl') {
        // Removing SSL
        payload.security_type = 'none';
      }

      // SSH Tunnel options
      if (securityType === 'ssh') {
        payload.security_type = securityType;
        if (sshHost !== connection.ssh_host) payload.ssh_host = sshHost;
        if (Number(sshPort) !== connection.ssh_port) payload.ssh_port = Number(sshPort) || 22;
        if (sshUsername !== connection.ssh_username) payload.ssh_username = sshUsername;
        if (sshAuthMethod !== connection.ssh_auth_method) payload.ssh_auth_method = sshAuthMethod;
        
        if (sshAuthMethod === 'password') {
          if (sshPassword) payload.ssh_password = sshPassword;
        } else if (sshAuthMethod === 'private_key' && sshPrivateKeyFile) {
          payload.ssh_private_key = await fileToBase64(sshPrivateKeyFile);
        }
        
        const parsedLocalPort = localPort && localPort !== 'Auto' ? Number(localPort) : 'Auto';
        if (parsedLocalPort !== connection.local_port) {
          payload.local_port = parsedLocalPort;
        }
        
        if (sshKeyPassphrase) {
          payload.ssh_key_passphrase = sshKeyPassphrase;
        }
      } else if (securityType === 'none' && connection.security_type === 'ssh') {
        // Removing SSH
        payload.security_type = 'none';
      }

      const response = await databaseService.updateDatabaseConnection(payload, projectId as string);

      if (response.success) {
        toast.success('Database connection updated successfully');
        await onSave();
      } else {
        const errorMessage = response.error || 'Failed to update database connection. Please check your connection details and try again.';
        toast.error(errorMessage);
        shouldClose = false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to update database connection: ${errorMessage}`);
      shouldClose = false;
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
    setSecurityType('none');
    setSslMode('require');
    setCaCertificateFile(null);
    setClientCertificateFile(null);
    setClientPrivateKeyFile(null);
    setSslKeyPassphrase('');
    setShowSslPassphrase(false);
    setSshHost('bastion.example.com');
    setSshPort('22');
    setSshUsername('ec2-user');
    setSshAuthMethod('private_key');
    setSshPrivateKeyFile(null);
    setSshKeyPassphrase('');
    setShowSshKeyPassphrase(false);
    setSshPassword('');
    setShowSshPassword(false);
    setLocalPort('Auto');
    onClose();
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper function to calculate file size from base64 string
  const getBase64FileSize = (base64String: string | undefined): number => {
    if (!base64String) return 0;
    // Base64 encoding increases size by ~33%, so actual size is base64 length * 3/4
    // Also subtract padding characters (=)
    const padding = (base64String.match(/=/g) || []).length;
    return Math.floor((base64String.length * 3) / 4) - padding;
  };

  // File upload handlers (UI only, no actual file handling)
  const handleFileUpload = (setter: (value: File | null) => void, accept: string) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setter(file);
      } else {
        setter(null);
      }
    };
  };

  // Helper function to convert File object to base64 string
  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          // Extract base64 from data URL (format: data:...;base64,<base64-content>)
          const base64Content = dataUrl.split(',')[1];
          resolve(base64Content);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  // Helper function to save File object to temp location and get path (for test connection)
  const saveFileToTemp = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          // Extract base64 from data URL (format: data:...;base64,<base64-content>)
          const base64Content = dataUrl.split(',')[1];
          
          // Get Electron API
          const electronAPI = (window as any).electronAPI;
          if (!electronAPI?.fs) {
            reject(new Error('Electron API not available'));
            return;
          }
          
          // Create temp file path using OS temp directory
          const timestamp = Date.now();
          const random = Math.round(Math.random() * 1E9);
          const tempFileName = `db-cert-${timestamp}-${random}-${file.name}`;
          const tempFilePath = `/tmp/${tempFileName}`;
          
          // Write file via IPC with base64 encoding
          const result = await electronAPI.fs.writeFile(tempFilePath, base64Content, 'base64');
          if (!result.success) {
            reject(new Error(result.error || 'Failed to save file to temp location'));
            return;
          }
          
          resolve(tempFilePath);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  };

  // Helper function to save base64 string to temp file (for existing certificates)
  const saveBase64ToTemp = async (base64Content: string | undefined, filename: string): Promise<string | undefined> => {
    if (!base64Content) return undefined;
    
    try {
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI?.fs) {
        console.error('Electron API not available');
        return undefined;
      }
      
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const tempFilePath = `/tmp/rikkei-db-certs-${timestamp}-${random}-${filename}.pem`;
      
      const result = await electronAPI.fs.writeFile(tempFilePath, base64Content, 'base64');
      if (!result.success) {
        console.error(`Failed to write ${filename} to temp file:`, result.error);
        return undefined;
      }
      
      return tempFilePath;
    } catch (error) {
      console.error(`Failed to write ${filename} to temp file:`, error);
      return undefined;
    }
  };

  return (
    <div className="cc-modal-overlay">
      <div className="cc-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="cc-modal-header">
          <h2 className="cc-modal-title">Update Database Connection</h2>
          <button className="cc-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="cc-modal-instructions">Update connection details below.</p>

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
                Password (leave blank to keep current)
                <Tooltip text="Leave blank to keep the current password, or enter a new password to change it." />
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

          {/* Security Section */}
          <div className="cc-security-section">
            <div className="cc-security-header">
              <label className="cc-checkbox-label">
                <input
                  type="checkbox"
                  className="cc-checkbox"
                  checked={securityType !== 'none'}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSecurityType('ssl');
                    } else {
                      setSecurityType('none');
                    }
                  }}
                />
                <span className="cc-checkbox-text">Security (Optional)</span>
              </label>
            </div>

            {securityType !== 'none' && (
              <div className="cc-security-options">
                <div className="cc-radio-group">
                  <label className="cc-radio-label">
                    <input
                      type="radio"
                      name="security-type"
                      className="cc-radio"
                      checked={securityType === 'ssl'}
                      onChange={() => setSecurityType('ssl')}
                    />
                    <span>Enable SSL / TLS</span>
                  </label>
                  <label className="cc-radio-label">
                    <input
                      type="radio"
                      name="security-type"
                      className="cc-radio"
                      checked={securityType === 'ssh'}
                      onChange={() => setSecurityType('ssh')}
                    />
                    <span>Connect via SSH Tunnel</span>
                  </label>
                </div>

                {/* SSL/TLS Fields */}
                {securityType === 'ssl' && (
                  <div className="cc-ssl-fields">
                    <div className="cc-form-group">
                      <label htmlFor="sslMode" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        SSL Mode <span className="cc-required">*</span>
                        <Tooltip text="SSL connection mode: disable (no SSL), allow (try non-SSL first, fallback to SSL), prefer (try SSL first, fallback to non-SSL), require (use SSL but don't verify), verify-ca (verify CA certificate), verify-full (verify full certificate chain)" />
                      </label>
                      <select
                        id="sslMode"
                        className="cc-form-select"
                        value={sslMode}
                        onChange={(e) => setSslMode(e.target.value)}
                      >
                        <option value="disable">disable - No SSL/TLS encryption</option>
                        <option value="allow">allow - Try non-SSL first, fallback to SSL if fails</option>
                        <option value="prefer">prefer - Try SSL first, fallback to non-SSL if fails</option>
                        <option value="require">require - Use SSL but don't verify certificate</option>
                        <option value="verify-ca">verify-ca - Verify CA certificate (requires CA certificate)</option>
                        <option value="verify-full">verify-full - Verify full certificate chain including hostname (requires CA certificate)</option>
                      </select>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">CA Certificate</label>
                      <div className="cc-file-upload-wrapper">
                        <input
                          type="file"
                          id="caCertificate"
                          accept=".pem,.crt"
                          className="cc-file-input"
                          onChange={handleFileUpload(setCaCertificateFile, '.pem,.crt')}
                        />
                        <label htmlFor="caCertificate" className="cc-file-upload-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Upload .pem / .crt</span>
                        </label>
                        {caCertificateFile ? (
                          <div className="cc-file-name-display">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="cc-file-name">{caCertificateFile.name}</span>
                            <button
                              type="button"
                              className="cc-file-remove-btn"
                              onClick={() => setCaCertificateFile(null)}
                              aria-label="Remove file"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        ) : existingCaCertificate ? (
                          <div className="cc-file-name-display" style={{ opacity: 0.7 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="cc-file-name">
                              CA Certificate ({formatFileSize(getBase64FileSize(existingCaCertificate))}) - already uploaded
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">Client Certificate</label>
                      <div className="cc-file-upload-wrapper">
                        <input
                          type="file"
                          id="clientCertificate"
                          accept=".pem,.crt"
                          className="cc-file-input"
                          onChange={handleFileUpload(setClientCertificateFile, '.pem,.crt')}
                        />
                        <label htmlFor="clientCertificate" className="cc-file-upload-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Upload .pem / .crt</span>
                        </label>
                        {clientCertificateFile ? (
                          <div className="cc-file-name-display">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="cc-file-name">{clientCertificateFile.name}</span>
                            <button
                              type="button"
                              className="cc-file-remove-btn"
                              onClick={() => setClientCertificateFile(null)}
                              aria-label="Remove file"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        ) : existingClientCertificate ? (
                          <div className="cc-file-name-display" style={{ opacity: 0.7 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="cc-file-name">
                              Client Certificate ({formatFileSize(getBase64FileSize(existingClientCertificate))}) - already uploaded
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">Client Private Key</label>
                      <div className="cc-file-upload-wrapper">
                        <input
                          type="file"
                          id="clientPrivateKey"
                          accept=".pem,.key"
                          className="cc-file-input"
                          onChange={handleFileUpload(setClientPrivateKeyFile, '.pem,.key')}
                        />
                        <label htmlFor="clientPrivateKey" className="cc-file-upload-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span>Upload .pem / .key</span>
                        </label>
                        {clientPrivateKeyFile ? (
                          <div className="cc-file-name-display">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="cc-file-name">{clientPrivateKeyFile.name}</span>
                            <button
                              type="button"
                              className="cc-file-remove-btn"
                              onClick={() => setClientPrivateKeyFile(null)}
                              aria-label="Remove file"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        ) : existingClientPrivateKey ? (
                          <div className="cc-file-name-display" style={{ opacity: 0.7 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="cc-file-name">
                              Client Private Key ({formatFileSize(getBase64FileSize(existingClientPrivateKey))}) - already uploaded
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="cc-form-group">
                      <label htmlFor="sslKeyPassphrase" className="cc-form-label">Key Passphrase (optional)</label>
                      <div className="cc-password-wrapper">
                        <input
                          id="sslKeyPassphrase"
                          type={showSslPassphrase ? 'text' : 'password'}
                          className="cc-form-input"
                          value={sslKeyPassphrase}
                          onChange={(e) => setSslKeyPassphrase(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="cc-password-toggle"
                          onClick={() => setShowSslPassphrase((prev) => !prev)}
                          aria-label={showSslPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                        >
                          <EyeIcon visible={showSslPassphrase} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SSH Tunnel Fields */}
                {securityType === 'ssh' && (
                  <div className="cc-ssh-fields">
                    <div className="cc-form-row">
                      <div className="cc-form-group">
                        <label htmlFor="sshHost" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          SSH Host <span className="cc-required">*</span>
                        </label>
                        <input
                          id="sshHost"
                          type="text"
                          className="cc-form-input"
                          value={sshHost}
                          onChange={(e) => setSshHost(e.target.value)}
                          placeholder="bastion.example.com"
                        />
                      </div>
                      <div className="cc-form-group">
                        <label htmlFor="sshPort" className="cc-form-label">SSH Port</label>
                        <input
                          id="sshPort"
                          type="text"
                          className="cc-form-input"
                          value={sshPort}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*$/.test(value)) {
                              setSshPort(value);
                            }
                          }}
                          placeholder="22"
                        />
                      </div>
                    </div>

                    <div className="cc-form-group">
                      <label htmlFor="sshUsername" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        SSH Username <span className="cc-required">*</span>
                      </label>
                      <input
                        id="sshUsername"
                        type="text"
                        className="cc-form-input"
                        value={sshUsername}
                        onChange={(e) => setSshUsername(e.target.value)}
                        placeholder="ec2-user"
                      />
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">Authentication:</label>
                      <div className="cc-radio-group">
                        <label className="cc-radio-label">
                          <input
                            type="radio"
                            name="ssh-auth"
                            className="cc-radio"
                            checked={sshAuthMethod === 'private_key'}
                            onChange={() => setSshAuthMethod('private_key')}
                          />
                          <span>Private Key (PEM)</span>
                        </label>
                        <label className="cc-radio-label">
                          <input
                            type="radio"
                            name="ssh-auth"
                            className="cc-radio"
                            checked={sshAuthMethod === 'password'}
                            onChange={() => setSshAuthMethod('password')}
                          />
                          <span>Password</span>
                        </label>
                      </div>
                    </div>

                    {sshAuthMethod === 'private_key' && (
                      <>
                        <div className="cc-form-group">
                          <label className="cc-form-label">SSH Private Key</label>
                          <div className="cc-file-upload-wrapper">
                            <input
                              type="file"
                              id="sshPrivateKey"
                              accept=".pem"
                              className="cc-file-input"
                              onChange={handleFileUpload(setSshPrivateKeyFile, '.pem')}
                            />
                            <label htmlFor="sshPrivateKey" className="cc-file-upload-btn">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>Upload .pem</span>
                            </label>
                            {sshPrivateKeyFile ? (
                              <div className="cc-file-name-display">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="cc-file-name">{sshPrivateKeyFile.name}</span>
                                <button
                                  type="button"
                                  className="cc-file-remove-btn"
                                  onClick={() => setSshPrivateKeyFile(null)}
                                  aria-label="Remove file"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              </div>
                            ) : existingSshPrivateKey ? (
                              <div className="cc-file-name-display" style={{ opacity: 0.7 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <span className="cc-file-name">
                                  SSH Private Key ({formatFileSize(getBase64FileSize(existingSshPrivateKey))}) - already uploaded
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="cc-form-group">
                          <label htmlFor="sshKeyPassphrase" className="cc-form-label">Key Passphrase (optional)</label>
                          <div className="cc-password-wrapper">
                            <input
                              id="sshKeyPassphrase"
                              type={showSshKeyPassphrase ? 'text' : 'password'}
                              className="cc-form-input"
                              value={sshKeyPassphrase}
                              onChange={(e) => setSshKeyPassphrase(e.target.value)}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              className="cc-password-toggle"
                              onClick={() => setShowSshKeyPassphrase((prev) => !prev)}
                              aria-label={showSshKeyPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                            >
                              <EyeIcon visible={showSshKeyPassphrase} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {sshAuthMethod === 'password' && (
                      <div className="cc-form-group">
                        <label htmlFor="sshPassword" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          SSH Password <span className="cc-required">*</span>
                        </label>
                        <div className="cc-password-wrapper">
                          <input
                            id="sshPassword"
                            type={showSshPassword ? 'text' : 'password'}
                            className="cc-form-input"
                            value={sshPassword}
                            onChange={(e) => setSshPassword(e.target.value)}
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            className="cc-password-toggle"
                            onClick={() => setShowSshPassword((prev) => !prev)}
                            aria-label={showSshPassword ? 'Hide password' : 'Show password'}
                          >
                            <EyeIcon visible={showSshPassword} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="cc-ssh-info">
                      <div className="cc-divider"></div>
                      <p className="cc-info-text">Database Host will be accessed via SSH</p>
                    </div>

                    <div className="cc-form-group">
                      <label htmlFor="localPort" className="cc-form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Advanced: Local Port
                      </label>
                      <input
                        id="localPort"
                        type="text"
                        className="cc-form-input"
                        value={localPort}
                        onChange={(e) => setLocalPort(e.target.value)}
                        placeholder="Auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div className={`cc-test-result ${testResult.success ? 'cc-test-result-success' : 'cc-test-result-error'}`}>
              <div className="cc-test-result-icon">
                {testResult.success ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="cc-test-result-content">
                <div className="cc-test-result-title">
                  {testResult.success ? 'Connection Test Successful' : 'Connection Test Failed'}
                </div>
                <div className="cc-test-result-message">
                  {testResult.success ? (testResult.message || 'Connection established successfully') : (testResult.error || 'Connection test failed')}
                </div>
              </div>
            </div>
          )}

          <div className="cc-modal-actions">
            <button type="button" className="cc-btn cc-btn-cancel" onClick={handleClose}>Cancel</button>
            <button 
              type="button" 
              className="cc-btn cc-btn-test" 
              onClick={handleTestConnection}
              disabled={!isFormValid || isTesting || isSaving}
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

export default UpdateConnection;


