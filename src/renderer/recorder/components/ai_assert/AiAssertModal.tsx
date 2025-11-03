import React, { useEffect, useMemo, useState } from 'react';
import './AiAssertModal.css';
import { StatementService } from '../../services/statements';
import { apiRouter } from '../../services/baseAPIRequest';
import QueryResultTable from './QueryResultTable';
import ApiModel from '../api_model/ApiModel';
import { Connection } from '../../types/actions';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  onSubmit: () => Promise<boolean | void> | boolean | void;
  onAddElement: () => void;
}

const AiAssertModal: React.FC<AiAssertModalProps> = ({
  isOpen,
  testcaseId,
  prompt,
  elements,
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [isApiModelOpen, setIsApiModelOpen] = useState(false);

  const toggleCollapsed = (id: string) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  

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
            // label: `${String(c.db_type).toUpperCase()} • ${c.db_name}@:${c.port}`,
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

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const result = await Promise.resolve(onSubmit());
      // Chỉ đóng khi onSubmit báo thành công (result === true)
      if (result === true) {
        onClose();
      }
    } finally {
      setIsGenerating(false);
    }
  };

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
    <div className="aiam-overlay" onClick={() => { if (!isGenerating) onClose(); }}>
      <div className="aiam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aiam-header">
          <div className="aiam-title">AI Assert</div>
          <button className="aiam-close" onClick={onClose} disabled={isGenerating}>✕</button>
        </div>

        <div className="aiam-body">
          <div className="aiam-field">
            <label className="aiam-label">Prompt</label>
            <textarea className="aiam-input" rows={3} placeholder="Describe what to assert..." value={prompt} onChange={(e) => onChangePrompt(e.target.value)} />
          </div>

          <div className="aiam-elements-header">
            <div className="aiam-elements-title">Elements</div>
            <div className="aiam-elements-actions" style={{ position: 'relative' }}>
              <button
                className="aiam-btn"
                onClick={() => setIsAddMenuOpen((v) => !v)}
              >
                Add element
              </button>
              {isAddMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '36px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    zIndex: 10,
                  }}
                >
                  <button
                    className="aiam-btn"
                    style={{ display: 'block', width: '100%', borderRadius: 0, border: 'none', textAlign: 'left' }}
                    onClick={() => { setIsAddMenuOpen(false); onAddElement(); }}
                  >
                    Database 
                  </button>
                  <button
                    className="aiam-btn"
                    style={{ display: 'block', width: '100%', borderRadius: 0, border: 'none', textAlign: 'left' }}
                    onClick={() => { setIsAddMenuOpen(false); setIsApiModelOpen(true); }}
                  >
                    API 
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="aiam-elements">
            {elements.length === 0 && (
              <div className="aiam-empty">No elements yet. Click on browser to select an element or add a new Database element.</div>
            )}

            {elements.map((el, idx) => (
              <div
                key={el.id}
                className="aiam-element-item"
                style={{
                  position: 'relative',
                  border: collapsedMap[el.id] ? 'none' : undefined,
                  borderRadius: collapsedMap[el.id] ? undefined : undefined,
                  background: collapsedMap[el.id] ? 'transparent' : undefined,
                  padding: collapsedMap[el.id] ? 0 : undefined,
                }}
              >
                {/* Collapse toggle button at top center */}
                <button
                  title={collapsedMap[el.id] ? 'Expand' : 'Collapse'}
                  onClick={() => toggleCollapsed(el.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 24,
                    height: 24,
                    borderRadius: '9999px',
                    border: '1px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    lineHeight: 1,
                    fontSize: 14,
                  }}
                >
                  {collapsedMap[el.id] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>

                {/* Close (remove) button at top-right (only when expanded) */}
                {!collapsedMap[el.id] && (
                  <button
                    title="Remove"
                    onClick={() => onRemoveElement(idx)}
                    style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, border: 'none', borderRadius: 4, background: '#f3f4f6', color: '#374151', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}

                {/* Header (hidden when collapsed) */}
                {!collapsedMap[el.id] && (
                  <div className="aiam-row aiam-row-header" style={{ cursor: 'default' }}>
                    <div className="aiam-col aiam-col-type" style={{ flex: 1 }}>
                      <label className="aiam-sub" style={{ display: 'block' }}>Type</label>
                      <input className="aiam-input aiam-disabled" value={el.type} disabled style={{ marginTop: 8, width: '100%', height: 36 }} />
                    </div>
                  </div>
                )}

                {/* Collapsed one-liner: only show "Database: query..., ✕" on a single row */}
                {collapsedMap[el.id] && el.type === 'Database' && (
                  <div className="aiam-mono aiam-mono-inline">
                    <span className="aiam-text">{(el.connection && (el.connection as any).db_name ? (el.connection as any).db_name : 'Database')}: {el.query ? String(el.query) : '(No query)'}</span>
                    <button className="aiam-close" title="Remove" onClick={() => onRemoveElement(idx)} style={{ width: 24, height: 24 }}>✕</button>
                  </div>
                )}

                {collapsedMap[el.id] && el.type === 'Browser' && (
                  <div className="aiam-mono aiam-mono-inline">
                    <span className="aiam-text">Browser: {el.value ? String(el.value) : '(No text)'}</span>
                    <button className="aiam-close" title="Remove" onClick={() => onRemoveElement(idx)} style={{ width: 24, height: 24 }}>✕</button>
                  </div>
                )}

                {!collapsedMap[el.id] && (
                  el.type === 'Browser' ? (
                    <div className="aiam-browser-box" >
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
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        {/* API Model modal */}
        <ApiModel
          isOpen={isApiModelOpen}
          onClose={() => setIsApiModelOpen(false)}
          onConfirm={() => {
            // After successful API setup, add a new element below
            onAddElement();
            setIsApiModelOpen(false);
          }}
        />

        <div className="aiam-footer">
          <div className="aiam-left">
            <button className="aiam-btn" onClick={onClose} disabled={isGenerating}>Cancel</button>
          </div>
          <div className="aiam-right">
            <button className="aiam-btn aiam-primary" disabled={isGenerating} onClick={handleGenerate}>{isGenerating ? 'Generating...' : 'Generate'}</button>
          </div>
        </div>
        {isGenerating && (
          <div className="aiam-loading-overlay">
            <div className="aiam-spinner" />
            <div className="aiam-loading-text">Generating...</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiAssertModal;




