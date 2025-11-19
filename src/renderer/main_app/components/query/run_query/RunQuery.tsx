import React, { useState, useEffect, useMemo } from 'react';
import './RunQuery.css';
import { VariableService } from '../../../services/variables';
import { toast } from 'react-toastify';

interface RunQueryProps {
  isOpen: boolean;
  sql?: string;
  queryName?: string;
  items: Array<Record<string, unknown>>;
  onClose: () => void;
  projectId?: string;
  statementId?: string;
}

const RunQuery: React.FC<RunQueryProps> = ({ isOpen, sql, queryName, items, onClose, projectId, statementId }) => {
  if (!isOpen) return null;
  const [isVarOpen, setIsVarOpen] = useState(false);
  const [origName, setOrigName] = useState('');
  const [customName, setCustomName] = useState('');
  const [val, setVal] = useState('');

  const formatDisplayValue = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object Object]';
      }
    }
    return String(value);
  };

  const headers = useMemo(() => {
    if (!items?.length) return [];
    return Object.keys(items[0]);
  }, [items]);

  const openAddVar = (name: string, value: string) => {
    setOrigName(name);
    setCustomName('');
    setVal(value);
    setIsVarOpen(true);
  };
  
  const handleSaveVar = async () => {
    try {
      if (!projectId || !statementId) {
        toast.error('Missing project or statement');
        return;
      }
      if (!customName.trim()) {
        toast.error('Custom name is required');
        return;
      }
      const svc = new VariableService();
      const resp = await svc.createVariable({
        project_id: projectId,
        statement_id: statementId,
        user_defined_name: customName.trim(),
        original_name: origName,
        value: val,
      });
      if (resp.success) {
        toast.success('Variable saved');
        setIsVarOpen(false);
      } else {
        toast.error('Failed to save variable. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to save variable. Please try again.');
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="rqr-modal-overlay" onClick={onClose}>
      <div className="rqr-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="rqr-modal-header">
          <h2 className="rqr-modal-title">{queryName || 'Run query results'}</h2>
          <button className="rqr-modal-close-btn" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="rqr-section">
          <div className="rqr-label">SQL Statement:</div>
          <input className="rqr-sql" value={sql || ''} readOnly />
        </div>

        {headers.length ? (
          <div className="rqr-table-card">
            <div className="rqr-table-wrapper">
              <table className="rqr-table">
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {headers.map((header) => {
                        const cellValue = row[header];
                        const displayValue = formatDisplayValue(cellValue);
                        return (
                          <td key={header}>
                            <div className="rqr-cell">
                              <span className="rqr-cell-value">{displayValue}</span>
                              <button
                                className="rqr-add"
                                onClick={() => openAddVar(header, displayValue)}
                              >
                                + Add
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rqr-table-empty">No data to display</div>
        )}

        <div className="rqr-modal-actions">
          <button className="rqr-btn rqr-btn-close" onClick={onClose}>Close</button>
        </div>
      </div>

      {isVarOpen && (
        <div className="rqr-var-overlay" onClick={() => setIsVarOpen(false)}>
          <div className="rqr-var-container" onClick={(e) => e.stopPropagation()}>
            <div className="rqr-var-header">
              <h3 className="rqr-var-title">Add Variable</h3>
              <button className="rqr-var-close" onClick={() => setIsVarOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="rqr-var-body">
              <div className="rqr-var-group">
                <label className="rqr-var-label">Original name</label>
                <input className="rqr-var-input readonly" value={origName} readOnly />
              </div>
              <div className="rqr-var-group">
                <label className="rqr-var-label">Custom name</label>
                <input className="rqr-var-input" placeholder="e.g. user_id" value={customName} onChange={(e) => setCustomName(e.target.value)} />
              </div>
              <div className="rqr-var-group">
                <label className="rqr-var-label">Value</label>
                <input className="rqr-var-input readonly" value={val} readOnly />
              </div>
            </div>
            <div className="rqr-var-actions">
              <button className="rqr-btn rqr-btn-close" onClick={() => setIsVarOpen(false)}>Cancel</button>
              <button className="rqr-btn rqr-btn-save" onClick={handleSaveVar}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunQuery;


