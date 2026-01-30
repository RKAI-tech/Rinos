import React, { useEffect, useState } from 'react';
import { Action, Connection, Statement } from '../../../../types/actions';
import { StatementService } from '../../../../services/statements';
import { apiRouter } from '../../../../services/baseAPIRequest';
import QueryResultTable from '../../query_result/QueryResultTable';
import { decryptObject } from '../../../../services/encryption';
import '../../ActionDetailModal.css';
import { logErrorAndGetFriendlyMessage } from '../../../../../shared/utils/friendlyError';

const statementService = new StatementService();

interface ConnectionOption {
  id: string;
  label: string;
}

/**
 * Xác định các trường cần mã hóa/giải mã trong DatabaseConnection
 * Các trường không mã hóa: project_id, db_type, security_type, ssl_mode, ssh_auth_method, connection_id, port
 */
function getFieldsToEncryptForDatabaseConnection(): string[] {
  return [
    'connection_name',
    'db_name',
    'host',
    'username',
    'password',
    'ca_certificate',
    'client_certificate',
    'client_private_key',
    'ssl_key_passphrase',
    'ssh_host',
    'ssh_username',
    'ssh_private_key',
    'ssh_key_passphrase',
    'ssh_password',
    'local_port'
  ];
}

interface DatabaseExecutionActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizeDatabaseExecutionAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Preserve action_datas as is, but ensure statement structure is correct
  cloned.action_datas = (source.action_datas || []).map(ad => {
    if (ad.statement) {
      const queryText = (ad.statement as any).statement_text || ad.statement.query || '';
      return {
        ...ad,
        statement: {
          ...ad.statement,
          query: queryText,
          statement_text: queryText, // Keep both for compatibility
        } as Statement,
      };
    }
    return ad;
  });

  return cloned;
};

const DatabaseExecutionActionDetail: React.FC<DatabaseExecutionActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionMap, setConnectionMap] = useState<Record<string, Connection>>({});
  const [isLoadingConns, setIsLoadingConns] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [isRunningQuery, setIsRunningQuery] = useState(false);
  const [queryResultData, setQueryResultData] = useState<any[]>([]);
  const [queryResultPreview, setQueryResultPreview] = useState<string>('');
  const [queryError, setQueryError] = useState<string>('');
  const [queryStatus, setQueryStatus] = useState<string>('');

  // Load connections on mount
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
          let rawConns: Connection[] = (resp as any).data.connections;

          // Decrypt connections if needed
          const projectIdStr = String(projectId);
          try {
            const encryptionKey = await (window as any).encryptionStore?.getKey?.(projectIdStr);
            if (encryptionKey) {
              const fieldsToDecrypt = getFieldsToEncryptForDatabaseConnection();
              rawConns = await Promise.all(
                rawConns.map(async (connection) => {
                  try {
                    return await decryptObject(connection, encryptionKey, fieldsToDecrypt);
                  } catch (error) {
                    // Keep original connection if decryption fails (backward compatibility)
                    return connection;
                  }
                })
              );
            }
          } catch (error) {
            // Keep original response if decryption fails (backward compatibility)
          }

          const opts: ConnectionOption[] = rawConns.map((c: any) => ({
            id: c.connection_id,
            label: `${c.connection_name} (${String(c.db_type).toUpperCase()} • ${c.host}:${c.port})`
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
    loadConnections();
  }, []);

  // Load current values from draft
  useEffect(() => {
    const statementData = (draft.action_datas || []).find(ad => ad.statement)?.statement;
    if (statementData) {
      const connId = statementData.connection?.connection_id || '';
      const queryText = (statementData as any).statement_text || statementData.query || '';
      setSelectedConnectionId(connId);
      setQuery(queryText);
    } else {
      setSelectedConnectionId('');
      setQuery('');
    }
    // Clear query results when draft changes
    setQueryResultData([]);
    setQueryResultPreview('');
    setQueryError('');
    setQueryStatus('');
  }, [draft]);

  const handleConnectionChange = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    const connection = connectionMap[connectionId];
    if (connection) {
      updateDraft(prev => {
        const next = { ...prev } as Action;
        const actionDatas = [...(next.action_datas || [])];
        let foundIndex = actionDatas.findIndex(ad => ad.statement !== undefined);
        if (foundIndex === -1) {
          actionDatas.push({ statement: {} as Statement });
          foundIndex = actionDatas.length - 1;
        }
        actionDatas[foundIndex] = {
          ...actionDatas[foundIndex],
          statement: {
            ...(actionDatas[foundIndex].statement || {}),
            connection: connection,
            query: query || (actionDatas[foundIndex].statement as any)?.statement_text || (actionDatas[foundIndex].statement as any)?.query || '',
          } as Statement,
        };
        next.action_datas = actionDatas;
        return next;
      });
    }
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      let foundIndex = actionDatas.findIndex(ad => ad.statement !== undefined);
      if (foundIndex === -1) {
        actionDatas.push({ statement: {} as Statement });
        foundIndex = actionDatas.length - 1;
      }
      const currentStatement = actionDatas[foundIndex].statement || {} as Statement;
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        statement: {
          ...currentStatement,
          query: newQuery,
          statement_text: newQuery, // Keep both for compatibility
          connection: currentStatement.connection || (actionDatas[foundIndex].statement as any)?.connection,
        } as Statement,
      };
      next.action_datas = actionDatas;
      return next;
    });
  };

  const handleRunQuery = async () => {
    if (!selectedConnectionId || !query.trim()) return;
    
    try {
      setIsRunningQuery(true);
      setQueryError('');
      setQueryStatus('Executing query...');
      
      // Get projectId from browserAPI
      const projectId = await (window as any).browserAPI?.browser?.getProjectId?.();
      const resp = await statementService.runWithoutCreate({ 
        connection_id: selectedConnectionId, 
        query: query.trim() 
      }, projectId);
      
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
      const message = logErrorAndGetFriendlyMessage(
        '[DatabaseExecutionActionDetail] runQuery',
        error,
        'Query execution failed. Please try again.'
      );
      setQueryResultData([]);
      setQueryResultPreview('');
      setQueryError(message);
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

  return (
    <>
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">General</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.action_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
        </div>
      </div>

      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">Database Execution</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">
              Connection <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              className="rcd-action-detail-input"
              value={selectedConnectionId}
              onChange={(e) => handleConnectionChange(e.target.value)}
              disabled={isLoadingConns}
            >
              <option value="" disabled>
                {isLoadingConns ? 'Loading...' : 'Select a connection'}
              </option>
              {connections.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <label className="rcd-action-detail-kv-label">
              SQL Query <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="rcd-action-detail-input"
              style={{
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'monospace',
              }}
              rows={4}
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM users LIMIT 10;"
            />
          </div>

          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <button
              type="button"
              className="rcd-action-detail-btn"
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                opacity: (!selectedConnectionId || !query.trim() || isRunningQuery) ? 0.5 : 1,
                cursor: (!selectedConnectionId || !query.trim() || isRunningQuery) ? 'not-allowed' : 'pointer',
              }}
              disabled={!selectedConnectionId || !query.trim() || isRunningQuery}
              onClick={handleRunQuery}
            >
              {isRunningQuery ? 'Running...' : 'Run Query'}
            </button>
          </div>

          {queryStatus && (
            <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
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
            <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
              <label className="rcd-action-detail-kv-label">Query Results</label>
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
      </div>
    </>
  );
};

export default DatabaseExecutionActionDetail;

