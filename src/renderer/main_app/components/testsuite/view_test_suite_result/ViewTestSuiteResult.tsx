import React, { useEffect, useMemo, useState } from 'react';
import './ViewTestSuiteResult.css';
import { TestSuiteService } from '../../../services/testsuites';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testSuiteId?: string | null;
}

interface CaseItem {
  id: string;
  name: string;
  status?: string;
  output?: string; // placeholder for terminal-like logs
}

const ViewTestSuiteResult: React.FC<Props> = ({ isOpen, onClose, testSuiteId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const svc = useMemo(() => new TestSuiteService(), []);

  useEffect(() => {
    const load = async () => {
      if (!isOpen || !testSuiteId) return;
      try {
        setIsLoading(true);
        setError(null);
        const resp = await svc.getTestCasesBySuite({ test_suite_id: testSuiteId });
        if (resp.success && resp.data) {
          const mapped: CaseItem[] = (resp.data.testcases || []).map((tc) => ({
            id: tc.testcase_id,
            name: tc.name,
            status: (tc as any).status,
            output: tc.logs || ''
          }));
          setCases(mapped);
        } else {
          setCases([]);
          setError(resp.error || 'Failed to load results');
        }
      } catch (e) {
        setCases([]);
        setError(e instanceof Error ? e.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, testSuiteId, svc]);

  if (!isOpen) return null;

  return (
    <div className="vtsr-overlay" onClick={onClose}>
      <div className="vtsr-container" onClick={(e) => e.stopPropagation()}>
        <div className="vtsr-header">
          <h2 className="vtsr-title">Test Suite Results</h2>
          <button className="vtsr-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="vtsr-body">
          {isLoading && <div className="vtsr-loading">Loading results...</div>}
          {error && !isLoading && <div className="vtsr-error">{error}</div>}
          {!isLoading && !error && cases.length === 0 && (
            <div className="vtsr-empty">No testcases in this suite.</div>
          )}

          {!isLoading && !error && cases.length > 0 && (
            <div className="vtsr-list">
              {cases.map((c) => (
                <div key={c.id} className="vtsr-item">
                  <div className="vtsr-item-head">
                    <div className="vtsr-item-name">{c.name}</div>
                    <div className={`vtsr-item-status ${String(c.status || '').toLowerCase()}`}>{c.status || 'UNKNOWN'}</div>
                  </div>
                  <div className="vtsr-terminal">
                    <div className="vtsr-term-bar">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                      <span className="vtsr-term-title">Logs</span>
                    </div>
                    <pre className="vtsr-term-content">
                      {c.output}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="vtsr-footer">
          <button className="vtsr-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewTestSuiteResult;


