import React, { useState } from 'react';
import './TestScriptTab.css';

const TestScriptTab: React.FC = () => {
  const [script, setScript] = useState('');
  const [terminalOutput, setTerminalOutput] = useState('');

  const handleCopyScript = () => {
    if (script) {
      navigator.clipboard.writeText(script);
      // TODO: Show toast notification
    }
  };

  const handleDownloadScript = () => {
    if (script) {
      const blob = new Blob([script], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-script.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleRunScript = () => {
    // TODO: Implement script execution
    setTerminalOutput('Script executed successfully!\n');
  };


  return (
    <div className="test-script-container">
      {/* Script Section */}
      <div className="test-script-section">
        <div className="test-script-header">
          <h3 className="test-script-title">Script</h3>
          <div className="test-script-actions">
            <button 
              className="test-script-btn copy-btn" 
              title="Copy Script"
              onClick={handleCopyScript}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </button>
            <button 
              className="test-script-btn download-btn" 
              title="Download Script"
              onClick={handleDownloadScript}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="test-script-content">
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="// Generated test script will appear here..."
            className="test-script-textarea"
          />
        </div>
      </div>

      {/* Terminal Section */}
      <div className="test-terminal-section">
        <div className="test-terminal-header">
          <div className="terminal-controls">
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
          </div>
          <h3 className="test-terminal-title">Terminal</h3>
        </div>
        <div className="test-terminal-content">
          <div className="terminal-output">
            {terminalOutput ? (
              <pre className="terminal-text">{terminalOutput}</pre>
            ) : (
              <div className="terminal-placeholder">
                Terminal output will appear here when you run the script...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestScriptTab;
