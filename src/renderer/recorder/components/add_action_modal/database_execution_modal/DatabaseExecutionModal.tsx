import React, { useEffect, useState } from 'react';
import { StatementService } from '../../../services/statements';
import { apiRouter } from '../../../services/baseAPIRequest';
import QueryResultTable from '../../asserts/ai_assert/QueryResultTable';
import { Connection } from '../../../types/actions';

const statementService = new StatementService();

interface ConnectionOption { 
  id: string; 
  label: string; 
}

interface DatabaseExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (query: string, connectionId: string, connection: Connection) => void;
}

const DatabaseExecutionModal: React.FC<DatabaseExecutionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionMap, setConnectionMap] = useState<Record<string, Connection>>({});
  const [isLoadingConns, setIsLoadingConns] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [queryResultData, setQueryResultData] = useState<any[]>([]);
  const [queryResultPreview, setQueryResultPreview] = useState<string>('');
  const [connectionError, setConnectionError] = useState<string>('');
  const [queryError, setQueryError] = useState<string>('');
  const [queryStatus, setQueryStatus] = useState<string>('');

  useEffect(() => {
    const loadConnections = async () => {
      try {
        setIsLoadingConns(true);
        const projectId = await (window as any).browserAPI?.browser?.getProjectId?.();
        if (!projectId) {
          setConnections([]);
          return;
        }
        const resp = await apiRouter.request<any>('/database-connections/get_list', {
          method: 'POST',
          body: JSON.stringify({ project_id: projectId }),
        });
        if (resp.success && (resp as any).data?.connections) {
          const rawConns: Connection[] = (resp as any).data.connections;
          const opts: ConnectionOption[] = rawConns.map((c: any) => ({
            id: c.connection_id,
            label: `${String(c.db_type).toUpperCase()} • PLANE@:${c.port}`
          }));
          setConnections(opts);
          const map: Record<string, Connection> = {};
          rawConns.forEach((c: any) => {
            map[c.connection_id] = c as Connection;
          });
          setConnectionMap(map);
        } else {
          setConnections([]);
          setConnectionMap({});
        }
      } finally {
        setIsLoadingConns(false);
      }
    };
    if (isOpen) loadConnections();
  }, [isOpen]);

  const handleRunQuery = async () => {
    if (!selectedConnectionId || !query.trim()) return;
    
    try {
      setIsRunningQuery(true);
      setQueryError('');
      setQueryStatus('Executing query...');
      const resp = await statementService.runWithoutCreate({ 
        connection_id: selectedConnectionId, 
        query: query.trim() 
      });
      
      const data = (resp as any)?.data?.data || [];
      const preview = data.length > 0 ? JSON.stringify(data) : 'No rows returned';
      setQueryResultData(data);
      setQueryResultPreview(preview);
      
      // Set status based on result
      if (data.length > 0) {
        setQueryStatus(`Query executed successfully. ${data.length} row(s) returned.`);
      } else {
        setQueryStatus('Query executed successfully. No rows returned.');
      }
    } catch (error) {
      // console.error('Query execution failed:', error);
      setQueryResultData([]);
      setQueryResultPreview('');
      setQueryError(error instanceof Error ? error.message : 'Query execution failed');
      setQueryStatus('Query execution failed.');
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleConfirm = () => {
    if (!selectedConnectionId || !query.trim()) return;
    const connection = connectionMap[selectedConnectionId];
    if (connection) {
      onConfirm(query.trim(), selectedConnectionId, connection);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedConnectionId('');
    setQuery('');
    setQueryResultData([]);
    setQueryResultPreview('');
    setConnectionError('');
    setQueryError('');
    setQueryStatus('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '500px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: 0,
          }}>Database Execution</h3>
          <button 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
              color: '#6b7280',
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={handleClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        
        <div style={{
          padding: '20px 24px',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
            }}>
              Connection <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select 
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
            >
              <option value="" disabled>
                {isLoadingConns ? 'Loading...' : 'Select a connection'}
              </option>
              {connections.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px',
            }}>
              SQL Query <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea 
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                background: '#ffffff',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
              }}
              rows={4}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM users LIMIT 10;"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button 
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                opacity: (!selectedConnectionId || !query.trim() || isRunningQuery) ? 0.5 : 1,
              }}
              disabled={!selectedConnectionId || !query.trim() || isRunningQuery}
              onClick={handleRunQuery}
            >
              {isRunningQuery ? 'Running...' : 'Run Query'}
            </button>
          </div>

          {queryStatus && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                padding: '10px 12px',
                background: queryError ? '#fef2f2' : '#f0f9ff',
                border: `1px solid ${queryError ? '#fecaca' : '#bae6fd'}`,
                borderRadius: '8px',
                color: queryError ? '#dc2626' : '#0369a1',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: queryError ? '#dc2626' : '#10b981',
                }} />
                {queryStatus}
              </div>
            </div>
          )}

          {(queryResultData.length > 0 || queryResultPreview || queryError) && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
              }}>
                Query Results
              </label>
              {queryError ? (
                <div style={{
                  padding: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '14px',
                }}>
                  Error: {queryError}
                </div>
              ) : queryResultData.length > 0 ? (
                <QueryResultTable data={queryResultData} maxHeight={200} />
              ) : queryResultPreview ? (
                <div style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  color: '#0369a1',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}>
                  {queryResultPreview}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
        }}>
          <button 
            style={{
              background: 'none',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
            }}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button 
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              opacity: (!selectedConnectionId || !query.trim()) ? 0.5 : 1,
            }}
            disabled={!selectedConnectionId || !query.trim()}
            onClick={handleConfirm}
          >
            Add Action
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseExecutionModal;
