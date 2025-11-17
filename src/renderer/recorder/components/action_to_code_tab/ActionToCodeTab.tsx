import React, { useState } from 'react';
import './ActionToCodeTab.css';
import { Action } from '../../types/actions';

interface ActionToCodeTabProps {
  onConvert?: () => void;
  onRun?: () => void;
  onSaveAndClose?: () => void;
  activeTab?: 'actions' | 'script';
  actions?: Action[];
  isRunning?: boolean;
}

const ActionToCodeTab: React.FC<ActionToCodeTabProps> = ({ onConvert, onRun, onSaveAndClose, activeTab = 'actions', actions = [], isRunning = false }) => {
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = () => {
    setIsConverting(!isConverting);
    // Call parent's convert handler
    if (onConvert) {
      onConvert();
    }
    // TODO: Implement conversion logic
  };

  const mockCode = `// Generated test code
describe('Admin Login Test', () => {
  it('should login successfully', async () => {
    await page.goto('https://testcase.rikkei.org');
    await page.fill('#admin-email', 'hoangdinhhung20012003@gmail.com');
    await page.fill('#admin-password', '20210399');
    await page.press('#admin-password', 'Enter');
    await page.click('.admin-login-form');
  });
});`;

  return (
    <div className="rcd-action-to-code-tab">
      <div className="rcd-tab-footer">
        <button
          className="rcd-convert-btn"
          title={activeTab === 'actions' ? "Scripts tab" : "Actions tab"}
          onClick={handleConvert}
        >
          {activeTab === 'actions' ? (
            // Script icon when on actions tab
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polyline points="16,18 22,12 16,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="8,6 2,12 8,18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            // Code icon when on script tab
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <button 
          className={`rcd-run-test ${actions.length === 0 ? 'disabled' : ''} ${isRunning ? 'loading' : ''}`}
          onClick={() => !isRunning && onRun && onRun()}
          disabled={actions.length === 0 || isRunning}
        >
          {isRunning ? (
            <>
              <span className="rcd-loading-spinner" />
              Running..
            </>
          ) : (
            'Run Test'
          )}
        </button>
        <button
          className="rcd-save-close"
          onClick={() => onSaveAndClose && onSaveAndClose()}
          title="Save changes and close recorder"
        >
          Save&Close
        </button>
      </div>
    </div>
  );
};

export default ActionToCodeTab;
