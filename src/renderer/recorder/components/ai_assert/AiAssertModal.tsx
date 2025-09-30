import React, { useEffect, useMemo, useState } from 'react';
import './AiAssertModal.css';
import apiRouter from '../../services/baseAPIRequest';

type ElementType = 'Browser' | 'Database';

interface AiElementItem {
  id: string;
  name: string;
  type: ElementType;
  // Browser fields
  selector?: string[];
  domHtml?: string;
  value?: string;
  // Database fields
  connectionId?: string;
  query?: string;
  queryResultPreview?: string;
}

interface ConnectionOption { id: string; label: string }

interface AiAssertModalProps {
  isOpen: boolean;
  testcaseId?: string | null;
  prompt: string;
  elements: AiElementItem[];
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
  onChangePrompt,
  onChangeElement,
  onRemoveElement,
  onClose,
  onSubmit,
  onAddElement,
}) => {
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
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
          const opts: ConnectionOption[] = (resp as any).data.connections.map((c: any) => ({
            id: c.connection_id,
            label: `${String(c.db_type).toUpperCase()} • ${c.db_name}@${c.host}:${c.port}`,
          }));
          setConnections(opts);
        } else {
          setConnections([]);
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
      const resp = await apiRouter.request<any>('/statements/run_without_create', {
        method: 'POST',
        body: JSON.stringify({ connection_id: el.connectionId, query: el.query }),
      });
      const firstRow = (resp as any)?.data?.rows?.[0] || (resp as any)?.data?.result?.rows?.[0];
      const preview = firstRow ? JSON.stringify(firstRow) : 'No rows';
      const firstValue = firstRow ? String(Object.values(firstRow)[0] ?? '') : '';
      onChangeElement(idx, (old) => ({ ...old, queryResultPreview: preview, value: firstValue }));
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
              <button className="aiam-btn" onClick={onAddElement}>Add new element</button>
              {/* Database elements are created inline by changing type */}
            </div>
          </div>

          <div className="aiam-elements">
            {elements.length === 0 && (
              <div className="aiam-empty">No elements yet. Use "Pick from Browser" or add a Database element by switching type.</div>
            )}

            {elements.map((el, idx) => (
              <div key={el.id} className="aiam-element-item">
                <div className="aiam-row">
                  <div className="aiam-col">
                    <label className="aiam-sub">Name</label>
                    <input className="aiam-input" value={el.name} onChange={(e) => onChangeElement(idx, (old) => ({ ...old, name: e.target.value }))} placeholder="Element variable name" />
                  </div>
                  <div className="aiam-col aiam-col-type">
                    <label className="aiam-sub">Type</label>
                    <select className="aiam-input" value={el.type} onChange={(e) => onChangeElement(idx, (old) => ({ ...old, type: e.target.value as ElementType }))}>
                      <option value="Browser">Browser</option>
                      <option value="Database">Database</option>
                    </select>
                  </div>
                  <div className="aiam-col aiam-col-actions">
                    <button className="aiam-icon-btn" title="Remove" onClick={() => onRemoveElement(idx)}>🗑</button>
                  </div>
                </div>

                {el.type === 'Browser' ? (
                  <div className="aiam-browser-box">
                    <div className="aiam-row">
                      <div className="aiam-col">
                        <label className="aiam-sub">Selector candidates</label>
                        <div className="aiam-mono">{(el.selector || []).join(' | ') || '(pick from browser)'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aiam-db-box">
                    <div className="aiam-row">
                      <div className="aiam-col">
                        <label className="aiam-sub">Connection</label>
                        <select className="aiam-input" value={el.connectionId || ''} onChange={(e) => onChangeElement(idx, (old) => ({ ...old, connectionId: e.target.value }))}>
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
                    {el.queryResultPreview && (
                      <div className="aiam-row">
                        <div className="aiam-col">
                          <label className="aiam-sub">Result preview</label>
                          <pre className="aiam-pre">{el.queryResultPreview}</pre>
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
            <button className="aiam-btn aiam-primary" disabled={!prompt.trim() || elements.length === 0} onClick={onSubmit}>Generate</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssertModal;


