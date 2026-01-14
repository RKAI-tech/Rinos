import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download } from 'lucide-react';
import './ViewTestcaseEvidence.css';
import { TestSuiteService } from '../../../services/testsuites';
import { TestCaseInSuite } from '../../../types/testsuites';
import { Screenshot } from '../../../types/testcases';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testcase: TestCaseInSuite | null;
  testSuiteId?: string | null;
  projectId?: string;
}

interface EvidenceData {
  logs?: string;
  video?: {
    url: string;
  } | null;
  screenshots?: Screenshot[] | null;
  database_files?: string[] | null;
}

const ViewTestcaseEvidence: React.FC<Props> = ({ isOpen, onClose, testcase, testSuiteId, projectId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'video' | 'screenshots' | 'database'>('logs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const svc = useMemo(() => new TestSuiteService(), []);

  // Load evidence data when modal opens
  useEffect(() => {
    if (!isOpen || !testcase || !testSuiteId) {
      setEvidenceData(null);
      return;
    }
    void loadEvidenceData();
  }, [isOpen, testcase, testSuiteId]);
  
  const loadEvidenceData = async () => {
    if (!testcase || !testSuiteId) return;
    
    try {
      setIsLoading(true);
      
      // Get testcases by suite to get the latest evidence data
      const response = await svc.getTestCasesBySuite({ test_suite_id: testSuiteId });
      if (response.success && response.data) {
        const foundTestcase = response.data.testcases.find(tc => tc.testcase_id === testcase.testcase_id);
        if (foundTestcase) {
          // Extract evidence data from testcase
          const tc = foundTestcase as any;
          
          // Extract screenshots - handle both array of strings and array of objects
          let screenshots: Screenshot[] = [];
          const rawScreenshots = tc.evidence?.screenshots || tc.screenshots || [];
          if (Array.isArray(rawScreenshots)) {
            screenshots = rawScreenshots.map((item: any) => {
              // If it's already a Screenshot object, return it
              if (item && typeof item === 'object' && item.url) {
                return item;
              }
              // If it's a string, convert to Screenshot object
              if (typeof item === 'string') {
                return { screenshot_id: '', url: item };
              }
              return null;
            }).filter((item: Screenshot | null): item is Screenshot => item !== null);
          }
          
          // Extract database files
          const databaseFiles = tc.database_files || [];
          
          const evidence: EvidenceData = {
            logs: tc.logs || '',
            video: tc.url_video ? { url: tc.url_video } : null,
            screenshots: screenshots.length > 0 ? screenshots : null,
            database_files: Array.isArray(databaseFiles) && databaseFiles.length > 0 ? databaseFiles : null,
          };
          
          setEvidenceData(evidence);
        } else {
          toast.error('Testcase not found in suite. Please try again.', {
            containerId: 'modal-toast-container'
          });
        }
      } else {
        toast.error(response.error || 'Failed to load evidence data. Please try again.', {
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

  const handleClose = () => {
    setEvidenceData(null);
    setSelectedImage(null);
    setIsFullscreen(false);
    setShowControls(false);
    onClose();
  };

  const handleDownloadDatabaseFile = async (fileUrl: string, fileName: string) => {
    try {
      // Fetch file as blob
      const response = await fetch(fileUrl);
      if (!response.ok) {
        toast.error('Failed to download file. Please try again.', {
          containerId: 'modal-toast-container'
        });
        return;
      }
      
      const blob = await response.blob();
      
      // Create download link programmatically
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download file. Please try again.', {
        containerId: 'modal-toast-container'
      });
    }
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

  // Get status from testcase
  const testcaseStatus = testcase?.status || '';

  return (
    <div className="vte-overlay" onClick={handleClose}>
      <div className="vte-container" onClick={(e) => e.stopPropagation()}>
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
        <div className="vte-header">
          <h2 className="vte-title">
            {testcaseStatus === 'Passed' && <span className="vte-status-icon vte-status-success">✓</span>}
            {testcaseStatus === 'Failed' && <span className="vte-status-icon vte-status-failed">✗</span>}
            {testcaseStatus === 'Running' && <span className="vte-status-icon vte-status-running">⟳</span>}
            {testcase?.name || 'View Testcase Evidence'}
          </h2>
          <button className="vte-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className="vte-body">
          {isLoading && (
            <div className="vte-loading">
              <div className="vte-spinner"></div>
              <span>Loading evidence data...</span>
            </div>
          )}

          {evidenceData && !isLoading && (
            <div className="vte-tabbed">
              <div className="vte-tab-nav">
                <button 
                  className={`vte-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  📋 Execution Logs
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveTab('video')}
                >
                  🎥 Recorded video
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}`}
                  onClick={() => setActiveTab('screenshots')}
                >
                  📸 Verification Screenshots
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                  onClick={() => setActiveTab('database')}
                >
                  📊 Database Execution Files
                </button>
              </div>
              
              <div className="vte-tab-content">
                {activeTab === 'logs' && (
                  <div className="vte-terminal">
                    <div className="vte-term-bar">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                    </div>
                    <div className="vte-term-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {evidenceData.logs || 'No logs available for this testcase.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {activeTab === 'video' && (
                  <div className="vte-video-container">
                    {evidenceData.video?.url ? (
                      <video style={{ width: '100%', height: '100%' }} controls src={evidenceData.video.url} />
                    ) : (
                      <div className="vte-no-video">
                        <div className="vte-no-video-icon">🎥</div>
                        <div className="vte-no-video-text">No video available for this testcase.</div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'screenshots' && (
                  <div className="vte-screenshots-container">
                    {evidenceData.screenshots && evidenceData.screenshots.length > 0 ? (
                      <div className="vte-screenshots-list">
                        {evidenceData.screenshots.map((screenshot: Screenshot, index: number) => {
                          // Extract image name from URL pattern: after code and _ prefix, before .png
                          const urlParts = screenshot.url.split('/');
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
                            <div key={index} className="vte-screenshot-item">
                              <button 
                                className="vte-screenshot-btn"
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
                      <div className="vte-no-screenshots">
                        <div className="vte-no-screenshots-icon">📸</div>
                        <div className="vte-no-screenshots-text">No verification screenshots available for this testcase.</div>
                      </div>
                    )}
                    
                    {/* Image display modal */}
                    {selectedImage && evidenceData.screenshots && evidenceData.screenshots.length > 0 && (
                      <div className="vte-image-modal-overlay" onClick={() => {
                        setSelectedImage(null);
                        setIsFullscreen(false);
                      }}>
                        <div 
                          className={`vte-image-modal ${isFullscreen ? 'vte-image-modal-fullscreen' : ''}`} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="vte-image-modal-content">
                            <img 
                              src={selectedImage} 
                              alt="Screenshot"
                              className="vte-image-display"
                            />
                          </div>
                          
                          {/* Navigation controls - positioned below image */}
                          <div 
                            className={`vte-image-controls ${isFullscreen ? 'vte-image-controls-fullscreen' : ''} ${isFullscreen || showControls || !isFullscreen ? 'vte-image-controls-visible' : 'vte-image-controls-hidden'}`}
                          >
                            <button 
                              className="vte-image-nav-btn"
                              onClick={() => {
                                const prevIndex = currentImageIndex > 0 ? currentImageIndex - 1 : evidenceData.screenshots?.length ? evidenceData.screenshots.length - 1 : 0;
                                setCurrentImageIndex(prevIndex);
                                setSelectedImage(evidenceData.screenshots?.[prevIndex]?.url || null);
                              }}
                              disabled={evidenceData.screenshots?.length <= 1}
                              title="Previous image"
                            >
                              ◀
                            </button>
                            
                            <button 
                              className="vte-image-nav-btn"
                              onClick={() => {
                                const total = evidenceData.screenshots?.length || 0;
                                const nextIndex = currentImageIndex < total - 1 ? currentImageIndex + 1 : 0;
                                setCurrentImageIndex(nextIndex);
                                setSelectedImage(evidenceData.screenshots?.[nextIndex]?.url || null);
                              }}
                              disabled={evidenceData.screenshots?.length <= 1}
                              title="Next image"
                            >
                              ▶
                            </button>
                            
                            <button 
                              className="vte-image-nav-btn"
                              onClick={() => setIsFullscreen(!isFullscreen)}
                              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            >
                              {isFullscreen ? '⤡' : '⤢'}
                            </button>
                            
                            <button 
                              className="vte-image-close"
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
                
                {activeTab === 'database' && (
                  <div className="vte-database-container">
                    {evidenceData.database_files && evidenceData.database_files.length > 0 ? (
                      <div className="vte-database-list">
                        {evidenceData.database_files.map((fileUrl: string, index: number) => {
                          // Extract file name from URL
                          const urlParts = fileUrl.split('/');
                          const fileName = urlParts[urlParts.length - 1] || `database_file_${index + 1}.xlsx`;
                          
                          return (
                            <div key={index} className="vte-database-item">
                              <div className="vte-database-info">
                                <span className="vte-database-name">{fileName}</span>
                              </div>
                              <button
                                onClick={() => handleDownloadDatabaseFile(fileUrl, fileName)}
                                className="vte-database-download-btn"
                                title="Download"
                                type="button"
                              >
                                <Download className="vte-download-icon" size={18} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="vte-no-database">
                        <div className="vte-no-database-icon">📊</div>
                        <div className="vte-no-database-text">No database execution files available for this testcase.</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && !evidenceData && (
            <div className="vte-empty">
              No evidence data available.
            </div>
          )}
        </div>

        <div className="vte-footer">
          <button className="vte-btn" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewTestcaseEvidence;

