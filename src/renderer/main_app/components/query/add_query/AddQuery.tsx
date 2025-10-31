import React, { useEffect, useState } from 'react';
import './AddQuery.css';
import { DatabaseService } from '../../../services/database';

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
  const [errors, setErrors] = useState<Partial<Record<'name' | 'statement' | 'connection', string>>>({});

  useEffect(() => {
    const loadConnections = async () => {
      if (!projectId) return;
      try {
        const svc = new DatabaseService();
        const resp = await svc.getDatabaseConnections({ project_id: projectId });
        if (resp.success && resp.data) {
          const opts = resp.data.connections.map(c => ({ id: c.connection_id, label: `${c.db_type.toUpperCase()} • ${c.db_name}@${c.host}:${c.port}` }));
          setConnections(opts);
          if (opts.length > 0) setConnectionId(prev => prev || opts[0].id);
        } else {
          setConnections([]);
        }
      } catch {
        setConnections([]);
      }
    };
    if (isOpen) loadConnections();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

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
    onClose();
  };

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

  return (
    <div className="aq-modal-overlay" onClick={handleClose}>
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
            <label className="aq-form-label" htmlFor="aqName">Query Name <span className="aq-required">*</span></label>
            <input id="aqName" className={`aq-form-input ${errors.name ? 'aq-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Get users"
            />
            {errors.name && <span className="aq-error-message">{errors.name}</span>}
          </div>

          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqDesc">Description</label>
            <textarea id="aqDesc" className="aq-form-textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this query"></textarea>
          </div>

          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqStmt">SQL Statement <span className="aq-required">*</span></label>
            <textarea id="aqStmt" className={`aq-form-textarea ${errors.statement ? 'aq-error' : ''}`} rows={6} value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="SELECT * FROM table WHERE ..."></textarea>
            {errors.statement && <span className="aq-error-message">{errors.statement}</span>}
          </div>

          <div className="aq-form-group">
            <label className="aq-form-label" htmlFor="aqConn">Database <span className="aq-required">*</span></label>
            <select id="aqConn" className={`aq-form-select ${errors.connection ? 'aq-error' : ''}`} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
              {connections.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            {errors.connection && <span className="aq-error-message">{errors.connection}</span>}
          </div>

          <div className="aq-modal-actions">
            <button type="button" className="aq-btn aq-btn-cancel" onClick={handleClose}>Cancel</button>
            <button type="submit" className="aq-btn aq-btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddQuery;


