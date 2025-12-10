import React, { useEffect, useMemo, useState } from 'react';
import './DeleteTestcasesFromSuite.css';
import { TestSuiteService } from '../../../services/testsuites';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testSuiteId?: string | null;
  onRemove?: (testcaseIds: string[]) => void | Promise<void>;
}

const DeleteTestcasesFromSuite: React.FC<Props> = ({ isOpen, onClose, testSuiteId, onRemove }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<{ id: string; name: string; tag?: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const svc = useMemo(() => new TestSuiteService(), []);

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    return it.name.toLowerCase().includes(q) || (it.tag || '').toLowerCase().includes(q);
  });

  const allSelected = filtered.length > 0 && filtered.every(it => selected.has(it.id));

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !testSuiteId) return;
      try {
        setLoading(true);
        setError(null);
        const resp = await svc.getTestCasesBySuite({ test_suite_id: testSuiteId });
        if (resp.success && resp.data) {
          const mapped = (resp.data.testcases || []).map(tc => ({ id: tc.testcase_id, name: tc.name, tag: (tc as any).tag }));
          setItems(mapped);
        } else {
          setError(resp.error || 'Failed to load testcases');
          setItems([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, testSuiteId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach(it => next.delete(it.id));
      } else {
        filtered.forEach(it => next.add(it.id));
      }
      return next;
    });
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    await onRemove(Array.from(selected));
    setSelected(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="tsuite-add-modal-overlay">
      <div className="tsuite-add-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tsuite-add-modal-header">
          <h2 className="tsuite-add-modal-title">Remove Testcases from Suite</h2>
          <button className="tsuite-add-modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '0 20px', color: '#6b7280', fontSize: 14, marginTop: 4, marginBottom: 8 }}>Select one or more testcases to remove from this suite.</div>

        <div className="tsuite-add-controls">
          <input
            className="tsuite-add-search"
            type="text"
            placeholder="Search by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ padding: '4px 20px' }}>
          <label className="tsuite-add-selectall">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            <span>Select All (filtered)</span>
          </label>
        </div>

        <div className="tsuite-add-list">
          {loading && <div className="tsuite-add-loading">Loading testcases...</div>}
          {error && !loading && <div className="tsuite-add-error">{error}</div>}
          {!loading && !error && items.filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || (it.tag || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
            <div className="tsuite-add-empty">No testcases found.</div>
          )}
          {!loading && !error && (
            <ul className="tsuite-add-items">
              {items
                .filter(it => it.name.toLowerCase().includes(search.toLowerCase()) || (it.tag || '').toLowerCase().includes(search.toLowerCase()))
                .map(it => (
                <li key={it.id} className="tsuite-add-item">
                  <label className="tsuite-add-item-row">
                    <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} />
                    <span className="tsuite-add-item-name">{it.name}</span>
                    {it.tag ? <span className="tsuite-add-item-tag">{it.tag}</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="tsuite-add-modal-actions">
          <button className="tsuite-add-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="tsuite-add-btn-save" onClick={handleRemove} disabled={selected.size === 0}>Remove Selected</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteTestcasesFromSuite;


