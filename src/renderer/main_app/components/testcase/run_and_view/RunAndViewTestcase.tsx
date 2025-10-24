import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './RunAndViewTestcase.css';
import { TestCaseService } from '../../../services/testcases';
import { TestCaseGetResponse } from '../../../types/testcases';
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
  const [activeTab, setActiveTab] = useState<'logs' | 'video'>('logs');
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
          toast.error('Testcase not found', {
            containerId: 'modal-toast-container'
          });
        }
      } else {
        toast.error(response.error || 'Failed to load testcase data', {
          containerId: 'modal-toast-container'
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'An error occurred while loading testcase', {
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
        toast.error(resp.error || 'Failed to execute testcase', {
          containerId: 'modal-toast-container'
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'An error occurred during execution', {
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

  if (!isOpen) return null;

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
          <h2 className="ravt-title">View Testcase Results</h2>
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
                  📋 Logs
                </button>
                <button 
                  className={`ravt-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                  onClick={() => setActiveTab('video')}
                >
                  🎥 Video
                </button>
              </div>
              
              <div className="ravt-tab-content">
                {activeTab === 'logs' && (
                  <div className="ravt-terminal">
                    <div className="ravt-term-bar">
                      <span className="dot red" />
                      <span className="dot yellow" />
                      <span className="dot green" />
                      <span className="ravt-term-title">Execution Logs</span>
                    </div>
                    <div className="ravt-term-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result.logs || 'No logs available for this testcase.'}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {activeTab === 'video' && (
                  <div className="ravt-video-container">
                    {result.url_video ? (
                      <video style={{ width: '100%', height: '100%' }} controls src={result.url_video} />
                    ) : (
                      <div className="ravt-no-video">
                        <div className="ravt-no-video-icon">🎥</div>
                        <div className="ravt-no-video-text">No video available for this testcase.</div>
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
