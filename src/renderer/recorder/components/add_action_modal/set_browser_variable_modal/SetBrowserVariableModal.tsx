import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { browserVariableService } from '../../../services/browser_variable';
import { BrowserVariableListItem } from '../../../types/browser_variable';

export interface SelectedElementInfo {
  selectors: string[];
  domHtml: string;
  value: string;
  element_data?: Record<string, any>;
}

interface SetBrowserVariableModalProps {
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onConfirm: (browserVariable: BrowserVariableListItem, element: SelectedElementInfo) => void;
  selectedElement?: SelectedElementInfo | null;
  onClearElement?: () => void;
}

const SetBrowserVariableModal: React.FC<SetBrowserVariableModalProps> = ({
  isOpen,
  projectId,
  onClose,
  onConfirm,
  selectedElement,
  onClearElement,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserVariables, setBrowserVariables] = useState<BrowserVariableListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');

  const selectedBrowserVariable = useMemo(
    () => browserVariables.find((c) => c.browser_variable_id === selectedId),
    [browserVariables, selectedId]
  );

  useEffect(() => {
    if (!isOpen) {
      setSelectedId('');
      setError(null);
    }
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
    if (isOpen) {
      load();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const hasSelectedElement = !!selectedElement;
  const hasSelectedVariable = !!selectedBrowserVariable;
  const disabled = !hasSelectedVariable || !hasSelectedElement;

  const handleClearElement = () => {
    onClearElement?.();
  };

  const handleConfirm = () => {
    if (!selectedBrowserVariable) {
      toast.warning('Please select a browser variable first');
      return;
    }
    if (!selectedElement) {
      toast.warning('Please select an element first');
      return;
    }
    onConfirm(selectedBrowserVariable, selectedElement);
    onClose();
  };

  const primarySelector = selectedElement?.selectors?.[0] || '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: '520px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827' }}>Set Browser Variable</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '16px 20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>
              Element <span style={{ color: '#ef4444' }}>*</span>
            </label>
            {!selectedElement && (
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
                  Please click on an element on the screen to select it
                </span>
              </div>
            )}
            {selectedElement ? (
              <div style={{ 
                border: '1px solid #d1d5db', 
                borderRadius: 8, 
                padding: '12px',
                backgroundColor: '#f9fafb',
                marginBottom: 8
              }}>
                <div style={{ fontSize: 12, color: '#111827', fontWeight: 500, marginBottom: 4 }}>
                  {primarySelector || 'No selector captured'}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                  Selectors: {selectedElement.selectors?.length || 0}
                </div>
                <button
                  onClick={handleClearElement}
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
            <label style={{ display: 'block', fontSize: 14, color: '#374151', marginBottom: 8 }}>
              Select browser variable <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={isLoading || !!error}
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
                {isLoading ? 'Loading...' : (error ? 'Failed to load browser variables' : 'Choose a browser variable...')}
              </option>
              {browserVariables.map((c) => (
                <option key={c.browser_variable_id} value={c.browser_variable_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 14, color: '#374151' }}>Name</label>
              <input
                value={selectedBrowserVariable?.name || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 14, color: '#374151' }}>Updated At</label>
              <input
                value={selectedBrowserVariable?.updated_at || ''}
                readOnly
                placeholder=""
                style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb', color: '#111827', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 14, color: '#374151' }}>Value</label>
            <textarea
              value={selectedBrowserVariable?.value || ''}
              readOnly
              placeholder=""
              style={{
                minHeight: '140px',
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#f9fafb',
                color: '#111827',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '12px',
                whiteSpace: 'pre',
                overflow: 'auto'
              }}
            />
          </div>

          {error && (
            <div style={{ color: '#b91c1c', fontSize: '12px' }}>{error}</div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f9fafb' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#6b7280',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
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
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetBrowserVariableModal;
