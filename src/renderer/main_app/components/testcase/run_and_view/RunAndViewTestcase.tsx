import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Download, Network, ClipboardList, Video, Image as ImageIcon, Database, Play, X, CheckCircle2, AlertCircle, Loader2, List, Code, Copy } from 'lucide-react';
import './RunAndViewTestcase.css';
import { TestCaseService } from '../../../services/testcases';
import { Screenshot, TestCase as TestCaseGetResponse } from '../../../types/testcases';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { hasPermissionOrHigher } from '../../../hooks/useProjectPermissions';
import { Project } from '../../../types/projects';
import { ActionService } from '../../../services/actions';
import { Action as MainAction } from '../../../types/actions';
import { CodeGenerator } from '../../../../shared/services/codeGenerator';
import { Action as SharedAction, BasicAuthentication } from '../../../../shared/types/actions';
import Editor from '@monaco-editor/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  testcaseId?: string | null;
  testcaseName?: string;
  projectId?: string;
  projectData?: Project | null;
  testcaseData?: TestCaseGetResponse | null;
  onReloadTestcases?: () => Promise<void>;
}

const RunAndViewTestcase: React.FC<Props> = ({ isOpen, onClose, testcaseId, testcaseName, projectId, projectData, testcaseData, onReloadTestcases }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestCaseGetResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'video' | 'screenshots' | 'database' | 'api' | 'actions' | 'code'>('logs');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [actions, setActions] = useState<MainAction[]>([]);
  const [isActionsLoading, setIsActionsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const svc = useMemo(() => new TestCaseService(), []);
  const actionSvc = useMemo(() => new ActionService(), []);
  const codeGen = useMemo(() => new CodeGenerator(), []);
  
  // Calculate canEditPermission from projectData
  const canEditPermission = useMemo(() => {
    if (!projectData?.user_permissions) return false;
    const permissions = String(projectData.user_permissions)
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    return hasPermissionOrHigher('CAN_EDIT', permissions);
  }, [projectData]);

  // Load testcase data when modal opens (use existing data, only fetch if missing)
  useEffect(() => {
    if (!isOpen) {
      setVideoError(false);
      return;
    }
    
    // Sử dụng dữ liệu đã có sẵn - KHÔNG cần fetch
    if (testcaseData) {
      setResult(testcaseData);
    } else if (testcaseId) {
      // Chỉ fetch khi không có testcaseData (edge case)
      void loadTestcaseData();
    }
  }, [isOpen, testcaseId]);

  // Reset video error when URL changes
  useEffect(() => {
    setVideoError(false);
  }, [result?.evidence?.video?.url]);

  // Reset video error when tab changes to video
  useEffect(() => {
    if (activeTab === 'video') {
      setVideoError(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOpen || !testcaseId) {
      setActions([]);
      setGeneratedCode('');
      return;
    }
    void loadActions();
  }, [isOpen, testcaseId]);

  useEffect(() => {
    if (!actions.length) {
      setGeneratedCode('');
      return;
    }
    const code = codeGen.generateCode(
      (result?.basic_authentication || null) as BasicAuthentication | null,
      actions as unknown as SharedAction[]
    );
    setGeneratedCode(code || '');
  }, [actions, result?.basic_authentication, codeGen]);
  
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

  const loadActions = async () => {
    if (!testcaseId) return;
    try {
      setIsActionsLoading(true);
      const resp = await actionSvc.getActionsByTestCase(testcaseId, undefined, undefined, projectId);
      if (resp.success) {
        setActions(resp.data?.actions || []);
      } else {
        toast.error(resp.error || 'Failed to load actions. Please try again.', {
          containerId: 'modal-toast-container'
        });
        setActions([]);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load actions. Please try again.', {
        containerId: 'modal-toast-container'
      });
      setActions([]);
    } finally {
      setIsActionsLoading(false);
    }
  };

  const handleRunTestcase = async () => {
    if (!testcaseId || !canEditPermission) return;
    try {
      setIsRunning(true);
      const resp = await svc.executeTestCase({ testcase_id: testcaseId, evidence_id: testcaseData?.evidence?.evidence_id || undefined, project_id: projectId || undefined });
      
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
    setSelectedImage(null);
    setIsFullscreen(false);
    setShowControls(false);
    setActions([]);
    setGeneratedCode('');
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
      toast.error(error instanceof Error ? error.message : 'Failed to download file. Please try again.', {
        containerId: 'modal-toast-container'
      });
    }
  };

  const handleDownloadApiFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        toast.error('Failed to download file. Please try again.', {
          containerId: 'modal-toast-container'
        });
        return;
      }

      const blob = await response.blob();
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
      toast.error(error instanceof Error ? error.message : 'Failed to download file. Please try again.', {
        containerId: 'modal-toast-container'
      });
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
      toast.error(error instanceof Error ? error.message : 'Failed to download screenshot. Please try again.', {
        containerId: 'modal-toast-container'
      });
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
    const urlParts = screenshot.url.split('/');
    const fileName = urlParts[urlParts.length - 1];
    let imageName = fileName;
    
    if (fileName.includes('_')) {
      const parts = fileName.split('_');
      if (parts.length > 1) {
        let part1 = parts[1] || '';
        let part2 = parts[2] || '';
        if (part2.includes('.png')) {
          part2 = part2.split('.png')[0];
        }
        imageName = [part1, part2].filter(Boolean).join('_');
      }
    } else {
      imageName = `Verification (${index + 1})`;
    }
    return imageName;
  };

  const processDatabaseFileName = (fileUrl: string, index: number) => {
    // Extract file name from URL pattern: after code and _ prefix, before .xlsx
    console.log('[RunAndViewTestcase] Database File URL', fileUrl);
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
    console.log('[RunAndViewTestcase] API File URL', fileUrl);
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
            {testcaseStatus === 'Passed' && (
              <span className="ravt-status-icon ravt-status-success">
                <CheckCircle2 size={16} />
              </span>
            )}
            {testcaseStatus === 'Failed' && (
              <span className="ravt-status-icon ravt-status-failed">
                <AlertCircle size={16} />
              </span>
            )}
            {testcaseStatus === 'Running' && (
              <span className="ravt-status-icon ravt-status-running">
                <Loader2 size={16} />
              </span>
            )}
            {testcaseName || 'View Testcase Results'}
          </h2>
          <button className="ravt-close" onClick={handleClose} aria-label="Close">
            <X size={16} />
          </button>
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
                  className={`ravt-tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                  onClick={() => setActiveTab('code')}
                >
                  <Code size={18} />
                  Code
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                  onClick={() => setActiveTab('actions')}
                >
                  <List size={18} />
                  Actions
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                  onClick={() => setActiveTab('logs')}
                >
                  <ClipboardList size={18} />
                  Execution Logs
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveTab('video')}
                >
                  <Video size={18} />
                  Recorded video
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'screenshots' ? 'active' : ''}`}
                  onClick={() => setActiveTab('screenshots')}
                >
                  <ImageIcon size={18} />
                  Screenshots
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
                  onClick={() => setActiveTab('database')}
                >
                  <Database size={18} />
                  DB Executions
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'api' ? 'active' : ''}`}
                  onClick={() => setActiveTab('api')}
                >
                  <Network size={18} />
                  API Executions
                </button>
              </div>
              
              <div className="ravt-tab-content">
                {activeTab === 'logs' && (
                  <div className="ravt-terminal">
                    <div className="ravt-term-bar">
                      <div className="ravt-term-dots">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                      </div>
                      <div className="ravt-term-actions">
                        <button
                          className="ravt-icon-btn"
                          type="button"
                          title="Copy logs"
                          onClick={() => handleCopyText(result.evidence?.log?.content || '', 'Logs copied')}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          className="ravt-icon-btn"
                          type="button"
                          title="Download logs"
                          onClick={() => handleDownloadText(result.evidence?.log?.content || '', 'testcase-logs.txt')}
                        >
                          <Download size={16} />
                        </button>
                      </div>
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
                      videoError ? (
                        <div className="ravt-no-video">
                          <div className="ravt-no-video-icon">⚠️</div>
                          <div className="ravt-no-video-text">Failed to load video. The video URL may be invalid or the file is not available.</div>
                        </div>
                      ) : (
                        <video 
                          style={{ width: '100%', height: '100%' }} 
                          controls 
                          src={result.evidence?.video?.url}
                          onError={() => setVideoError(true)}
                        />
                      )
                    ) : (
                      <div className="ravt-no-video">
                        <div className="ravt-no-video-icon">
                          <Video size={40} />
                        </div>
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
                          const imageName = processImageName(screenshot, index);
                          return (
                            <div key={index} className="ravt-screenshot-item">
                              <button 
                                className="ravt-screenshot-btn"
                                onClick={() => {
                                  setSelectedImage(screenshot.url);
                                  setCurrentImageIndex(index);
                                }}
                              >
                                <ImageIcon size={16} />
                                {imageName}
                              </button>
                              <button
                                className="ravt-screenshot-download-btn"
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
                      <div className="ravt-no-screenshots">
                        <div className="ravt-no-screenshots-icon">
                          <ImageIcon size={40} />
                        </div>
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
                              ‹
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
                              ›
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
                
                {activeTab === 'database' && (
                  <div className="ravt-database-container">
                    {(() => {
                      // Get database_files from result
                      // API getTestCases may return database_files directly on testcase object
                      const tc = result as any;
          
                      const databaseFiles = tc?.evidence?.database_files || [];
                      console.log("databaseFiles", databaseFiles);
                      // Ensure it's an array
                      let filesArray: string[] = [];
                      for (const file of databaseFiles) {
                        if (typeof file === 'string') {
                          filesArray.push(file as string);
                        }else if (file && typeof file === 'object' && 'url' in file) {
                          filesArray.push(file.url as string);
                        }
                      }
                      
                      return filesArray.length > 0 ? (
                        <div className="ravt-database-list">
                          {filesArray.map((fileUrl: string, index: number) => {
                            const fileName = processDatabaseFileName(fileUrl, index);
                            
                            return (
                              <div key={index} className="ravt-database-item">
                                <div className="ravt-database-info">
                                  <span className="ravt-database-name">{fileName}</span>
                                </div>
                                <button
                                  onClick={() => handleDownloadDatabaseFile(fileUrl, fileName)}
                                  className="ravt-database-download-btn"
                                  title="Download"
                                  type="button"
                                >
                                  <Download className="ravt-download-icon" size={18} />
                                </button>
                              </div>
                            );
                          }).filter(Boolean)}
                        </div>
                      ) : (
                        <div className="ravt-no-database">
                          <div className="ravt-no-database-icon">📊</div>
                          <div className="ravt-no-database-text">No database execution files available for this testcase.</div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'api' && (
                  <div className="ravt-api-container">
                    {(() => {
                      const tc = result as any;
                      const apiFiles = tc?.evidence?.api_files || [];

                      let filesArray: string[] = [];
                      for (const file of apiFiles) {
                        if (typeof file === 'string') {
                          filesArray.push(file as string);
                        } else if (file && typeof file === 'object' && 'url' in file) {
                          filesArray.push((file as any).url as string);
                        }
                      }

                      return filesArray.length > 0 ? (
                        <div className="ravt-api-list">
                          {filesArray.map((fileUrl: string, index: number) => {
                            const fileName = processApiFileName(fileUrl, index);

                            return (
                              <div key={index} className="ravt-api-item">
                                <div className="ravt-api-info">
                                  <span className="ravt-api-name">{fileName}</span>
                                </div>
                                <button
                                  onClick={() => handleDownloadApiFile(fileUrl, fileName)}
                                  className="ravt-api-download-btn"
                                  title="Download"
                                  type="button"
                                >
                                  <Download className="ravt-download-icon" size={18} />
                                </button>
                              </div>
                            );
                          }).filter(Boolean)}
                        </div>
                      ) : (
                        <div className="ravt-no-api">
                          <div className="ravt-no-api-icon">🔌</div>
                          <div className="ravt-no-api-text">No API execution files available for this testcase.</div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="ravt-actions-container">
                    {isActionsLoading ? (
                      <div className="ravt-loading">
                        <div className="ravt-spinner"></div>
                        <span>Loading actions...</span>
                      </div>
                    ) : actions.length > 0 ? (
                      <ol className="ravt-actions-list">
                        {actions.map((action, index) => {
                          const value = getActionValue(action);
                          return (
                            <li key={action.action_id || `${action.action_type}-${index}`} className="ravt-actions-item">
                              <span className="ravt-action-index">{index + 1}</span>
                              <div className="ravt-action-body">
                                <div className="ravt-action-desc">{action.description || 'No description'}</div>
                                {value ? <div className="ravt-action-value" title={value}>{value}</div> : null}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <div className="ravt-empty">No actions available for this testcase.</div>
                    )}
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="ravt-code-container">
                    {isActionsLoading ? (
                      <div className="ravt-loading">
                        <div className="ravt-spinner"></div>
                        <span>Generating code...</span>
                      </div>
                    ) : (
                      <div className="ravt-code-content">
                        <div className="ravt-code-actions">
                          <button
                            className="ravt-icon-btn"
                            type="button"
                            title="Copy code"
                            onClick={() => handleCopyText(generatedCode || '', 'Code copied')}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            className="ravt-icon-btn"
                            type="button"
                            title="Download code"
                            onClick={() => handleDownloadText(generatedCode || '', 'testcase-code.js')}
                          >
                            <Download size={16} />
                          </button>
                        </div>
                        <div className="ravt-code-editor">
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
