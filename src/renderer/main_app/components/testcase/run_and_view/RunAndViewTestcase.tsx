import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './RunAndViewTestcase.css';
import { TestCaseService } from '../../../services/testcases';
import { Screenshot, TestCase as TestCaseGetResponse } from '../../../types/testcases';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { canEdit } from '../../../hooks/useProjectPermissions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testcaseId?: string | null;
  testcaseName?: string;
  projectId?: string;
  testcaseData?: TestCaseGetResponse | null;
  onReloadTestcases?: () => Promise<void>;
}

const RunAndViewTestcase: React.FC<Props> = ({ isOpen, onClose, testcaseId, testcaseName, projectId, testcaseData, onReloadTestcases }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestCaseGetResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'video' | 'screenshots'>('logs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const svc = useMemo(() => new TestCaseService(), []);
  const canEditPermission = canEdit(projectId);

  // Load testcase data when modal opens (always try to fetch the latest)
  useEffect(() => {
    if (!isOpen) return;
    if (testcaseData) {
      // Show existing data immediately while fetching the freshest logs
      setResult(testcaseData);
    }
    if (testcaseId) {
      void loadTestcaseData();
    }
  }, [isOpen, testcaseId, projectId, testcaseData]);
  
  const loadTestcaseData = async () => {
    if (!testcaseId) return;
    
    try {
      setIsLoading(true);
      
      // Get testcase details to show logs
      const response = await svc.getTestCases(projectId || '', 1000, 0);
      if (response.success && response.data) {
        const testcase = response.data.testcases.find(tc => tc.testcase_id === testcaseId);
        if (testcase) {
          setResult(testcase);
        } else {
          toast.error('Testcase is not found. Please try again.', {
            containerId: 'modal-toast-container'
          });
        }
      } else {
        toast.error(response.error || 'Failed to load testcase data. Please try again.', {
          containerId: 'modal-toast-container'
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'An unexpected error occurred. Please contact support.', {
        containerId: 'modal-toast-container'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunTestcase = async () => {
    if (!testcaseId || !canEditPermission) return;
    try {
      setIsRunning(true);
      const resp = await svc.executeTestCase({ testcase_id: testcaseId });
      
      if (resp.success) {
        toast.success('Testcase executed successfully!', {
          containerId: 'modal-toast-container'
        });
        
        // Reload testcases list first
        if (onReloadTestcases) {
          await onReloadTestcases();
        }
        
        // Then reload testcase data to get updated logs
        await loadTestcaseData();
      } else {
        toast.error(resp.error || 'Failed to execute testcase. Please try again.', {
          containerId: 'modal-toast-container'
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'An unexpected error occurred. Please contact support.', {
        containerId: 'modal-toast-container'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };


  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);


  if (!isOpen) return null;

  // Get status from result or testcaseData prop
  const testcaseStatus = result?.status || testcaseData?.status;

  return (
    <div className="ravt-overlay" onClick={handleClose}>
      <div className="ravt-container" onClick={(e) => e.stopPropagation()}>
        <ToastContainer
          containerId="modal-toast-container"
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
        <div className="ravt-header">
          <h2 className="ravt-title">
            {testcaseStatus === 'Passed' && <span className="ravt-status-icon ravt-status-success">✓</span>}
            {testcaseStatus === 'Failed' && <span className="ravt-status-icon ravt-status-failed">✗</span>}
            {testcaseStatus === 'Running' && <span className="ravt-status-icon ravt-status-running">⟳</span>}
            {testcaseName || 'View Testcase Results'}
          </h2>
          <button className="ravt-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="ravt-body">
          

          {isLoading && (
            <div className="ravt-loading">
              <div className="ravt-spinner"></div>
              <span>Loading testcase data...</span>
            </div>
          )}

          {isRunning && (
            <div className="ravt-loading">
              <div className="ravt-spinner"></div>
              <span>Executing testcase...</span>
            </div>
          )}


          {result && !isLoading && !isRunning && (
            <div className="ravt-tabbed">
              <div className="ravt-tab-nav">
                <button 
                  className={`ravt-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  📋 Execution Logs
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveTab('video')}
                >
                  🎥 Recorded video
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}`}
                  onClick={() => setActiveTab('screenshots')}
                >
                  📸 Verification Screenshots
                </button>
              </div>
              
              <div className="ravt-tab-content">
                {activeTab === 'logs' && (
                  <div className="ravt-terminal">
                    <div className="ravt-term-bar">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                    </div>
                    <div className="ravt-term-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.evidence?.log?.content || 'No logs available for this testcase.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {activeTab === 'video' && (
                  <div className="ravt-video-container">
                    {result.evidence?.video?.url ? (
                      <video style={{ width: '100%', height: '100%' }} controls src={result.evidence?.video?.url} />
                    ) : (
                      <div className="ravt-no-video">
                        <div className="ravt-no-video-icon">🎥</div>
                        <div className="ravt-no-video-text">No video available for this testcase.</div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'screenshots' && (
                  <div className="ravt-screenshots-container">
                    {result.evidence?.screenshots && result.evidence?.screenshots.length > 0 ? (
                      <div className="ravt-screenshots-list">
                        {result.evidence?.screenshots.map((screenshot: Screenshot, index: number) => {
                          // Extract image name from URL pattern: after code and _ prefix, before .png
                          const urlParts = screenshot.url.split('/');
                          const fileName = urlParts[urlParts.length - 1];
                          let imageName = fileName;
                          
                          // Try to extract name from pattern: code_name.png
                          if (fileName.includes('_')) {
                            const parts = fileName.split('_');
                            if (parts.length > 1) {
                              // Remove the code part (first part) and .png extension
                              // Lấy phần tử (1) và (2) trong mảng parts (sau dấu _ đầu tiên và sau đó)
                              // Nếu phần (2) có đoạn sau '.png', xóa nó đi
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
                            <div key={index} className="ravt-screenshot-item">
                              <button 
                                className="ravt-screenshot-btn"
                                onClick={() => {
                                  setSelectedImage(screenshot.url);
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
                      <div className="ravt-no-screenshots">
                        <div className="ravt-no-screenshots-icon">📸</div>
                        <div className="ravt-no-screenshots-text">No verification screenshots available for this testcase.</div>
                      </div>
                    )}
                    
                    {/* Image display modal */}
                    {selectedImage && result.evidence?.screenshots && result.evidence?.screenshots.length > 0 && (
                      <div className="ravt-image-modal-overlay" onClick={() => {
                        setSelectedImage(null);
                        setIsFullscreen(false);
                      }}>
                        <div 
                          className={`ravt-image-modal ${isFullscreen ? 'ravt-image-modal-fullscreen' : ''}`} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="ravt-image-modal-content">
                            <img 
                              src={selectedImage} 
                              alt="Screenshot"
                              className="ravt-image-display"
                            />
                          </div>
                          
                          {/* Navigation controls - positioned below image */}
                          <div 
                            className={`ravt-image-controls ${isFullscreen ? 'ravt-image-controls-fullscreen' : ''} ${isFullscreen || showControls || !isFullscreen ? 'ravt-image-controls-visible' : 'ravt-image-controls-hidden'}`}
                          >
                            <button 
                              className="ravt-image-nav-btn"
                              onClick={() => {
                                const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : result.evidence?.screenshots?.length ? result.evidence?.screenshots?.length - 1 : 0;
                                setCurrentImageIndex(prevIndex);
                                setSelectedImage(result.evidence?.screenshots?.[prevIndex]?.url || null);
                              }}
                              disabled={result.evidence?.screenshots?.length <= 1}
                              title="Previous image"
                            >
                              ◀
                            </button>
                            
                            <button 
                              className="ravt-image-nav-btn"
                              onClick={() => {
                                const nextIndex = currentImageIndex < (result.evidence?.screenshots?.length || 0) ? currentImageIndex + 1 : 0;
                                setCurrentImageIndex(nextIndex);
                                setSelectedImage(result.evidence?.screenshots?.[nextIndex]?.url || null);
                              }}
                              disabled={result.evidence?.screenshots?.length <= 1}
                              title="Next image"
                            >
                              ▶
                            </button>
                            
                            <button 
                              className="ravt-image-nav-btn"
                              onClick={() => setIsFullscreen(!isFullscreen)}
                              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            >
                              {isFullscreen ? '⤡' : '⤢'}
                            </button>
                            
                            <button 
                              className="ravt-image-close"
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
          )}

          {!isLoading && !isRunning && !result && (
            <div className="ravt-empty">
              No testcase data available.
            </div>
          )}
        </div>

        <div className="ravt-footer">
          <button 
            className="ravt-run-btn" 
            onClick={handleRunTestcase}
            disabled={isRunning || !testcaseId || !canEditPermission}
          >
            {isRunning ? 'Running...' : 'Run Testcase'}
          </button>
          <button className="ravt-btn" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default RunAndViewTestcase;
