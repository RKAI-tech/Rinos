import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ViewTestSuiteResult.css';
import { TestSuiteService } from '../../../services/testsuites';
import { TestCaseService } from '../../../services/testcases';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { canEdit } from '../../../hooks/useProjectPermissions';
import { useParams } from 'react-router-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testSuiteId?: string | null;
}

interface CaseItem {
  id: string;
  name: string;
  description?: string;
  status?: string;
  output?: string; // placeholder for terminal-like logs
  url?: string;
  screenshots?: string[];
}

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  testcaseName: string;
  logs: string;
  videoUrl?: string;
  screenshots?: string[];
  status?: string;
}

// Log Modal Component
const LogModal: React.FC<LogModalProps> = ({ isOpen, onClose, testcaseName, logs, videoUrl, screenshots, status }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'video' | 'screenshots'>('logs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setCurrentImageIndex(0);
      setIsFullscreen(false);
      setShowControls(false);
      setActiveTab('logs');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="vtsr-log-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="vtsr-log-tabbed" onClick={(e) => e.stopPropagation()}>
        <div className="vtsr-log-header">
          <h3 className="vtsr-log-title">
            {status?.toLowerCase() === 'passed' || status?.toLowerCase() === 'success' ? (
              <span className="vtsr-log-status-icon vtsr-log-status-success">✓</span>
            ) : null}
            {status?.toLowerCase() === 'failed' || status?.toLowerCase() === 'error' ? (
              <span className="vtsr-log-status-icon vtsr-log-status-failed">✗</span>
            ) : null}
            {status?.toLowerCase() === 'running' ? (
              <span className="vtsr-log-status-icon vtsr-log-status-running">⟳</span>
            ) : null}
            {testcaseName}
          </h3>
          <button className="vtsr-log-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        
        <div className="vtsr-log-tabbed-content">
          <div className="vtsr-log-tab-nav">
            <button 
              className={`vtsr-log-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              📋 Logs
            </button>
            <button 
              className={`vtsr-log-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
              onClick={() => setActiveTab('video')}
            >
              🎥 Video
            </button>
            <button 
              className={`vtsr-log-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}`}
              onClick={() => setActiveTab('screenshots')}
            >
              📸 Screenshots
            </button>
          </div>
          
          <div className="vtsr-log-tab-content">
            {activeTab === 'logs' && (
              <div className="vtsr-terminal">
                <div className="vtsr-term-bar">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                  {/* <span className="vtsr-term-title">Terminal</span> */}
                </div>
                <div className="vtsr-term-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {logs || 'No logs available for this testcase.'}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            
            {activeTab === 'video' && (
              <div className="vtsr-log-video-container">
                {videoUrl ? (
                  <video style={{ width: '100%', height: '100%' }} controls src={videoUrl} />
                ) : (
                  <div className="vtsr-log-no-video">
                    <div className="vtsr-log-no-video-icon">🎥</div>
                    <div className="vtsr-log-no-video-text">No video available for this testcase.</div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'screenshots' && (
              <div className="vtsr-log-screenshots-container">
                {screenshots && screenshots.length > 0 ? (
                  <div className="vtsr-log-screenshots-list">
                    {screenshots.map((screenshotUrl: string, index: number) => {
                      // Extract image name from URL pattern: after code and _ prefix, before .png
                      const urlParts = screenshotUrl.split('/');
                      const fileName = urlParts[urlParts.length - 1];
                      let imageName = fileName;
                      
                      // Try to extract name from pattern: code_name.png
                      if (fileName.includes('_')) {
                        const parts = fileName.split('_');
                        if (parts.length > 1) {
                          // Remove the code part (first part) and .png extension
                          let part1 = parts[1] || '';
                          let part2 = parts[2] || '';
                          if (part2.includes('.png')) {
                            part2 = part2.split('.png')[0];
                          }
                          imageName = [part1, part2].filter(Boolean).join('_');
                        }
                      } else {
                        // Fallback: remove extension
                        imageName = `screenshot_${index + 1}`;
                      }
                      
                      return (
                        <div key={index} className="vtsr-log-screenshot-item">
                          <button 
                            className="vtsr-log-screenshot-btn"
                            onClick={() => {
                              setSelectedImage(screenshotUrl);
                              setCurrentImageIndex(index);
                            }}
                          >
                            📸 {imageName}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="vtsr-log-no-screenshots">
                    <div className="vtsr-log-no-screenshots-icon">📸</div>
                    <div className="vtsr-log-no-screenshots-text">No verification screenshots available for this testcase.</div>
                  </div>
                )}
                
                {/* Image display modal */}
                {selectedImage && screenshots && screenshots.length > 0 && (
                  <div className="vtsr-log-image-modal-overlay" onClick={() => {
                    setSelectedImage(null);
                    setIsFullscreen(false);
                  }}>
                    <div 
                      className={`vtsr-log-image-modal ${isFullscreen ? 'vtsr-log-image-modal-fullscreen' : ''}`} 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="vtsr-log-image-modal-content">
                        <img 
                          src={selectedImage} 
                          alt="Screenshot"
                          className="vtsr-log-image-display"
                        />
                      </div>
                      
                      {/* Navigation controls - positioned below image */}
                      <div 
                        className={`vtsr-log-image-controls ${isFullscreen ? 'vtsr-log-image-controls-fullscreen' : ''} ${isFullscreen || showControls || !isFullscreen ? 'vtsr-log-image-controls-visible' : 'vtsr-log-image-controls-hidden'}`}
                      >
                        <button 
                          className="vtsr-log-image-nav-btn"
                          onClick={() => {
                            if (screenshots.length <= 1) return;
                            const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : screenshots.length - 1;
                            setCurrentImageIndex(prevIndex);
                            setSelectedImage(screenshots[prevIndex] || null);
                          }}
                          disabled={screenshots.length <= 1}
                          title="Previous image"
                        >
                          ◀
                        </button>
                        
                        <button 
                          className="vtsr-log-image-nav-btn"
                          onClick={() => {
                            if (screenshots.length <= 1) return;
                            const nextIndex = currentImageIndex < screenshots.length - 1 ? currentImageIndex + 1 : 0;
                            setCurrentImageIndex(nextIndex);
                            setSelectedImage(screenshots[nextIndex] || null);
                          }}
                          disabled={screenshots.length <= 1}
                          title="Next image"
                        >
                          ▶
                        </button>
                        
                        <button 
                          className="vtsr-log-image-nav-btn"
                          onClick={() => setIsFullscreen(!isFullscreen)}
                          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        >
                          {isFullscreen ? '⤡' : '⤢'}
                        </button>
                        
                        <button 
                          className="vtsr-log-image-close"
                          onClick={() => {
                            setSelectedImage(null);
                            setIsFullscreen(false);
                            setShowControls(false);
                          }}
                          title="Close"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
  const { projectId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<{ name: string; logs: string; url?: string; screenshots?: string[]; status?: string } | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [testSuiteName, setTestSuiteName] = useState<string>('');
  const svc = useMemo(() => new TestSuiteService(), []);
  const tcs = useMemo(() => new TestCaseService(), []);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const canEditPermission = canEdit(projectId);
  const hasProcessingCases = useMemo(() => {
    const processingStatuses = new Set(['running', 'pending', 'queued', 'waiting', 'processing', 'in_progress']);
    return cases.some((c) => processingStatuses.has(String(c.status || '').toLowerCase()));
  }, [cases]);

  const fetchResults = useCallback(async (silent: boolean = false) => {
    if (!isOpen || !testSuiteId) return;
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const resp = await svc.getTestCasesBySuite({ test_suite_id: testSuiteId });
      // console.log('response:', resp);
      if (resp.success && resp.data) {
        const mapped: CaseItem[] = (resp.data.testcases || []).map((tc) => {
          // Extract screenshots - handle both array of strings and array of objects
          let screenshots: string[] = [];
          const rawScreenshots = (tc as any).evidence?.screenshots || (tc as any).screenshots || [];
          if (Array.isArray(rawScreenshots)) {
            screenshots = rawScreenshots.map((item: any) => {
              // If it's already a string, return it
              if (typeof item === 'string') {
                return item;
              }
              // If it's an object with url property, extract the url
              if (item && typeof item === 'object' && item.url) {
                return item.url;
              }
              return null;
            }).filter((url: string | null): url is string => url !== null);
          }
          
          return {
            id: tc.testcase_id,
            name: tc.name,
            description: (tc as any).description || '',
            status: (tc as any).status,
            output: tc.logs || '',
            url: (tc as any).url_video,
            screenshots
          };
        });
        setCases(mapped);
      } else {
        setCases([]);
        toast.error(resp.error || 'Failed to load test suite results. Please try again.');
      }
    } catch (e) {
      setCases([]);
      toast.error('Disconnect from the server. Please try again.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [isOpen, testSuiteId, svc]);

  const fetchTestSuiteName = useCallback(async () => {
    if (!isOpen || !testSuiteId || !projectId) return;
    try {
      const resp = await svc.getTestSuites(projectId);
      if (resp.success && resp.data) {
        const testSuite = resp.data.test_suites.find(ts => ts.test_suite_id === testSuiteId);
        if (testSuite) {
          setTestSuiteName(testSuite.name);
        }
      }
    } catch (e) {
      // console.error('Failed to fetch test suite name:', e);
    }
  }, [isOpen, testSuiteId, projectId, svc]);

  useEffect(() => {
    fetchResults();
    fetchTestSuiteName();
  }, [fetchResults, fetchTestSuiteName]);

  // Auto-refresh every 15 seconds while there are processing testcases
  useEffect(() => {
    if (!isOpen || !testSuiteId || !hasProcessingCases) return;
    const intervalId = window.setInterval(() => {
      fetchResults(true);
    }, 60000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [isOpen, testSuiteId, fetchResults, hasProcessingCases]);

  const handleRetryAll = async () => {
    if (!canEditPermission || !testSuiteId) return;
    setIsRetryingAll(true);
    try {
      const resp = await svc.executeTestSuite({ test_suite_id: testSuiteId });
      if (resp.success) {
        toast.success('Test suite execution started');
      } else {
        toast.error(resp.error || 'Failed to execute test suite. Please try again.');
      }
    } catch (e) {
      toast.error('Failed to execute test suite. Please try again.');
    } finally {
      setIsRetryingAll(false);
      await fetchResults();
    }
  };

  const handleCaseClick = (caseItem: CaseItem) => {
    setSelectedLog({ name: caseItem.name, logs: caseItem.output || '', url: caseItem.url, screenshots: caseItem.screenshots, status: caseItem.status });
    setIsLogModalOpen(true);
  };

  const handleCloseLogModal = () => {
    setIsLogModalOpen(false);
    setSelectedLog(null);
  };

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

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = cases.length;
    const passed = cases.filter(c => c.status?.toLowerCase() === 'success' || c.status?.toLowerCase() === 'passed').length;
    const failed = cases.filter(c => c.status?.toLowerCase() === 'failed' || c.status?.toLowerCase() === 'error').length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    return { total, passed, failed, passRate };
  }, [cases]);

  // Calculate suite execution progress: non-running cases / total
  const progressPercent = useMemo(() => {
    const total = cases.length;
    if (total === 0) return 0;
    const nonRunning = cases.filter(c => String(c.status || '').toLowerCase() !== 'running').length;
    return Math.round((nonRunning / total) * 100);
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

  const handleExport = async () => {
    try {
      if (!testSuiteId) {
        toast.error('Missing test suite ID');
        return;
      }

      const response = await svc.exportTestSuite({ test_suite_id: testSuiteId });
      
      if (!response.success) {
        toast.error(response.error || 'Failed to export test suite. Please try again.');
        return;
      }

      if (response.blob && response.filename) {
        const url = URL.createObjectURL(response.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Exported test suite to Excel');
      } else {
        toast.error(response.error || 'No file received from server');
      }
    } catch (e) {
      toast.error('Export failed. Please try again.');
    }
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
            <h2 className="vtsr-title">{testSuiteName || 'Test Suite Results'}</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className={`vtsr-btn vtsr-btn-rerun ${(isRetryingAll || hasProcessingCases) ? 'running' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleRetryAll(); }}
                disabled={isRetryingAll || isLoading || !canEditPermission || cases.length === 0 || hasProcessingCases}
                aria-label="Retry All Test Cases"
              >
                {(isRetryingAll || hasProcessingCases) ? (
                  <span className="vtsr-loading-inline">
                    <span className="vtsr-spinner" />
                    Running...
                  </span>
                ) : (
                  'Run Again'
                )}
              </button>
              <button
                className="vtsr-btn vtsr-btn-export" 
                onClick={(e) => { e.stopPropagation(); handleExport(); }}
                disabled={isLoading || cases.length === 0}
                aria-label="Export"
              >
                Export
              </button>
              <button className="vtsr-close" onClick={onClose} aria-label="Close">✕</button>
            </div>
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

                {/* Progress Bar */}
                <div className="vtsr-progress">
                  <div className="vtsr-progress-header">
                    <span className="vtsr-progress-label">Progress</span>
                    <span className="vtsr-progress-value">{progressPercent}%</span>
                  </div>
                  <div className="vtsr-progress-bar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} role="progressbar">
                    <div className="vtsr-progress-fill" style={{ width: `${progressPercent}%` }} />
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
                              {String(c.status || '').toLowerCase() === 'running' ? (
                                <span className="vtsr-loading-inline">
                                  <span className="vtsr-spinner" />
                                  Running
                                </span>
                              ) : (
                                 ((c.status && c.status.toLowerCase() !== 'draft') ? c.status : 'N/A')
                              )}
                            </span>
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
                        <option value="10">10 rows/page</option>
                        <option value="20">20 rows/page</option>
                        <option value="30">30 rows/page</option>
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
        videoUrl={selectedLog?.url}
        screenshots={selectedLog?.screenshots}
        status={selectedLog?.status}
      />
    </>
  );
};

export default ViewTestSuiteResult;


