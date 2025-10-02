import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ViewTestSuiteResult.css';
import { TestSuiteService } from '../../../services/testsuites';
import { TestCaseService } from '../../../services/testcases';
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
  url?: string;
}

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  testcaseName: string;
  logs: string;
  videoUrl?: string;
}

// Log Modal Component
const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, testcaseName, logs, videoUrl }) => {
  if (!isOpen) return null;

  return (
    <div className="vtsr-log-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="vtsr-log-combined" onClick={(e) => e.stopPropagation()}>
        <div className="vtsr-log-header">
          <h3 className="vtsr-log-title">{testcaseName}</h3>
          <button className="vtsr-log-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="vtsr-log-content-row">
          <div className="vtsr-log-pane">
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
          <div className="vtsr-log-pane">
            {videoUrl ? (
              <video style={{ width: '100%', height: '100%' }} controls src={videoUrl} />
            ) : (
              <div style={{ padding: 16 }}>No video available.</div>
            )}
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
  const [selectedLog, setSelectedLog] = useState<{ name: string; logs: string; url?: string } | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const svc = useMemo(() => new TestSuiteService(), []);
  const tcs = useMemo(() => new TestCaseService(), []);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const fetchResults = useCallback(async () => {
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
          output: tc.logs || '',
          url: (tc as any).url
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
  }, [isOpen, testSuiteId, svc]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleRetry = async (testcaseId: string) => {
    setRetryingIds(prev => {
      const next = new Set(prev);
      next.add(testcaseId);
      return next;
    });
    try {
      const resp = await tcs.executeTestCase({ testcase_id: testcaseId });
      if (resp.success) {
        toast.success('Test case execution started');
      } else {
        toast.error(resp.error || 'Failed to execute test case');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to execute test case');
    } finally {
      setRetryingIds(prev => {
        const next = new Set(prev);
        next.delete(testcaseId);
        return next;
      });
      await fetchResults();
    }
  };

  const handleCaseClick = (caseItem: CaseItem) => {
    setSelectedLog({ name: caseItem.name, logs: caseItem.output || '', url: caseItem.url });
    setIsLogModalOpen(true);
  };

  const handleCloseLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedLog(null);
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = cases.length;
    const passed = cases.filter(c => c.status?.toLowerCase() === 'success' || c.status?.toLowerCase() === 'passed').length;
    const failed = cases.filter(c => c.status?.toLowerCase() === 'failed' || c.status?.toLowerCase() === 'error').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    return { total, passed, failed, passRate };
  }, [cases]);

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    let filtered = cases.filter(c => 
      c.name.toLowerCase().includes(searchText.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      if (sortBy === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        aVal = (a.status || '').toLowerCase();
        bVal = (b.status || '').toLowerCase();
      }

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [cases, searchText, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedCases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCases = filteredAndSortedCases.slice(startIndex, endIndex);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, sortBy, sortOrder]);

  const handleSort = (column: 'name' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
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
              <>
                {/* Summary Statistics */}
                <div className="vtsr-summary">
                  <div className="vtsr-summary-item">
                    <span className="vtsr-summary-label">Pass Rate</span>
                    <span className="vtsr-summary-value">{summaryStats.passRate}%</span>
                  </div>
                  <div className="vtsr-summary-item">
                    <span className="vtsr-summary-label">Passed</span>
                    <span className="vtsr-summary-value vtsr-passed">{summaryStats.passed}</span>
                  </div>
                  <div className="vtsr-summary-item">
                    <span className="vtsr-summary-label">Failed</span>
                    <span className="vtsr-summary-value vtsr-failed">{summaryStats.failed}</span>
                  </div>
                  <div className="vtsr-summary-item">
                    <span className="vtsr-summary-label">Total</span>
                    <span className="vtsr-summary-value">{summaryStats.total}</span>
                  </div>
                </div>

                {/* Search Input */}
                <div className="vtsr-search-container">
                  <input
                    type="text"
                    placeholder="Search testcases..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="vtsr-search-input"
                  />
                </div>

                {/* Table */}
                <div className="vtsr-table-container">
                  <table className="vtsr-table">
                    <thead>
                      <tr>
                        <th 
                          className={`vtsr-sortable ${sortBy === 'name' ? 'vtsr-sorted' : ''}`}
                          onClick={() => handleSort('name')}
                        >
                          <span className="vtsr-th-content">
                            Testcase Name
                            <span className="vtsr-sort-arrows">
                              <span className={`vtsr-arrow vtsr-arrow-up ${sortBy === 'name' && sortOrder === 'asc' ? 'vtsr-active' : ''}`}></span>
                              <span className={`vtsr-arrow vtsr-arrow-down ${sortBy === 'name' && sortOrder === 'desc' ? 'vtsr-active' : ''}`}></span>
                            </span>
                          </span>
                        </th>
                        <th 
                          className={`vtsr-sortable ${sortBy === 'status' ? 'vtsr-sorted' : ''}`}
                          onClick={() => handleSort('status')}
                        >
                          <span className="vtsr-th-content">
                            Status
                            <span className="vtsr-sort-arrows">
                              <span className={`vtsr-arrow vtsr-arrow-up ${sortBy === 'status' && sortOrder === 'asc' ? 'vtsr-active' : ''}`}></span>
                              <span className={`vtsr-arrow vtsr-arrow-down ${sortBy === 'status' && sortOrder === 'desc' ? 'vtsr-active' : ''}`}></span>
                            </span>
                          </span>
                        </th>
                        <th aria-label="Actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCases.map((c) => (
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
                          <td className="vtsr-table-actions">
                            <button 
                              className="vtsr-btn" 
                              onClick={(e) => { e.stopPropagation(); handleRetry(c.id); }}
                              disabled={retryingIds.has(c.id) || isLoading}
                              aria-label="Retry Testcase"
                            >
                              {retryingIds.has(c.id) ? 'Retrying...' : 'Retry'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredAndSortedCases.length > 0 && (
                  <div className="vtsr-pagination">
                    <div className="vtsr-pagination-info">
                      Showing {filteredAndSortedCases.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredAndSortedCases.length)} of {filteredAndSortedCases.length} testcases
                    </div>
                    <div className="vtsr-pagination-controls">
                      <select
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(e.target.value)}
                        className="vtsr-pagination-dropdown"
                      >
                        <option value="5">5 rows/page</option>
                        <option value="10">10 rows/page</option>
                        <option value="20">20 rows/page</option>
                        <option value="50">50 rows/page</option>
                      </select>
                      
                      <button 
                        className="vtsr-pagination-btn" 
                        onClick={handlePreviousPage} 
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      
                      <div className="vtsr-pagination-pages">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              className={`vtsr-pagination-page ${currentPage === pageNum ? 'vtsr-active' : ''}`}
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button 
                        className="vtsr-pagination-btn" 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      {/* Log Modal */}
      <LogModal
        isOpen={isLogModalOpen}
        onClose={handleCloseLogModal}
        testcaseName={selectedLog?.name || ''}
        logs={selectedLog?.logs || ''}
        videoUrl={selectedLog?.url}
      />
    </>
  );
};

export default ViewTestSuiteResult;


