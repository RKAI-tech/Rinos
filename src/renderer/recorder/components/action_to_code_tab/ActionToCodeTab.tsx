import React, { useState } from 'react';
import './ActionToCodeTab.css';

interface ActionToCodeTabProps {
  onConvert?: () => void;
  onRun?: () => void;
}

const ActionToCodeTab: React.FC<ActionToCodeTabProps> = ({ onConvert, onRun }) => {
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
          title="Convert Actions to Code"
          onClick={handleConvert}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 7h12m0 0l-4-4m4 4l-4 4m0 6H2m0 0l4 4m-4-4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button className="rcd-run-test" onClick={() => onRun && onRun()}>Run Test</button>
      </div>
    </div>
  );
};

export default ActionToCodeTab;
