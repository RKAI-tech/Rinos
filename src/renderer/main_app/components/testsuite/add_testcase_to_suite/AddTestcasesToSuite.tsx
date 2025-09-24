import React, { useEffect, useMemo, useState } from 'react';
import './AddTestcasesToSuite.css';
import { TestCaseService } from '../../../services/testcases';

interface TestcaseItem {
  id: string;
  name: string;
  tag?: string;
}

interface AddTestcasesToSuiteProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testcaseIds: string[]) => void;
  projectId?: string;
}

const AddTestcasesToSuite: React.FC<AddTestcasesToSuiteProps> = ({ isOpen, onClose, onSave, projectId = '' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TestcaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const testCaseService = useMemo(() => new TestCaseService(), []);

  useEffect(() => {
    const load = async () => {
      if (!isOpen) return;
      if (!projectId) {
        setItems([]);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const resp = await testCaseService.getTestCases(projectId, 1000, 0);
        if (resp.success && resp.data) {
          const mapped: TestcaseItem[] = resp.data.testcases.map(tc => ({ id: tc.testcase_id, name: tc.name, tag: (tc as any).tag }));
          setItems(mapped);
        } else {
          setError(resp.error || 'Failed to load testcases');
          setItems([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred');
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, projectId, testCaseService]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearch('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    return it.name.toLowerCase().includes(q) || (it.tag || '').toLowerCase().includes(q);
  });

  const allSelected = filtered.length > 0 && filtered.every(it => selectedIds.has(it.id));

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        filtered.forEach(it => next.delete(it.id));
      } else {
        filtered.forEach(it => next.add(it.id));
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave(Array.from(selectedIds));
  };

  if (!isOpen) return null;

  return (
    <div className="tsuite-add-modal-overlay" onClick={onClose}>
      <div className="tsuite-add-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="tsuite-add-modal-header">
          <h2 className="tsuite-add-modal-title">Add Testcases to Suite</h2>
          
          <button className="tsuite-add-modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: '0 20px', color: '#6b7280', fontSize: 14, marginTop: 4, marginBottom: 8 }}>Select one or more testcases from this project to add to the suite.</div>

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
          {isLoading && <div className="tsuite-add-loading">Loading testcases...</div>}
          {error && !isLoading && <div className="tsuite-add-error">{error}</div>}
          {!isLoading && !error && filtered.length === 0 && (
            <div className="tsuite-add-empty">No testcases found.</div>
          )}
          {!isLoading && !error && filtered.length > 0 && (
            <ul className="tsuite-add-items">
              {filtered.map(it => (
                <li key={it.id} className="tsuite-add-item">
                  <label className="tsuite-add-item-row">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(it.id)}
                      onChange={() => toggleOne(it.id)}
                    />
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
          <button className="tsuite-add-btn-save" onClick={handleSave} disabled={selectedIds.size === 0}>Add Selected</button>
        </div>
      </div>
    </div>
  );
};

export default AddTestcasesToSuite;


