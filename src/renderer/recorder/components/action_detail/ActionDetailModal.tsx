import React, { useEffect, useMemo, useState } from 'react';
import './ActionDetailModal.css';
import { Action, Element } from '../../types/actions';

interface ActionDetailModalProps {
  isOpen: boolean;
  action?: Action | null;
  onClose: () => void;
  onSave?: (updated: Action) => void;
}

const ActionDetailModal: React.FC<ActionDetailModalProps> = ({ isOpen, action, onClose, onSave }) => {
  const [draft, setDraft] = useState<Action | null>(null);

  useEffect(() => {
    if (isOpen && action) {
      // Deep clone minimal mutable fields to avoid mutating prop
      const cloned: Action = {
        ...action,
        elements: action.elements ? action.elements.map(el => ({
          selector: el.selector ? el.selector.map(s => ({ ...s })) : undefined,
          query: el.query,
          value: el.value,
          variable_name: el.variable_name,
        })) : [],
      };
      setDraft(cloned);
    } else {
      setDraft(null);
    }
  }, [isOpen, action]);

  const updateField = (key: keyof Action, value: any) => {
    setDraft(prev => prev ? { ...prev, [key]: value } as Action : prev);
  };

  const updateElement = (index: number, updater: (el: Element) => Element) => {
    setDraft(prev => {
      if (!prev) return prev;
      const elements = (prev.elements || []).map((el, idx) => idx === index ? updater({ ...el }) : el);
      return { ...prev, elements } as Action;
    });
  };

  const handleSave = () => {
    if (draft && onSave) {
      onSave(draft);
    }
    onClose();
  };

  if (!isOpen || !action || !draft) return null;

  const renderElements = () => {
    if (!draft.elements || draft.elements.length === 0) {
      return <div className="rcd-action-detail-empty">No elements</div>;
    }
    return (
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">Elements</div>
        <div className="rcd-action-detail-list">
          {draft.elements.map((el, idx) => (
            <div key={idx} className="rcd-action-detail-list-item">
              <div className="rcd-action-detail-kv"><span>Query:</span>
                <input
                  className="rcd-action-detail-input"
                  value={el.query || ''}
                  onChange={(e) => updateElement(idx, (cur) => ({ ...cur, query: e.target.value }))}
                />
              </div>
              <div className="rcd-action-detail-kv"><span>Value:</span>
                <input
                  className="rcd-action-detail-input"
                  value={el.value || ''}
                  onChange={(e) => updateElement(idx, (cur) => ({ ...cur, value: e.target.value }))}
                />
              </div>
              <div className="rcd-action-detail-kv"><span>Variable:</span>
                <input
                  className="rcd-action-detail-input"
                  value={el.variable_name || ''}
                  onChange={(e) => updateElement(idx, (cur) => ({ ...cur, variable_name: e.target.value }))}
                />
              </div>
              <div className="rcd-action-detail-kv"><span>Selector:</span>
                <input
                  className="rcd-action-detail-input"
                  value={(el.selector && el.selector[0]?.value) || ''}
                  onChange={(e) => updateElement(idx, (cur) => ({
                    ...cur,
                    selector: [{ value: e.target.value }],
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rcd-action-detail-overlay" onClick={onClose}>
      <div className="rcd-action-detail-container" onClick={(e) => e.stopPropagation()}>
        <div className="rcd-action-detail-header">
          <h2 className="rcd-action-detail-title">Action Detail</h2>
          <button className="rcd-action-detail-close" onClick={onClose} title="Close">✕</button>
        </div>
        <div className="rcd-action-detail-content">
          <div className="rcd-action-detail-section">
            <div className="rcd-action-detail-section-title">General</div>
            <div className="rcd-action-detail-grid">
              <div className="rcd-action-detail-kv"><span>Type:</span><code>{draft.action_type}</code></div>
              <div className="rcd-action-detail-kv"><span>Description:</span>
                <input
                  className="rcd-action-detail-input"
                  value={draft.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                />
              </div>
              {draft.assert_type && (
                <div className="rcd-action-detail-kv"><span>Assert:</span><code>{draft.assert_type}</code></div>
              )}
              <div className="rcd-action-detail-kv"><span>Value:</span>
                <input
                  className="rcd-action-detail-input"
                  value={draft.value || ''}
                  onChange={(e) => updateField('value', e.target.value)}
                />
              </div>
              <div className="rcd-action-detail-kv"><span>Selected:</span>
                <input
                  className="rcd-action-detail-input"
                  value={draft.selected_value || ''}
                  onChange={(e) => updateField('selected_value', e.target.value)}
                />
              </div>
              <div className="rcd-action-detail-kv"><span>Checked:</span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.checked)}
                  onChange={(e) => updateField('checked', e.target.checked)}
                />
              </div>
            </div>
          </div>

          {renderElements()}

          {draft.playwright_code && (
            <div className="rcd-action-detail-section">
              <div className="rcd-action-detail-section-title">Playwright</div>
              <textarea
                className="rcd-action-detail-code"
                value={draft.playwright_code || ''}
                onChange={(e) => updateField('playwright_code', e.target.value)}
              />
            </div>
          )}

          <div className="rcd-action-detail-footer">
            <button className="rcd-action-detail-btn" onClick={onClose}>Cancel</button>
            <button className="rcd-action-detail-btn primary" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionDetailModal;


