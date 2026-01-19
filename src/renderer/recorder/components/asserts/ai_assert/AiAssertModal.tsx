import React, { useEffect, useState, useRef } from 'react';
import './AiAssertModal.css';
import { StatementService } from '../../../services/statements';
import { apiRouter } from '../../../services/baseAPIRequest';
import QueryResultTable from './QueryResultTable';
import ApiElementPanel from './api_model/ApiElementPanel';
import { Connection, ApiRequestData } from '../../../types/actions';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { executeApiRequest, validateApiRequest, convertApiRequestDataToOptions } from '../../../utils/api_request';
import { toast } from 'react-toastify';
const statementService = new StatementService();

type ElementType = 'Browser' | 'Database' | 'API';

interface AiElementItem {
  id: string;
  type: ElementType;
  // Browser fields
  selector?: string[];
  domHtml?: string;
  value?: string;
  pageIndex?: number | null;
  pageUrl?: string | null;
  pageTitle?: string | null;
  element_data?: Record<string, any>; // Element data từ browser action
  // Database fields
  connectionId?: string;
  connection?: Connection;
  query?: string;
  queryResultPreview?: string;
  queryResultData?: any[];
  // API fields
  apiRequest?: ApiRequestData;
  apiResponse?: { status: number; data: any; headers: any };
}

interface ConnectionOption { id: string; label: string }

import { SelectedPageInfo } from './api_model/ApiElementPanel';

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
  onAddBrowserElement: () => void;
  onAddDatabaseElement: () => void;
  onAddApiElement: () => void;
  onBrowserElementClear: (elementId: string) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
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
  onAddBrowserElement,
  onAddDatabaseElement,
  onAddApiElement,
  onBrowserElementClear,
  selectedPageInfo,
  onClearPage,
}) => {
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [connectionMap, setConnectionMap] = useState<Record<string, Connection>>({});
  const [isLoadingConns, setIsLoadingConns] = useState(false);
  const [isRunningQueryIdx, setIsRunningQueryIdx] = useState<number | null>(null);
  const [isSendingApiIdx, setIsSendingApiIdx] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const addMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const hasIncompleteBrowserElement = elements.some(
    (el) =>
      el.type === 'Browser' &&
      (!el.selector || el.selector.length === 0) &&
      !(el.domHtml && el.domHtml.trim())
  );
  const hasIncompleteDatabaseElement = elements.some(
    (el) =>
      el.type === 'Database' &&
      (!el.connectionId ||
        !el.query ||
        !el.query.trim() ||
        !el.queryResultData )
  );
  const hasIncompleteApiElement = elements.some(
    (el) =>
      el.type === 'API' &&
      (!el.apiResponse || !el.apiResponse.status || el.apiResponse.status === 0)
  );
  const shouldBlockNewElement = hasIncompleteBrowserElement || hasIncompleteDatabaseElement || hasIncompleteApiElement;

  useEffect(() => {
    if (!isAddMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      const wrapEl = addMenuWrapRef.current;
      const btnEl = addMenuButtonRef.current;
      if (!wrapEl) return;
      const clickedInsideMenu = wrapEl.contains(target);
      const clickedToggleBtn = btnEl ? btnEl.contains(target) : false;
      if (!clickedInsideMenu && !clickedToggleBtn) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isAddMenuOpen]);


  const getElementTypeFromDom = (html?: string): string | undefined => {
    try {
      const m = (html || '').match(/^\s*<\s*([a-zA-Z0-9-]+)/);
      return m ? m[1].toLowerCase() : undefined;
    } catch {
      return undefined;
    }
  };

  const getBrowserElementText = (item: AiElementItem): string => {
    const raw = (item.value || '').trim();
    if (raw) return raw;
    const tag = getElementTypeFromDom(item.domHtml);
    if (tag) return `<${tag}>`;
    return '(No text available)';
  };

  const renderBrowserElement = (el: AiElementItem, idx: number) => {
    const hasSelectors = !!(el.selector && el.selector.length > 0);
    const hasDom = !!(el.domHtml && el.domHtml.trim());
    const isBrowserFilled = hasSelectors || hasDom;
    return (
      <div className="aiam-browser-box">
        {!isBrowserFilled ? (
          <div style={{ padding: '16px', border: '1px dashed #cbd5f5', borderRadius: 8, background: '#f8fafc', color: '#475569' }}>
            Click on the browser to capture this element.
          </div>
        ) : (
          <>
            <div className="aiam-col">
              <div className="aiam-row">
                <label className="aiam-sub">Element text</label>
                <div className="aiam-mono">{getBrowserElementText(el)}</div>
              </div>
              {el.pageTitle && (
                <div className="aiam-row" style={{ marginTop: 8 }}>
                  <label className="aiam-sub">Page</label>
                  <div className="aiam-mono">{el.pageTitle}</div>
                </div>
              )}
            </div>
            <div className="aiam-col">
              <div className="aiam-row">
                <label className="aiam-sub">Selectors <span style={{ color: 'red' }}>*</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                  {(el.selector || []).map((sel, selIdx) => (
                    <div key={selIdx} style={{ position: 'relative', width: '100%' }}>
                      <input
                        className="aiam-input"
                        type="text"
                        value={sel}
                        onChange={(e) => {
                          const newSelectors = [...(el.selector || [])];
                          newSelectors[selIdx] = e.target.value;
                          onChangeElement(idx, (old) => ({ ...old, selector: newSelectors }));
                        }}
                        style={{ width: '100%', paddingRight: '32px' }}
                        placeholder="Enter selector"
                      />
                      <button
                        onClick={() => {
                          const newSelectors = [...(el.selector || [])];
                          newSelectors.splice(selIdx, 1);
                          onChangeElement(idx, (old) => ({ ...old, selector: newSelectors.length > 0 ? newSelectors : undefined }));
                        }}
                        style={{ 
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          padding: '4px',
                          fontSize: '16px',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Remove selector"
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#6b7280'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    className="aiam-btn"
                    onClick={() => {
                      const newSelectors = [...(el.selector || []), ''];
                      onChangeElement(idx, (old) => ({ ...old, selector: newSelectors }));
                    }}
                    style={{ 
                      alignSelf: 'flex-start',
                      padding: '6px 12px'
                    }}
                  >
                    + Add selector
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button
            className="aiam-btn"
            onClick={() => onBrowserElementClear(el.id)}
            disabled={!isBrowserFilled}
          >
            Clear element
          </button>
        </div>
      </div>
    );
  };

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
    if (isOpen) loadConnections();
  }, [isOpen]);

  if (!isOpen) return null;

  // Check if there are API elements that haven't been executed (no status)
  const hasUnrunApiElements = elements.some(el => 
    el.type === 'API' && (!el.apiResponse || !el.apiResponse.status || el.apiResponse.status === 0)
  );

  // Validation: prompt and elements are required
  const isValidPrompt = prompt && prompt.trim().length > 0;
  const hasElements = elements && elements.length > 0;
  // Kiểm tra tất cả elements đã đủ thông tin (không có incomplete element nào)
  const allElementsComplete = !hasIncompleteBrowserElement && !hasIncompleteDatabaseElement && !hasIncompleteApiElement;
  const canGenerate = isValidPrompt && hasElements && allElementsComplete;

  const handleGenerate = async () => {
    // Validate prompt
    if (!isValidPrompt) {
      toast.error('Prompt is required');
      return;
    }

    // Validate elements
    if (!hasElements) {
      toast.error('Please add at least one element');
      return;
    }

    // Validate all elements are complete
    if (hasIncompleteBrowserElement) {
      toast.error('Please capture the pending browser element before generating');
      return;
    }

    if (hasIncompleteDatabaseElement) {
      toast.error('Please complete the pending database element before generating');
      return;
    }

    if (hasIncompleteApiElement) {
      toast.error('Please run the pending API element before generating');
      return;
    }

    try {
      setIsGenerating(true);
      const result = await Promise.resolve(onSubmit());
      // Chỉ đóng khi onSubmit báo thành công (result === true)
      if (result === true) {
        onClose();
      } else {
        // Ở lại popup nếu fail hoặc không trả true
        try { toast.error('Generate failed. Please check your inputs.'); } catch {}
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

      const resp = await statementService.runWithoutCreate({ connection_id: el.connectionId, query: el.query });
      
      const data = (resp as any)?.data?.data || [];
      const preview = data.length > 0 ? JSON.stringify(data) : 'No rows';
      const firstValue = data.length > 0 ? String(Object.values(data[0])[0] ?? '') : '';
      onChangeElement(idx, (old) => ({ ...old, queryResultPreview: preview, value: firstValue, queryResultData: data }));
    } finally {
      setIsRunningQueryIdx(null);
    }
  };

  const handleSendApiRequest = async (idx: number, apiData: ApiRequestData, response?: { status: number; data: any; headers: any }) => {
    try {
      setIsSendingApiIdx(idx);
      
      // If response is already provided (from ApiElementPanel), use it directly
      // Otherwise, execute request (backward compatibility)
      if (response) {
        // Response already executed in ApiElementPanel (same as ApiRequestModal behavior)
        onChangeElement(idx, (old) => ({ 
          ...old, 
          apiRequest: apiData,
          apiResponse: response 
        }));
      } else {
        // Fallback: execute request if response not provided
        const options = convertApiRequestDataToOptions(apiData);
        const validation = validateApiRequest(options);
        if (!validation.valid) {
          toast.error(validation.error || 'Invalid API request configuration');
          return;
        }

        const apiResponse = await executeApiRequest(options);
        
        if (apiResponse.success) {
          onChangeElement(idx, (old) => ({ 
            ...old, 
            apiRequest: apiData,
            apiResponse: { status: apiResponse.status, data: apiResponse.data, headers: apiResponse.headers } 
          }));
          toast.success(`API request successful: ${apiResponse.status}`);
        } else {
          onChangeElement(idx, (old) => ({ 
            ...old, 
            apiRequest: apiData,
            apiResponse: { status: apiResponse.status || 0, data: apiResponse.error || 'Unknown error', headers: {} } 
          }));
          toast.error(`API request failed: ${apiResponse.error || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      toast.error(`API request failed: ${error.message || 'Unknown error'}`);
      onChangeElement(idx, (old) => ({ 
        ...old, 
        apiRequest: apiData,
        apiResponse: { status: 0, data: error.message || 'Unknown error', headers: {} } 
      }));
    } finally {
      setIsSendingApiIdx(null);
    }
  };

  return (
    <div className="aiam-overlay">
      <div className="aiam-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aiam-header">
          <div className="aiam-title">AI Assert</div>
          <button className="aiam-close" onClick={onClose} disabled={isGenerating}>✕</button>
        </div>

        <div className="aiam-body">
          <div className="aiam-field">
            <label className="aiam-label">Prompt <span style={{ color: 'red' }}>*</span></label>
            <textarea className="aiam-input" rows={3} placeholder="Describe what to assert..." value={prompt} onChange={(e) => onChangePrompt(e.target.value)} />
          </div>

          <div className="aiam-elements-header">
            <div className="aiam-elements-title">Elements <span style={{ color: 'red' }}>*</span></div>
            <div className="aiam-elements-actions" style={{ position: 'relative' }} ref={addMenuWrapRef}>
              <button
                className="aiam-btn"
                onClick={() => setIsAddMenuOpen(v => !v)}
                ref={addMenuButtonRef}
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
                    onClick={() => {
                        if (hasIncompleteBrowserElement) {
                          toast.warn('Please capture the pending browser element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                        if (hasIncompleteDatabaseElement) {
                          toast.warn('Please complete the pending database element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                        if (hasIncompleteApiElement) {
                          toast.warn('Please run the pending API element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                      setIsAddMenuOpen(false);
                      onAddBrowserElement();
                    }}
                  >
                    Browser
                  </button>
                  <button
                    className="aiam-btn"
                    style={{ display: 'block', width: '100%', borderRadius: 0, border: 'none', textAlign: 'left' }}
                    onClick={() => {
                        if (hasIncompleteBrowserElement) {
                          toast.warn('Please capture the pending browser element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                        if (hasIncompleteDatabaseElement) {
                          toast.warn('Please complete the pending database element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                        if (hasIncompleteApiElement) {
                          toast.warn('Please run the pending API element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                      setIsAddMenuOpen(false);
                      onAddDatabaseElement();
                    }}
                  >
                    Database
                  </button>
                  <button
                    className="aiam-btn"
                    style={{ display: 'block', width: '100%', borderRadius: 0, border: 'none', textAlign: 'left' }}
                    onClick={() => {
                        if (hasIncompleteBrowserElement) {
                          toast.warn('Please capture the pending browser element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                        if (hasIncompleteDatabaseElement) {
                          toast.warn('Please complete the pending database element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                        if (hasIncompleteApiElement) {
                          toast.warn('Please run the pending API element before adding new ones.');
                          setIsAddMenuOpen(false);
                          return;
                        }
                      setIsAddMenuOpen(false);
                      onAddApiElement();
                    }}
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
                    <span className="aiam-text">{(el.connection && (el.connection as any).connection_name ? (el.connection as any).connection_name : 'Database')}: {el.query ? String(el.query) : '(No query)'}</span>
                    <button className="aiam-close" title="Remove" onClick={() => onRemoveElement(idx)} style={{ width: 24, height: 24 }}>✕</button>
                  </div>
                )}

                {collapsedMap[el.id] && el.type === 'Browser' && (
                  <div className="aiam-mono aiam-mono-inline">
                    <span className="aiam-text">Browser: {getBrowserElementText(el)}</span>
                    <button className="aiam-close" title="Remove" onClick={() => onRemoveElement(idx)} style={{ width: 24, height: 24 }}>✕</button>
                  </div>
                )}

                {collapsedMap[el.id] && el.type === 'API' && (
                  <div className="aiam-mono aiam-mono-inline">
                    <span className="aiam-text">API: {el.apiRequest?.method ? String(el.apiRequest.method).toUpperCase() : ''} {el.apiRequest?.url ? String(el.apiRequest.url) : '(No URL)'}</span>
                    <button className="aiam-close" title="Remove" onClick={() => onRemoveElement(idx)} style={{ width: 24, height: 24 }}>✕</button>
                  </div>
                )}

                {!collapsedMap[el.id] && (
                  el.type === 'Browser' ? (
                    renderBrowserElement(el, idx)
                  ) : el.type === 'Database' ? (
                    <div className="aiam-db-box">
                      <div className="aiam-row">
                        <div className="aiam-col">
                          <label className="aiam-sub">Connection <span style={{ color: 'red' }}>*</span></label>
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
                          <label className="aiam-sub">Query <span style={{ color: 'red' }}>*</span></label>
                          <textarea
                            className="aiam-input"
                            rows={3}
                            value={el.query || ''}
                            onChange={(e) => onChangeElement(idx, (old) => ({ ...old, query: e.target.value }))}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                e.preventDefault();
                                const canRun = !!el.connectionId && !!el.query && el.query.trim();
                                if (!isRunningQueryIdx && canRun) handleRunQuery(idx);
                              }
                            }}
                            placeholder="SELECT ..."
                          />
                        </div>
                      </div>
                      <div className="aiam-row">
                        <div className="aiam-col">
                          <button
                            className="aiam-btn"
                            disabled={!el.connectionId || !el.query || !el.query.trim() || isRunningQueryIdx === idx}
                            onClick={() => handleRunQuery(idx)}
                          >
                            {isRunningQueryIdx === idx ? 'Running...' : 'Run query'}
                          </button>
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
                  ) : el.type === 'API' ? (
                    <ApiElementPanel
                      apiRequest={el.apiRequest}
                      apiResponse={el.apiResponse}
                      onChange={(data) => onChangeElement(idx, (old) => ({ ...old, apiRequest: data }))}
                      onSendRequest={async (data, response) => await handleSendApiRequest(idx, data, response)}
                      isSending={isSendingApiIdx === idx}
                      selectedPageInfo={selectedPageInfo}
                      onClearPage={onClearPage}
                    />
                  ) : null
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="aiam-footer">
          <div className="aiam-left">
            <button className="aiam-btn" onClick={onClose} disabled={isGenerating}>Cancel</button>
          </div>
          <div className="aiam-right">
            <div 
              style={{ position: 'relative', display: 'inline-block' }}
              onMouseEnter={() => !canGenerate && setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <button 
                className="aiam-btn aiam-primary" 
                disabled={isGenerating || !canGenerate} 
                onClick={handleGenerate}
                style={{ 
                  position: 'relative',
                  cursor: canGenerate ? 'pointer' : 'not-allowed',
                  opacity: canGenerate ? 1 : 0.6
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
              {!canGenerate && showTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '6px 12px',
                    backgroundColor: '#1f2937',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 1000,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                >
                  {!isValidPrompt ? 'Prompt is required' : !hasElements ? 'Please add at least one element' : hasIncompleteBrowserElement ? 'Please capture the pending browser element' : hasIncompleteDatabaseElement ? 'Please complete the pending database element' : 'Please run the pending API element'}
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: '6px solid transparent',
                      borderRight: '6px solid transparent',
                      borderTop: '6px solid #1f2937',
                    }}
                  />
                </div>
              )}
            </div>
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




