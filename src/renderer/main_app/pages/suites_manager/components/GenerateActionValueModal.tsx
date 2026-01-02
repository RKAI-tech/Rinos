import React, { useState, useEffect } from 'react';
import { Action } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import { executeJavaScript } from '../../../utils/executeJavaScript';
import { toast } from 'react-toastify';
import './GenerateActionValueModal.css';

interface GenerateActionValueModalProps {
  action: Action;
  onClose: () => void;
  onSave: (value: any) => void;
}

const actionService = new ActionService();

const GenerateActionValueModal: React.FC<GenerateActionValueModalProps> = ({
  action,
  onClose,
  onSave,
}) => {
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [generatedValue, setGeneratedValue] = useState<any>(null);
  const [generatedValueText, setGeneratedValueText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  // Load prompt and code from action.action_datas
  useEffect(() => {
    let loadedPrompt = '';
    let loadedCode = '';
    
    for (const ad of action.action_datas || []) {
      const v: any = ad.value;
      if (v && typeof v === 'object') {
        if (v.prompt !== undefined) {
          loadedPrompt = String(v.prompt || '');
        }
        if (v.generation_data_function_code !== undefined) {
          loadedCode = String(v.generation_data_function_code || '');
        }
        // If we found both, we can break
        if (loadedPrompt && loadedCode) {
          break;
        }
      }
    }
    
    setPrompt(loadedPrompt);
    setCode(loadedCode);
  }, [action]);

  const handleSendPrompt = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError('');
    
    try {
      const response = await actionService.generateRandomDataFunction({
        prompt: prompt.trim(),
      });

      const data = response.data || (response as any);

      if (!response.success) {
        const errorMessage = (data && data.issue) 
          ? data.issue 
          : (response.error || 'Failed to generate function code');
        setError(errorMessage);
        setIsGenerating(false);
        return;
      }
      
      if (data && typeof data === 'object') {
        if (data.success === false) {
          setError(data.issue || data.error || 'Generation failed');
          setIsGenerating(false);
          return;
        }
        
        if (data.generator_data_function_code) {
          setCode(data.generator_data_function_code);
          setError('');
          setIsGenerating(false);
          return;
        }
        
        if (data.issue) {
          setError(data.issue);
          setIsGenerating(false);
          return;
        }
      }

      setError('No function code generated');
      setIsGenerating(false);
    } catch (error: any) {
      setError(error.message || 'Failed to generate function code');
      setIsGenerating(false);
    }
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Please generate code first');
      return;
    }

    setIsRunning(true);
    setError('');
    setGeneratedValue(null);

    try {
      const executionResult = executeJavaScript(code);
      if (executionResult.error) {
        setError(`Error executing function: ${executionResult.error}`);
        setIsRunning(false);
        return;
      }
      
      const resultStr = executionResult.result.trim();
      let parsedValue: any = '';
      try {
        parsedValue = JSON.parse(resultStr);
        setGeneratedValueText(JSON.stringify(parsedValue, null, 2));
      } catch {
        parsedValue = resultStr || '';
        setGeneratedValueText(resultStr);
      }
      
      setGeneratedValue(parsedValue);
      setError('');
      setIsRunning(false);
    } catch (error: any) {
      setError(`Error executing function: ${error.message}`);
      setIsRunning(false);
    }
  };

  const handleSave = () => {
    if (!generatedValueText.trim()) {
      toast.error('Please run the code first to generate a value or enter a value manually');
      return;
    }

    // Try to parse as JSON, if fails use as string
    let valueToSave: any = generatedValueText.trim();
    try {
      valueToSave = JSON.parse(generatedValueText.trim());
    } catch {
      // Keep as string if not valid JSON
      valueToSave = generatedValueText.trim();
    }

    onSave(valueToSave);
    onClose();
  };

  return (
    <div className="generate-action-value-modal-overlay" onClick={onClose}>
      <div className="generate-action-value-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="generate-action-value-modal-header">
          <div className="generate-action-value-modal-title-wrapper">
            <h3 className="generate-action-value-modal-title">
              Generate new action value
            </h3>
          </div>
          <button className="generate-action-value-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="generate-action-value-modal-body">
          {/* Prompt Section */}
          <div className="generate-action-value-section">
            <div className="generate-action-value-label-row">
              <label className="generate-action-value-label">Prompt:</label>
              <button
                className="generate-action-value-send-btn"
                onClick={handleSendPrompt}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? 'Generating...' : 'Send'}
              </button>
            </div>
            <textarea
              className="generate-action-value-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt to generate function code..."
            />
          </div>

          {/* Code Section */}
          <div className="generate-action-value-section">
            <div className="generate-action-value-label-row">
              <label className="generate-action-value-label">Code:</label>
              <button
                className="generate-action-value-run-btn"
                onClick={handleRunCode}
                disabled={isRunning || !code.trim()}
              >
                {isRunning ? 'Running...' : 'Run'}
              </button>
            </div>
            <textarea
              className="generate-action-value-code-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter or generate function code..."
            />
          </div>

          {/* Generated Value Section */}
          <div className="generate-action-value-section">
            <label className="generate-action-value-label">Generated Value:</label>
            <textarea
              className="generate-action-value-value-textarea"
              value={generatedValueText}
              onChange={(e) => setGeneratedValueText(e.target.value)}
              placeholder="Run the code to generate value or enter manually..."
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="generate-action-value-error">
              {error}
            </div>
          )}
        </div>

        <div className="generate-action-value-modal-footer">
          <button className="generate-action-value-modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="generate-action-value-modal-btn-save"
            onClick={handleSave}
            disabled={!generatedValueText.trim()}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateActionValueModal;

