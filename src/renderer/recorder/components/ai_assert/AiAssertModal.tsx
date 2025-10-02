import React, { useEffect, useMemo, useState } from 'react';
import './AiAssertModal.css';
import { StatementService } from '../../services/statements';
import { apiRouter } from '../../services/baseAPIRequest';
import QueryResultTable from './QueryResultTable';
import { Connection } from '../../types/actions';

const statementService = new StatementService();

type ElementType = 'Browser' | 'Database';

interface AiElementItem {
  id: string;
  type: ElementType;
  // Browser fields
  selector?: string[];
  domHtml?: string;
  value?: string;
  // Database fields
  connectionId?: string;
  connection?: Connection;
  query?: string;
  queryResultPreview?: string;
  queryResultData?: any[];
}

interface ConnectionOption { id: string; label: string }

interface AiAssertModalProps {
  isOpen: boolean;
  testcaseId?: string | null;
  prompt: string;
  elements: AiElementItem[];
  isGenerating?: boolean;
  onChangePrompt: (v: string) => void;
  onChangeElement: (idx: number, updater: (el: AiElementItem) => AiElementItem) => void;
  onRemoveElement: (idx: number) => void;
  onClose: () => void;
  onSubmit: () => void;
  onAddElement: () => void;
}

const AiAssertModal: React.FC<AiAssertModalProps> = ({
  isOpen,
  testcaseId,
  prompt,
  elements,
  isGenerating,
  onChangePrompt,
  onChangeElement,
  onRemoveElement,
  onClose,
  onSubmit,
  onAddElement,
}) => {
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionMap, setConnectionMap] = useState<Record<string, Connection>>({});
  const [isLoadingConns, setIsLoadingConns] = useState(false);
  const [isRunningQueryIdx, setIsRunningQueryIdx] = useState<number | null>(null);

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
            label: `${String(c.db_type).toUpperCase()} • ${c.db_name}@${c.host}:${c.port}`,
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

  if (!isOpen) return null;

  const handleRunQuery = async (idx: number) => {
    try {
      setIsRunningQueryIdx(idx);
      const el = elements[idx];
      if (!el?.connectionId || !el?.query || !el.query.trim()) return;

      // console.log('Running query', el.connectionId, el.query);

      const resp = await statementService.runWithoutCreate({ connection_id: el.connectionId, query: el.query });
      
      const data = (resp as any)?.data?.data || [];
      const preview = data.length > 0 ? JSON.stringify(data) : 'No rows';
      const firstValue = data.length > 0 ? String(Object.values(data[0])[0] ?? '') : '';
      onChangeElement(idx, (old) => ({ ...old, queryResultPreview: preview, value: firstValue, queryResultData: data }));
    } finally {
      setIsRunningQueryIdx(null);
    }
  };

  return (
    <div className="aiam-overlay" onClick={onClose}>
      <div className="aiam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aiam-header">
          <div className="aiam-title">AI Assert</div>
          <button className="aiam-close" onClick={onClose}>✕</button>
        </div>

        <div className="aiam-body">
          <div className="aiam-field">
            <label className="aiam-label">Prompt</label>
            <textarea className="aiam-input" rows={3} placeholder="Describe what to assert..." value={prompt} onChange={(e) => onChangePrompt(e.target.value)} />
          </div>

          <div className="aiam-elements-header">
            <div className="aiam-elements-title">Elements</div>
            <div className="aiam-elements-actions">
              <button className="aiam-btn" onClick={onAddElement}>Add Database element</button>
              {/* Database elements are created inline by changing type */}
            </div>
          </div>

          <div className="aiam-elements">
            {elements.length === 0 && (
              <div className="aiam-empty">No elements yet. Click on browser to select an element or add a new Database element.</div>
            )}

            {elements.map((el, idx) => (
              <div key={el.id} className="aiam-element-item">
                <div className="aiam-row">
                  <div className="aiam-col aiam-col-type">
                    <label className="aiam-sub">Type</label>
                    <input className="aiam-input aiam-disabled" value={el.type} disabled />
                  </div>
                  <div className="aiam-col aiam-col-actions">
                    <button className="aiam-btn aiam-remove-btn" title="Remove" onClick={() => onRemoveElement(idx)}>
                      Remove
                    </button>
                  </div>
                </div>

                {el.type === 'Browser' ? (
                  <div className="aiam-browser-box">
                    <div className="aiam-col">
                      <div className="aiam-row">
                        <label className="aiam-sub">Element text</label>
                        <div className="aiam-mono">{el.value || '(No text available)'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aiam-db-box">
                    <div className="aiam-row">
                      <div className="aiam-col">
                        <label className="aiam-sub">Connection</label>
                        <select className="aiam-input" value={el.connectionId || ''} onChange={(e) => onChangeElement(idx, (old) => ({ ...old, connectionId: e.target.value, connection: connectionMap[e.target.value] }))}>
                          <option value="" disabled>{isLoadingConns ? 'Loading...' : 'Select a connection'}</option>
                          {connections.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="aiam-row">
                      <div className="aiam-col">
                        <label className="aiam-sub">Query</label>
                        <textarea className="aiam-input" rows={3} value={el.query || ''} onChange={(e) => onChangeElement(idx, (old) => ({ ...old, query: e.target.value }))} placeholder="SELECT ..." />
                      </div>
                    </div>
                    <div className="aiam-row">
                      <div className="aiam-col">
                        <button className="aiam-btn" disabled={!el.connectionId || !el.query || isRunningQueryIdx === idx} onClick={() => handleRunQuery(idx)}>{isRunningQueryIdx === idx ? 'Running...' : 'Run query'}</button>
                      </div>
                    </div>
                    {el.queryResultData && el.queryResultData.length > 0 && (
                      <div className="aiam-row">
                        <div className="aiam-col">
                          <label className="aiam-sub">Query Results</label>
                          <QueryResultTable data={el.queryResultData} maxHeight={200} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="aiam-footer">
          <div className="aiam-left">
            <button className="aiam-btn" onClick={onClose}>Cancel</button>
          </div>
          <div className="aiam-right">
            <button className="aiam-btn aiam-primary" disabled={isGenerating || !prompt.trim() || elements.length === 0} onClick={onSubmit}>{isGenerating ? 'Generating...' : 'Generate'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssertModal;


