import React, { useEffect, useMemo, useState } from 'react';
import './ViewTestSuiteResult.css';
import { TestSuiteService } from '../../../services/testsuites';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  testcaseName: string;
  logs: string;
}

// Log Modal Component
const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, testcaseName, logs }) => {
  if (!isOpen) return null;

  return (
    <div className="vtsr-log-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="vtsr-log-container" onClick={(e) => e.stopPropagation()}>
        <div className="vtsr-log-header">
          <h3 className="vtsr-log-title">Logs: {testcaseName}</h3>
          <button className="vtsr-log-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="vtsr-log-body">
          <div className="vtsr-terminal">
            <div className="vtsr-term-bar">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
              <span className="vtsr-term-title">Execution Logs</span>
            </div>
            <pre className="vtsr-term-content">
              {logs || 'No logs available for this testcase.'}
            </pre>
          </div>
        </div>
        <div className="vtsr-log-footer">
          <button className="vtsr-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const ViewTestSuiteResult: React.FC<Props> = ({ isOpen, onClose, testSuiteId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<{ name: string; logs: string } | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
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
          toast.error(resp.error || 'Failed to load results');
        }
      } catch (e) {
        setCases([]);
        toast.error(e instanceof Error ? e.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, testSuiteId, svc]);

  const handleCaseClick = (caseItem: CaseItem) => {
    setSelectedLog({ name: caseItem.name, logs: caseItem.output || '' });
    setIsLogModalOpen(true);
  };

  const handleCloseLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedLog(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="vtsr-overlay" onClick={onClose}>
        <div className="vtsr-container" onClick={(e) => e.stopPropagation()}>
          <ToastContainer
            containerId="vtsr-toast-container"
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            style={{ zIndex: 2147483648 }}
          />
          <div className="vtsr-header">
            <h2 className="vtsr-title">Test Suite Results</h2>
            <button className="vtsr-close" onClick={onClose} aria-label="Close">✕</button>
          </div>

          <div className="vtsr-body">
            {isLoading && <div className="vtsr-loading">Loading results...</div>}
            {!isLoading && cases.length === 0 && (
              <div className="vtsr-empty">No testcases in this suite.</div>
            )}

            {!isLoading && cases.length > 0 && (
              <div className="vtsr-table-container">
                <table className="vtsr-table">
                  <thead>
                    <tr>
                      <th>Testcase Name</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((c) => (
                      <tr 
                        key={c.id} 
                        className="vtsr-table-row"
                        onClick={() => handleCaseClick(c)}
                      >
                        <td className="vtsr-table-name">{c.name}</td>
                        <td className="vtsr-table-status">
                          <span className={`vtsr-status-badge ${String(c.status || '').toLowerCase()}`}>
                            {c.status || 'DRAFT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="vtsr-footer">
            <button className="vtsr-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      {/* Log Modal */}
      <LogModal
        isOpen={isLogModalOpen}
        onClose={handleCloseLogModal}
        testcaseName={selectedLog?.name || ''}
        logs={selectedLog?.logs || ''}
      />
    </>
  );
};

export default ViewTestSuiteResult;


