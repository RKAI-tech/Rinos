import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import './AddQuery.css';
import { DatabaseService } from '../../../services/database';
import { connectionToIpcParams } from '../../../utils/databaseConnection';

// Tooltip giống pattern tạo trong CreateConnection
const Tooltip = ({ text }: { text: string }) => (
  <div className="tooltip-container">
    <span className="tooltip-icon">?</span>
    <div className="tooltip-content">{text}</div>
  </div>
);

interface AddQueryProps {
  isOpen: boolean;
  projectId?: string;
  onClose: () => void;
  onSave: (payload: { connection_id: string; name: string; description: string; statement_text: string }) => void;
}

interface ConnectionOption { id: string; label: string; }

const AddQuery: React.FC<AddQueryProps> = ({ isOpen, projectId, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [statement, setStatement] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionMap, setConnectionMap] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Partial<Record<'name' | 'statement' | 'connection', string>>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; data?: any[]; error?: string } | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadConnections = async () => {
      if (!projectId) return;
      try {
        const svc = new DatabaseService();
        const resp = await svc.getDatabaseConnections({ project_id: projectId });
        if (resp.success && resp.data) {
          const opts = resp.data.connections.map(c => ({ id: c.connection_id, label: `${c.connection_name} (${c.db_type.toUpperCase()} • ${c.host}:${c.port})` }));
          setConnections(opts);
          if (opts.length > 0) setConnectionId(prev => prev || opts[0].id);
          
          // Store connection map for easy access
          const map: Record<string, any> = {};
          resp.data.connections.forEach(c => {
            map[c.connection_id] = c;
          });
          setConnectionMap(map);
        } else {
          setConnections([]);
          setConnectionMap({});
        }
      } catch {
        setConnections([]);
      }
    };
    if (isOpen) loadConnections();
  }, [isOpen, projectId]);

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
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestQuery = async () => {
    const newErrors: typeof errors = {};
    if (!statement.trim()) newErrors.statement = 'SQL statement is required';
    if (!connectionId) newErrors.connection = 'Database is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const connection = connectionMap[connectionId];
      if (!connection) {
        toast.error('Connection not found');
        return;
      }

      const electronAPI = (window as any).electronAPI;
      if (!electronAPI || !electronAPI.database) {
        toast.error('Database API is not available');
        return;
      }

      const ipcParams = await connectionToIpcParams(connection);
      const result = await electronAPI.database.executeQuery(ipcParams, statement.trim());

      setTestResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to test query';
      setTestResult({ success: false, error: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Query name is required';
    if (!statement.trim()) newErrors.statement = 'SQL statement is required';
    if (!connectionId) newErrors.connection = 'Database is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    onSave({ connection_id: connectionId, name: name.trim(), description: description.trim(), statement_text: statement });
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setStatement('');
    setConnectionId('');
    setErrors({});
    setTestResult(null);
    setIsTesting(false);
    onClose();
  };

  return (
    <div className="aq-modal-overlay">
      <div className="aq-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="aq-modal-header">
          <h2 className="aq-modal-title">Add Query</h2>
          <button className="aq-modal-close-btn" onClick={handleClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <p className="aq-modal-instructions">Fill in the details to add a new query.</p>

        <form onSubmit={handleSubmit} className="aq-modal-form">
          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqName" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Query Name <span className="aq-required">*</span>
              <Tooltip text="The name of this query. Must be unique within your project." />
            </label>
            <input ref={nameInputRef} id="aqName" className={`aq-form-input ${errors.name ? 'aq-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Get users"
            />
            {errors.name && <span className="aq-error-message">{errors.name}</span>}
          </div>

          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqDesc" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Description
              <Tooltip text="Optional. Describe the purpose of this query." />
            </label>
            <textarea id="aqDesc" className="aq-form-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this query"></textarea>
          </div>

          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqStmt" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              SQL Statement <span className="aq-required">*</span>
              <Tooltip text="The SQL command to execute. Please ensure correct syntax." />
            </label>
            <textarea id="aqStmt" className={`aq-form-textarea ${errors.statement ? 'aq-error' : ''}`} rows={6} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="SELECT * FROM table WHERE ..."></textarea>
            {errors.statement && <span className="aq-error-message">{errors.statement}</span>}
          </div>

          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqConn" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Database <span className="aq-required">*</span>
              <Tooltip text="Select which database connection to execute this query on." />
            </label>
            <select id="aqConn" className={`aq-form-select ${errors.connection ? 'aq-error' : ''}`} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
              {connections.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {errors.connection && <span className="aq-error-message">{errors.connection}</span>}
          </div>

          {testResult && (
            <div className={`aq-test-result ${testResult.success ? 'aq-test-success' : 'aq-test-error'}`}>
              {testResult.success ? (
                <div>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Query executed successfully</div>
                  {testResult.data && testResult.data.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {testResult.data.length} row(s) returned
                      {testResult.data.length <= 5 && (
                        <pre style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Query execution failed</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{testResult.error}</div>
                </div>
              )}
            </div>
          )}

          <div className="aq-modal-actions">
            <button type="button" className="aq-btn aq-btn-cancel" onClick={handleClose}>Cancel</button>
            <button 
              type="button" 
              className="aq-btn aq-btn-test" 
              onClick={handleTestQuery}
              disabled={!statement.trim() || !connectionId || isTesting}
            >
              {isTesting ? 'Testing...' : 'Test Query'}
            </button>
            <button type="submit" className="aq-btn aq-btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuery;


