import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { browserVariableService } from '../../../services/browser_variable';
import { BrowserVariableListItem } from '../../../types/browser_variable';

export type InputMode = 'manual' | 'browser_variable';

export type InputConfirmPayload =
  | { mode: 'manual'; value: string }
  | { mode: 'browser_variable'; selectedVariableId: string; selectedVariableName?: string };

export interface SelectedElementInfo {
  selectors: string[];
  domHtml: string;
  value: string;
  element_data?: Record<string, any>;
}

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: InputConfirmPayload) => void;
  selectedElement?: SelectedElementInfo | null;
  onClearElement?: () => void;
  projectId?: string;
}

const InputModal: React.FC<InputModalProps> = ({ isOpen, onClose, onConfirm, selectedElement, onClearElement, projectId }) => {
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [browserVariables, setBrowserVariables] = useState<BrowserVariableListItem[]>([]);
  const [selectedVariableId, setSelectedVariableId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setInputMode('manual');
      setSelectedVariableId('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
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
          setError(resp.error || 'Failed to load browser variables');
        }
      } catch (e) {
        setError('Failed to load browser variables');
        setBrowserVariables([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const isManualMode = inputMode === 'manual';
  const normalized = input.trim();
  const hasSelectedVariable = !!selectedVariableId;
  const hasSelectedElement = !!selectedElement;
  const disabled = isManualMode ? (!normalized || !hasSelectedElement) : (!hasSelectedVariable || !hasSelectedElement);
  const selectedBrowserVariable = browserVariables.find(v => v.browser_variable_id === selectedVariableId);

  const submit = () => {
    if (!hasSelectedElement) {
      toast.warning('Please select an element first');
      return;
    }
    if (isManualMode) {
      if (!normalized) {
        toast.warning('Please enter a value');
        return;
      }
      onConfirm({ mode: 'manual', value: normalized });
    } else {
      if (!hasSelectedVariable) {
        toast.warning('Please select a browser variable');
        return;
      }
      onConfirm({
        mode: 'browser_variable',
        selectedVariableId,
        selectedVariableName: selectedBrowserVariable?.name,
      });
    }
    onClose();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isManualMode && normalized) {
        onConfirm({ mode: 'manual', value: normalized });
        onClose();
      }
    }
  };

  const primarySelector = selectedElement?.selectors?.[0] || '';

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
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Input</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ padding: '16px 20px', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Element</label>
            {!selectedElement ? (
              <div style={{
                padding: '12px',
                backgroundColor: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: 8,
                fontSize: 13,
                color: '#92400e',
              }}>
                Please click on an element to select it
              </div>
            ) : (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '10px',
                fontSize: 12,
                color: '#374151',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Selected element</div>
                  <div style={{ marginBottom: 4 }}>Selector: {primarySelector || 'N/A'}</div>
                  {selectedElement.value && <div>Text: {selectedElement.value}</div>}
                </div>
                <button
                  type="button"
                  onClick={onClearElement}
                  style={{
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    height: 'fit-content',
                  }}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Input mode</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="radio"
                  checked={inputMode === 'manual'}
                  onChange={() => setInputMode('manual')}
                />
                Manual input
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="radio"
                  checked={inputMode === 'browser_variable'}
                  onChange={() => setInputMode('browser_variable')}
                />
                Browser variable
              </label>
            </div>
          </div>

          {isManualMode ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Value</label>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter value to input"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>Browser variable</label>
              <select
                value={selectedVariableId}
                onChange={(e) => setSelectedVariableId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  background: '#fff',
                }}
              >
                <option value="">Select a browser variable</option>
                {browserVariables.map(v => (
                  <option key={v.browser_variable_id} value={v.browser_variable_id}>
                    {v.name}
                  </option>
                ))}
              </select>
              {isLoading && <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Loading browser variables...</div>}
              {error && <div style={{ marginTop: 8, fontSize: 12, color: '#b91c1c' }}>{error}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={disabled}
            style={{
              background: disabled ? '#d1d5db' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            Add Input
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputModal;
