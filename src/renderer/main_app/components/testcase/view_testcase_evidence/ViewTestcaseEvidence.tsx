import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Network, Database, ClipboardList, Video, Image as ImageIcon, X, CheckCircle2, AlertCircle, Loader2, List, Code, Copy } from 'lucide-react';
import './ViewTestcaseEvidence.css';
import { TestSuiteService } from '../../../services/testsuites';
import { TestCaseInSuite } from '../../../types/testsuites';
import { Screenshot } from '../../../types/testcases';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ActionService } from '../../../services/actions';
import { Action as MainAction } from '../../../types/actions';
import { CodeGenerator } from '../../../../shared/services/codeGenerator';
import { Action as SharedAction, BasicAuthentication } from '../../../../shared/types/actions';
import Editor from '@monaco-editor/react';
import { logErrorAndGetFriendlyMessage } from '../../../../shared/utils/friendlyError';

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
  api_files?: string[] | null;
}

const ViewTestcaseEvidence: React.FC<Props> = ({ isOpen, onClose, testcase, testSuiteId, projectId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [evidenceData, setEvidenceData] = useState<EvidenceData | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'video' | 'screenshots' | 'database' | 'api' | 'actions' | 'code'>('logs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [actions, setActions] = useState<MainAction[]>([]);
  const [isActionsLoading, setIsActionsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [basicAuth, setBasicAuth] = useState<BasicAuthentication | null>(null);
  const svc = useMemo(() => new TestSuiteService(), []);
  const actionSvc = useMemo(() => new ActionService(), []);
  const codeGen = useMemo(() => new CodeGenerator(), []);

  // Load evidence data when modal opens
  useEffect(() => {
    if (!isOpen || !testcase || !testSuiteId) {
      setEvidenceData(null);
      setVideoError(false);
      return;
    }
    void loadEvidenceData();
  }, [isOpen, testcase, testSuiteId]);

  // Reset video error when URL changes
  useEffect(() => {
    setVideoError(false);
  }, [evidenceData?.video?.url]);

  // Reset video error when tab changes to video
  useEffect(() => {
    if (activeTab === 'video') {
      setVideoError(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen || !testcase?.testcase_id) {
      setActions([]);
      setGeneratedCode('');
      return;
    }

    const loadActions = async () => {
      try {
        setIsActionsLoading(true);
        const resp = await actionSvc.getActionsByTestCase(testcase.testcase_id, undefined, undefined, projectId);
        if (resp.success) {
          setActions(resp.data?.actions || []);
        } else {
          const message = logErrorAndGetFriendlyMessage(
            '[ViewTestcaseEvidence] loadActions',
            resp.error,
            'Failed to load actions. Please try again.'
          );
          toast.error(message, { containerId: 'modal-toast-container' });
          setActions([]);
        }
      } catch (e) {
        const message = logErrorAndGetFriendlyMessage(
          '[ViewTestcaseEvidence] loadActions',
          e,
          'Failed to load actions. Please try again.'
        );
        toast.error(message, { containerId: 'modal-toast-container' });
        setActions([]);
      } finally {
        setIsActionsLoading(false);
      }
    };

    void loadActions();
  }, [isOpen, testcase?.testcase_id, projectId]);

  useEffect(() => {
    if (!actions.length) {
      setGeneratedCode('');
      return;
    }
    const code = codeGen.generateCode(
      basicAuth,
      actions as unknown as SharedAction[]
    );
    setGeneratedCode(code || '');
  }, [actions, basicAuth, codeGen]);
  
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
          
          // Extract API files
          const apiFiles = tc.api_files || [];
          
          const evidence: EvidenceData = {
            logs: tc.logs || '',
            video: tc.url_video ? { url: tc.url_video } : null,
            screenshots: screenshots.length > 0 ? screenshots : null,
            database_files: Array.isArray(databaseFiles) && databaseFiles.length > 0 ? databaseFiles : null,
            api_files: Array.isArray(apiFiles) && apiFiles.length > 0 ? apiFiles : null,
          };
          
          setEvidenceData(evidence);
          setBasicAuth(tc.basic_authentication || null);
        } else {
          toast.error('Testcase not found in suite. Please try again.', {
            containerId: 'modal-toast-container'
          });
        }
      } else {
        const message = logErrorAndGetFriendlyMessage(
          '[ViewTestcaseEvidence] loadEvidenceData',
          response.error,
          'Failed to load evidence data. Please try again.'
        );
        toast.error(message, { containerId: 'modal-toast-container' });
      }
    } catch (e) {
      const message = logErrorAndGetFriendlyMessage(
        '[ViewTestcaseEvidence] loadEvidenceData',
        e,
        'An unexpected error occurred. Please try again.'
      );
      toast.error(message, { containerId: 'modal-toast-container' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEvidenceData(null);
    setSelectedImage(null);
    setIsFullscreen(false);
    setShowControls(false);
    setVideoError(false);
    setActions([]);
    setGeneratedCode('');
    setBasicAuth(null);
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
      fileName = fileName.split('.')[0] + '.xlsx';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = logErrorAndGetFriendlyMessage(
        '[ViewTestcaseEvidence] handleDownloadDatabaseFile',
        error,
        'Failed to download file. Please try again.'
      );
      toast.error(message, { containerId: 'modal-toast-container' });
    }
  };
  const handleDownloadApiFile = async (fileUrl: string, fileName: string) => {
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
      fileName = fileName.split('.')[0] + '.json';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = logErrorAndGetFriendlyMessage(
        '[ViewTestcaseEvidence] handleDownloadApiFile',
        error,
        'Failed to download file. Please try again.'
      );
      toast.error(message, { containerId: 'modal-toast-container' });
    }
  };

  const handleCopyText = async (text: string, successMessage: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage, { containerId: 'modal-toast-container' });
    } catch {
      toast.error('Failed to copy. Please try again.', { containerId: 'modal-toast-container' });
    }
  };

  const handleDownloadText = (text: string, filename: string) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadScreenshot = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        toast.error('Failed to download screenshot. Please try again.', {
          containerId: 'modal-toast-container'
        });
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const message = logErrorAndGetFriendlyMessage(
        '[ViewTestcaseEvidence] handleDownloadScreenshot',
        error,
        'Failed to download screenshot. Please try again.'
      );
      toast.error(message, { containerId: 'modal-toast-container' });
    }
  };

  const getActionValue = (action: MainAction): string => {
    for (const actionData of action.action_datas || []) {
      if (actionData?.value && typeof actionData.value === 'object' && 'value' in actionData.value) {
        const raw = (actionData.value as { value?: any }).value;
        if (raw === undefined || raw === null) continue;
        return typeof raw === 'string' ? raw : JSON.stringify(raw);
      }
      if (typeof actionData?.value === 'string' || typeof actionData?.value === 'number') {
        return String(actionData.value);
      }
    }
    return '';
  };

  const processImageName = (screenshot: Screenshot, index: number) => {
    // Extract image name from URL pattern: after code and _ prefix, before .png
    console.log('[ViewTestcaseEvidence] Screenshot URL', screenshot.url);
    const urlParts = screenshot.url.split('/');
    console.log('[ViewTestcaseEvidence] URL Parts', urlParts);
    const fileName = urlParts[urlParts.length - 1];
    console.log('[ViewTestcaseEvidence] File Name', fileName);
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
      imageName = `Verification (${index + 1})`;
    }
    return imageName;
  };

  const processDatabaseFileName = (fileUrl: string, index: number) => {
    // Extract file name from URL pattern: after code and _ prefix, before .xlsx
    console.log('[ViewTestcaseEvidence] Database File URL', fileUrl);
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `database_file_${index + 1}.xlsx`;
    let displayName = fileName;
    
    // Try to extract name from pattern: code_name.xlsx
    if (fileName.includes('_')) {
      const parts = fileName.split('_');
      if (parts.length > 1) {
        // Remove the code part (first part) and .xlsx extension
        let part1 = parts[1] || '';
        let part2 = parts[2] || '';
        if (part2.includes('.xlsx')) {
          part2 = part2.split('.xlsx')[0];
        }
        displayName = [part1, part2].filter(Boolean).join('_');
        // Add extension back if we have a meaningful name
        if (displayName && displayName !== fileName) {
          displayName = displayName + '.xlsx';
        }
      }
    }
    // If no underscore or extraction failed, use original filename
    return displayName;
  };

  const processApiFileName = (fileUrl: string, index: number) => {
    // Extract file name from URL pattern: after code and _ prefix, before .json
    console.log('[ViewTestcaseEvidence] API File URL', fileUrl);
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1] || `api_file_${index + 1}.json`;
    let displayName = fileName;
    
    // Try to extract name from pattern: code_name.json
    if (fileName.includes('_')) {
      const parts = fileName.split('_');
      if (parts.length > 1) {
        // Remove the code part (first part) and .json extension
        let part1 = parts[1] || '';
        let part2 = parts[2] || '';
        if (part2.includes('.json')) {
          part2 = part2.split('.json')[0];
        }
        displayName = [part1, part2].filter(Boolean).join('_');
        // Add extension back if we have a meaningful name
        if (displayName && displayName !== fileName) {
          displayName = displayName + '.json';
        }
      }
    }
    // If no underscore or extraction failed, use original filename
    return displayName;
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
            {testcaseStatus === 'Passed' && (
              <span className="vte-status-icon vte-status-success">
                <CheckCircle2 size={16} />
              </span>
            )}
            {testcaseStatus === 'Failed' && (
              <span className="vte-status-icon vte-status-failed">
                <AlertCircle size={16} />
              </span>
            )}
            {testcaseStatus === 'Running' && (
              <span className="vte-status-icon vte-status-running">
                <Loader2 size={16} />
              </span>
            )}
            {testcase?.name || 'View Testcase Evidence'}
          </h2>
          <button className="vte-close" onClick={handleClose} aria-label="Close">
            <X size={16} />
          </button>
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
                  className={`vte-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                  onClick={() => setActiveTab('code')}
                >
                  <Code size={18} />
                  Code
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('actions')}
                >
                  <List size={18} />
                  Actions
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  <ClipboardList size={18} />
                  Execution Logs
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveTab('video')}
                >
                  <Video size={18} />
                  Recorded video
                </button>
                <button 
                  className={`vte-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}`}
                  onClick={() => setActiveTab('screenshots')}
                >
                  <ImageIcon size={18} />
                  Screenshots
                </button>
                <button 
                  className={`vte-tab-btn vte-tab-btn-database ${activeTab === 'database' ? 'active' : ''}`}
                  onClick={() => setActiveTab('database')}
                >
                  <Database size={18} className="vte-tab-database-icon" />
                  DB Executions
                </button>
                <button 
                  className={`vte-tab-btn vte-tab-btn-api ${activeTab === 'api' ? 'active' : ''}`}
                  onClick={() => setActiveTab('api')}
                >
                  <Network size={18} className="vte-tab-api-icon" />
                  API Executions
                </button>
              </div>
              
              <div className="vte-tab-content">
                {activeTab === 'logs' && (
                  <div className="vte-terminal">
                    <div className="vte-term-bar">
                      <div className="vte-term-dots">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                      </div>
                      <div className="vte-term-actions">
                        <button
                          className="vte-icon-btn"
                          type="button"
                          title="Copy logs"
                          onClick={() => handleCopyText(evidenceData.logs || '', 'Logs copied')}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="vte-icon-btn"
                          type="button"
                          title="Download logs"
                          onClick={() => handleDownloadText(evidenceData.logs || '', 'testcase-logs.txt')}
                        >
                          <Download size={16} />
                        </button>
                      </div>
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
                      videoError ? (
                        <div className="vte-no-video">
                          <div className="vte-no-video-icon">⚠️</div>
                          <div className="vte-no-video-text">Failed to load video. The video URL may be invalid or the file is not available.</div>
                        </div>
                      ) : (
                        <video 
                          style={{ width: '100%', height: '100%' }} 
                          controls 
                          src={evidenceData.video.url}
                          onError={() => setVideoError(true)}
                        />
                      )
                    ) : (
                      <div className="vte-no-video">
                        <div className="vte-no-video-icon">
                          <Video size={40} />
                        </div>
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
                          const imageName = processImageName(screenshot, index);
                          
                          return (
                            <div key={index} className="vte-screenshot-item">
                              <button 
                                className="vte-screenshot-btn"
                                onClick={() => {
                                  setSelectedImage(screenshot.url);
                                  setCurrentImageIndex(index);
                                }}
                              >
                                <ImageIcon size={16} />
                                {imageName}
                              </button>
                              <button
                                className="vte-screenshot-download-btn"
                                title="Download screenshot"
                                type="button"
                                onClick={() => handleDownloadScreenshot(screenshot.url, `${imageName || `screenshot_${index + 1}`}.png`)}
                              >
                                <Download size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="vte-no-screenshots">
                        <div className="vte-no-screenshots-icon">
                          <ImageIcon size={40} />
                        </div>
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
                          const fileName = processDatabaseFileName(fileUrl, index);
                          
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
                
                {activeTab === 'api' && (
                  <div className="vte-api-container">
                    {evidenceData.api_files && evidenceData.api_files.length > 0 ? (
                      <div className="vte-api-list">
                        {evidenceData.api_files.map((fileUrl: string, index: number) => {
                          const fileName = processApiFileName(fileUrl, index);
                          
                          return (
                            <div key={index} className="vte-api-item">
                              <div className="vte-api-info">
                                <span className="vte-api-name">{fileName}</span>
                              </div>
                              <button
                                onClick={() => handleDownloadApiFile(fileUrl, fileName)}
                                className="vte-api-download-btn"
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
                      <div className="vte-no-api">
                        <div className="vte-no-api-icon">🔌</div>
                        <div className="vte-no-api-text">No API execution files available for this testcase.</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="vte-actions-container">
                    {isActionsLoading ? (
                      <div className="vte-loading">
                        <div className="vte-spinner"></div>
                        <span>Loading actions...</span>
                      </div>
                    ) : actions.length > 0 ? (
                      <ol className="vte-actions-list">
                        {actions.map((action, index) => {
                          const value = getActionValue(action);
                          return (
                            <li key={action.action_id || `${action.action_type}-${index}`} className="vte-actions-item">
                              <span className="vte-action-index">{index + 1}</span>
                              <div className="vte-action-body">
                                <div className="vte-action-desc">{action.description || 'No description'}</div>
                                {value ? <div className="vte-action-value" title={value}>{value}</div> : null}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <div className="vte-empty">No actions available for this testcase.</div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="vte-code-container">
                    {isActionsLoading ? (
                      <div className="vte-loading">
                        <div className="vte-spinner"></div>
                        <span>Generating code...</span>
                      </div>
                    ) : (
                      <div className="vte-code-content">
                        <div className="vte-code-actions">
                          <button
                            className="vte-icon-btn"
                            type="button"
                            title="Copy code"
                            onClick={() => handleCopyText(generatedCode || '', 'Code copied')}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="vte-icon-btn"
                            type="button"
                            title="Download code"
                            onClick={() => handleDownloadText(generatedCode || '', 'testcase-code.js')}
                          >
                            <Download size={16} />
                          </button>
                        </div>
                        <div className="vte-code-editor">
                          <Editor
                            value={generatedCode || '// No code available for this testcase.'}
                            language="javascript"
                            theme="vs"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 13,
                              lineHeight: 21,
                              wordWrap: 'off',
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              readOnly: true,
                            }}
                          />
                        </div>
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

