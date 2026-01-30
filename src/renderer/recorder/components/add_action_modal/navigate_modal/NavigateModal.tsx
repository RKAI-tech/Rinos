import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { browserVariableService } from '../../../services/browser_variable';
import { logErrorAndGetFriendlyMessage } from '../../../../shared/utils/friendlyError';
import { BrowserVariableListItem } from '../../../types/browser_variable';

export interface SelectedPageInfo {
  page_index: number;
  page_url: string;
  page_title: string;
}

interface NavigateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: NavigateConfirmPayload, pageInfo?: SelectedPageInfo) => void;
  selectedPageInfo?: SelectedPageInfo | null;
  onClearPage?: () => void;
  projectId?: string;
}

export type NavigateInputMode = 'manual' | 'browser_variable';

export type NavigateConfirmPayload =
  | { mode: 'manual'; url: string }
  | { mode: 'browser_variable'; selectedVariableId: string; selectedVariableName?: string };

const isLikelyUrl = (text: string): boolean => {
  const t = text.trim();
  if (!t) return false;
  // Allow without protocol but must contain at least a dot or a slash
  return /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+.*$/.test(t) || /^(https?:\/\/)?\/?[\w.-]/.test(t);
};

const NavigateModal: React.FC<NavigateModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  selectedPageInfo,
  onClearPage,
  projectId
}) => {
  const [input, setInput] = useState<string>('');
  const [inputMode, setInputMode] = useState<NavigateInputMode>('manual');
  const [browserVariables, setBrowserVariables] = useState<BrowserVariableListItem[]>([]);
  const [selectedVariableId, setSelectedVariableId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setInputMode('manual');
      setSelectedVariableId('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPageInfo) {
      toast.success('Page selected successfully');
    }
  }, [selectedPageInfo]);

  // Auto-focus on input when modal opens
  useEffect(() => {
    if (isOpen && urlInputRef.current) {
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const resp = await browserVariableService.getBrowserVariablesByProject(projectId);
        if (resp.success && resp.data) {
          setBrowserVariables(resp.data.items || []);
        } else {
          setBrowserVariables([]);
          const message = logErrorAndGetFriendlyMessage(
            '[NavigateModal] loadBrowserVariables',
            resp.error,
            'Failed to load browser variables. Please try again.'
          );
          setError(message);
        }
      } catch (e) {
        const message = logErrorAndGetFriendlyMessage(
          '[NavigateModal] loadBrowserVariables',
          e,
          'Failed to load browser variables. Please try again.'
        );
        setError(message);
        setBrowserVariables([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const selectedBrowserVariable = browserVariables.find(v => v.browser_variable_id === selectedVariableId);
  const normalized = input.trim();
  const valid = isLikelyUrl(normalized);
  const hasSelectedPage = !!selectedPageInfo;
  const isManualMode = inputMode === 'manual';
  const hasSelectedVariable = !!selectedVariableId;
  const disabled = isManualMode ? (!valid || !hasSelectedPage) : (!hasSelectedVariable || !hasSelectedPage);

  const submit = () => {
    if (!hasSelectedPage) {
      toast.warning('Please select a page first');
      return;
    }
    if (isManualMode) {
      if (!valid) {
        toast.warning('Please enter a valid URL');
        return;
      }
      const url = normalized.startsWith('http') ? normalized : `https://${normalized}`;
      onConfirm({ mode: 'manual', url }, selectedPageInfo || undefined);
    } else {
      if (!hasSelectedVariable) {
        toast.warning('Please select a browser variable');
        return;
      }
      onConfirm({
        mode: 'browser_variable',
        selectedVariableId,
        selectedVariableName: selectedBrowserVariable?.name,
      }, selectedPageInfo || undefined);
    }
    onClose();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isManualMode) {
        if (!valid) {
          toast.warning('Please enter a valid URL');
          return;
        }
        if (!hasSelectedPage) {
          toast.warning('Please select a page first');
          return;
        }
        const url = normalized.startsWith('http') ? normalized : `https://${normalized}`;
        onConfirm({ mode: 'manual', url }, selectedPageInfo || undefined);
        onClose();
      }
    }
  };

  const handleClearPage = () => {
    onClearPage?.();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        style={{ 
          background: '#fff', 
          borderRadius: 12, 
          width: 420, 
          maxWidth: '92vw', 
          minWidth: 320,
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Navigate</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Page</label>
            {!selectedPageInfo && (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: 8,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#f59e0b" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span style={{ fontSize: 13, color: '#92400e' }}>
                  Please click on an element on the screen to select the page
                </span>
              </div>
            )}
            {selectedPageInfo ? (
              <div style={{ 
                border: '1px solid #d1d5db', 
                borderRadius: 8, 
                padding: '12px',
                backgroundColor: '#f9fafb',
                marginBottom: 8
              }}>
                <div style={{ fontSize: 13, color: '#111827', fontWeight: 500, marginBottom: 4 }}>
                  {selectedPageInfo.page_title || 'Untitled Page'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, wordBreak: 'break-all' }}>
                  {selectedPageInfo.page_url}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  Page Index: {selectedPageInfo.page_index}
                </div>
                <button
                  onClick={handleClearPage}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 12,
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>URL Source</label>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="navigate-input-mode"
                  checked={inputMode === 'manual'}
                  onChange={() => {
                    setInputMode('manual');
                    setSelectedVariableId('');
                  }}
                />
                Manual input
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="navigate-input-mode"
                  checked={inputMode === 'browser_variable'}
                  onChange={() => {
                    setInputMode('browser_variable');
                    setInput('');
                  }}
                />
                Browser variable
              </label>
            </div>

            {inputMode === 'manual' ? (
              <input
                ref={urlInputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://example.com or example.com"
                style={{ 
                  width: '100%', 
                  padding: '10px 12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: 8, 
                  fontSize: 14,
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <>
                <select
                  value={selectedVariableId}
                  onChange={(e) => setSelectedVariableId(e.target.value)}
                  disabled={isLoading || !!error || !projectId}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#111827',
                    background: '#fff',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="" disabled>
                    {projectId
                      ? (isLoading ? 'Loading...' : (error ? 'Failed to load browser variables' : 'Choose a browser variable...'))
                      : 'Project is required'}
                  </option>
                  {browserVariables.map((v) => (
                    <option key={v.browser_variable_id} value={v.browser_variable_id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                {error && (
                  <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>{error}</div>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f9fafb' }}>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={disabled}
            style={{ 
              background: '#3b82f6', 
              border: 'none', 
              color: '#fff', 
              borderRadius: 8, 
              padding: '8px 12px', 
              cursor: disabled ? 'not-allowed' : 'pointer', 
              opacity: disabled ? 0.5 : 1 
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavigateModal;


