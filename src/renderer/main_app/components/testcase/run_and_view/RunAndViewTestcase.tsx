import React, { useEffect, useMemo, useState } from 'react';
import './RunAndViewTestcase.css';
import { TestCaseService } from '../../../services/testcases';
import { ExecuteScriptsService } from '../../../services/executeScripts';
import { ActionService } from '../../../services/actions';
import { TestCaseGetResponse } from '../../../types/testcases';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { actionToCode } from '../../../../recorder/utils/action_to_code';
import { Action } from '../../../types/actions';

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
  const svc = useMemo(() => new TestCaseService(), []);
  const executeScriptsService = useMemo(() => new ExecuteScriptsService(), []);
  const actionService = useMemo(() => new ActionService(), []);

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
    if (!testcaseId) return;
    
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
            <div className="ravt-result">
              <div className="ravt-item">
                <div className="ravt-item-head">
                  <div className="ravt-item-name">{result.name}</div>
                  <div className={`ravt-item-status ${(result as any).status?.toLowerCase() || 'draft'}`}>
                    {(result as any).status || 'DRAFT'}
                  </div>
                </div>
                <div className="ravt-terminal">
                  <div className="ravt-term-bar">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                    <span className="ravt-term-title">Execution Logs</span>
                  </div>
                  <pre className="ravt-term-content">
                    {result.logs || 'No logs available for this testcase.'}
                  </pre>
                </div>
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
            disabled={isRunning || !testcaseId}
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
