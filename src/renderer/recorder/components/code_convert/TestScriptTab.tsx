import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './TestScriptTab.css';
import Editor from '@monaco-editor/react';
import { toast } from 'react-toastify';

interface TestScriptTabProps {
  script: string;
  runResult?: string;
  onScriptChange?: (code: string) => void;
  hasActions?: boolean;
}

import { useEffect } from 'react';

const TestScriptTab: React.FC<TestScriptTabProps> = ({ script, runResult, onScriptChange, hasActions = true }) => {
  const [localScript, setLocalScript] = useState(script);
  const [terminalOutput, setTerminalOutput] = useState('');

  useEffect(() => {
    if (runResult !== undefined) {
      setTerminalOutput(runResult || '');
    }
  }, [runResult]);

  useEffect(() => {
    setLocalScript(script || '');
  }, [script]);

  const handleCopyScript = async () => {
    if (!localScript) return;
    try {
      await navigator.clipboard.writeText(localScript);
      toast.success('Copied script to clipboard');
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleDownloadScript = () => {
    if (localScript) {
      const blob = new Blob([localScript], { type: 'text/plain' });
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

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // setTimeout(() => {
      const model = editor.getModel();
      if (!model) return;
  
      const lines = model.getLineCount();
      
      // Tìm tất cả các function và collapse chúng
      for (let i = 1; i <= lines; i++) {
        const line = model.getLineContent(i);
        
        // Kiểm tra nếu là function (nhưng không phải test function)
        if (line.match(/^\s*(function\s+\w+|const\s+\w+\s*=\s*\(|let\s+\w+\s*=\s*\(|var\s+\w+\s*=\s*\(|async\s+function)/) && 
            !line.match(/^\s*test\s*\(/)) {
          
          // Collapse function này bằng cách tìm range và fold
          const range = model.getFullModelRange();
          editor.setSelection({
            startLineNumber: i,
            startColumn: 1,
            endLineNumber: i,
            endColumn: 1
          });
          
          // Sử dụng Monaco API để fold
          editor.trigger('keyboard', 'editor.fold', {});
        }
      }
    // }, 200);
  };

  return (
    <div className="test-script-container">
      {/* Script Section */}
      <div className="test-script-section">
        <div className="test-script-header">
          <h3 className="test-script-title">Script</h3>
          {hasActions && (
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
          )}
        </div>
        <div className="test-script-content">
          {hasActions ? (
            <div className="test-script-editor">
              <Editor
                value={localScript}
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
                onMount={handleEditorDidMount}
              />
            </div>
          ) : (
            <div className="test-script-placeholder">
              <div className="placeholder-content">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <h3>No Actions Available</h3>
                <p>Start recording actions to generate test code</p>
              </div>
            </div>
          )}
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
              <div className="terminal-text">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {terminalOutput}
                </ReactMarkdown>
              </div>
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
