import React, { useState, useEffect, useRef } from 'react';
import { Action } from '../../../../types/actions';
import { ActionService } from '../../../../services/actions';
import { executeJavaScript } from '../../../../utils/executeJavaScript';
import '../../ActionDetailModal.css';

const actionService = new ActionService();

interface WaitActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
}

export const normalizeWaitAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
  };

  // Normalize wait time value, preserve other action_datas (like page_info)
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    // If this action_data has a value property with value field, normalize it
    if (!ad.value) return ad;
    if (!("value" in ad.value)) return ad;
      return {
        ...ad,
        value: {
          ...(ad.value || {}),
          value: String(ad.value.value),
        }
      };
  });

  return cloned;
};

const WaitActionDetail: React.FC<WaitActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
}) => {
  const [waitTime, setWaitTime] = useState<string>('1000');
  const [genFunctionDescription, setGenFunctionDescription] = useState('');
  const [genFunctionCode, setGenFunctionCode] = useState('');
  const [genFunctionName, setGenFunctionName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const prevWaitTimeRef = useRef<string>('1000');
  
  useEffect(() => {
    // Find value from action_data that has value.value (wait time)
    for (const ad of draft.action_datas || []) {
      if (ad.value?.["value"]) {
        const timeValue = String(ad.value?.["value"]);
        setWaitTime(timeValue);
        prevWaitTimeRef.current = timeValue; // Lưu giá trị ban đầu
        break;
      }
    }
  }, [draft.action_datas]);

  // Load generation prompt + function code + function name từ action_datas
  useEffect(() => {
    for (const ad of draft.action_datas || []) {
      const v: any = ad.value;
      if (v && typeof v === 'object') {
        if (v.prompt !== undefined) {
          setGenFunctionDescription(String(v.prompt || ''));
        }
        if (v.generation_data_function_code !== undefined) {
          setGenFunctionCode(String(v.generation_data_function_code || ''));
        }
        if (v.generation_data_function_name !== undefined) {
          setGenFunctionName(String(v.generation_data_function_name || ''));
        }
        if (v.prompt !== undefined || v.generation_data_function_code !== undefined || v.generation_data_function_name !== undefined) {
          return;
        }
      }
    }
    setGenFunctionDescription('');
    setGenFunctionCode('');
    setGenFunctionName('');
  }, [draft.action_datas]);

  // Cập nhật / tạo action_data cho prompt / generation_data_function_code / generation_data_function_name trong action_datas
  const upsertGenerationMeta = (partial: { 
    prompt?: string; 
    generation_data_function_code?: string;
    generation_data_function_name?: string;
  }) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];

      // Tìm action_data có value.prompt, generation_data_function_code hoặc generation_data_function_name
      let idx = actionDatas.findIndex(ad => {
        const v: any = ad.value;
        return v && typeof v === 'object' &&
          (v.prompt !== undefined || 
           v.generation_data_function_code !== undefined || 
           v.generation_data_function_name !== undefined);
      });

      if (idx === -1) {
        // Tạo action_data mới nếu chưa có
        actionDatas.push({
          value: {
            ...partial,
          },
        } as any);
        idx = actionDatas.length - 1;
      } else {
        actionDatas[idx] = {
          ...actionDatas[idx],
          value: {
            ...(actionDatas[idx].value || {}),
            ...partial,
          },
        } as any;
      }

      next.action_datas = actionDatas;
      return next;
    });
  };

  const updateGenerationDescription = (desc: string) => {
    setGenFunctionDescription(desc);
    upsertGenerationMeta({ prompt: desc });
    setGenerateError(''); // Clear error khi user thay đổi prompt
  };

  const updateGenerationFunctionCode = (code: string) => {
    setGenFunctionCode(code);
    upsertGenerationMeta({ generation_data_function_code: code });
  };

  // Handler chạy thử function code JavaScript trực tiếp trong browser
  const handleTestFunction = () => {
    if (!genFunctionCode.trim()) {
      return;
    }

    if (isTesting) {
      return; // Đang test thì không cho chạy lại
    }

    setIsTesting(true);
    setTestResult(''); // Clear kết quả cũ
    setTestError(''); // Clear error cũ

    // Gọi utility function để execute JavaScript code
    const executionResult = executeJavaScript(genFunctionCode);
    
    setTestResult(executionResult.result);
    setTestError(executionResult.error);
    setIsTesting(false);
  };

  // Handler gửi prompt để sinh function code
  const handleSendPrompt = async () => {
    if (!genFunctionDescription.trim()) {
      return;
    }

    if (isGenerating) {
      return; // Đang generate thì không cho gửi lại
    }

    try {
      setIsGenerating(true);
      setGenerateError(''); // Clear error cũ
      
      const response = await actionService.generateRandomDataFunction({
        prompt: genFunctionDescription.trim(),
      });

      // Lấy data từ response (có thể là response.data hoặc response trực tiếp)
      const data = response.data || (response as any);

      if (!response.success) {
        // Ưu tiên hiển thị issue từ data nếu có
        const errorMessage = (data && data.issue) 
          ? data.issue 
          : (response.error || 'Failed to generate function code');
        setGenerateError(errorMessage);
        return;
      }
      
      // Kiểm tra nếu data có field success (GenerateRandomDataFunctionResponse)
      if (data && typeof data === 'object') {
        // Nếu data.success = false, ưu tiên hiển thị issue
        if (data.success === false) {
          setGenerateError(data.issue || data.error || 'Generation failed');
          return;
        }
        
        // Nếu data.success = true hoặc không có field success, kiểm tra function code
        if (data.generator_data_function_code) {
          // Update function code và function name vào action_data
          updateGenerationFunctionCode(data.generator_data_function_code);
          if (data.generator_data_function_name) {
            setGenFunctionName(data.generator_data_function_name);
            upsertGenerationMeta({ generation_data_function_name: data.generator_data_function_name });
          }
          setGenerateError(''); // Clear error khi thành công
          return;
        }
        
        // Nếu có issue nhưng không có function code, ưu tiên hiển thị issue
        if (data.issue) {
          setGenerateError(data.issue);
          return;
        }
      }

      // Trường hợp không có data hoặc không có function code
      // Kiểm tra xem có issue trong response không
      const errorMessage = (data && data.issue) 
        ? data.issue 
        : 'Generated but no function code returned';
      setGenerateError(errorMessage);
    } catch (error: any) {
      console.error('Error generating function code:', error);
      setGenerateError(error.message || 'Failed to generate function code');
    } finally {
      setIsGenerating(false);
    }
  };

  // Hàm tự động sinh description dựa trên wait time (logic riêng cho wait action)
  const generateWaitDescription = (time: string, oldTime: string, currentDescription: string): string => {
    if (time.trim()) {
      // Nếu có time: "wait for {time} ms"
      // 1. Check xem trong description có giá trị nào giống time cũ không
      // 2. Nếu có, thay giá trị đó bằng giá trị mới
      if (oldTime && oldTime.trim()) {
        // Tìm pattern "wait for {oldTime} ms" hoặc "wait for {oldTime}" trong description
        const oldTimePattern = new RegExp(`wait for\\s+${oldTime.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+ms)?`, 'i');
        if (oldTimePattern.test(currentDescription)) {
          // Thay thế time cũ bằng time mới trong description
          return currentDescription.replace(oldTimePattern, `wait for ${time} ms`);
        }
      }
      // Nếu không tìm thấy time cũ, tạo description mới
      return `wait for ${time} ms`;
    } else {
      // Nếu không có time, giữ nguyên description hoặc để trống
      return currentDescription || 'wait';
    }
  };

  // Hàm update action data value - giữ nguyên các action_data khác (như page_info)
  const updateActionDataValue = (value: string) => {
    const oldTime = prevWaitTimeRef.current;
    
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value.value property (wait time), nếu không có thì tạo mới
      let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined && ad.value?.["value"] !== undefined);
      if (foundIndex === -1) {
        // Tạo action_data mới nếu chưa có
        actionDatas.push({ value: {} });
        foundIndex = actionDatas.length - 1;
      }
      
      // Cập nhật action_data tại foundIndex, giữ nguyên các action_data khác
      actionDatas[foundIndex] = {
        ...actionDatas[foundIndex],
        value: {
          ...(actionDatas[foundIndex].value || {}),
          value: value
        }
      };
      
      next.action_datas = actionDatas;
      
      // Tự động cập nhật description khi wait time thay đổi (sử dụng logic riêng)
      const currentDescription = prev.description || '';
      const newDescription = generateWaitDescription(value, oldTime, currentDescription);
      next.description = newDescription;
      
      return next;
    });
    
    // Cập nhật giá trị cũ cho lần sau
    prevWaitTimeRef.current = value;
  };

  return (
    <>
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">General</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Type</label>
            <div className="rcd-action-detail-kv-value">
              <code>{draft.action_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter action description"
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">
              Wait Time (milliseconds) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              className="rcd-action-detail-input"
              value={waitTime}
              onChange={(e) => {
                const newValue = e.target.value;
                setWaitTime(newValue);
                updateActionDataValue(newValue);
              }}
              placeholder="e.g. 1000"
              min="0"
              step="1"
            />
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              Enter the number of milliseconds to wait
            </div>
          </div>
        </div>
      </div>

      {/* Wait Data Generation section */}
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">
          Wait Data Generation
        </div>
        <div className="rcd-action-detail-grid">
          {/* Trường mô tả cách Wait data được sinh ra */}
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <div className="rcd-action-detail-kv-label-container">
              <label className="rcd-action-detail-kv-label">
                Generation Description
              </label>
              <button
                type="button"
                className="rcd-action-detail-add-btn"
                onClick={handleSendPrompt}
                disabled={!genFunctionDescription.trim() || isGenerating}
                style={{
                  opacity: !genFunctionDescription.trim() || isGenerating ? 0.5 : 1,
                  cursor: !genFunctionDescription.trim() || isGenerating ? 'not-allowed' : 'pointer',
                }}
                title="Send prompt to generate function code"
              >
                {isGenerating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{
                        animation: 'spin 1s linear infinite',
                      }}
                    >
                      <path
                        d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12L19 5L12 19L11 13L5 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
            <textarea
              className="rcd-action-detail-input"
              style={{ minHeight: 60, resize: 'vertical' }}
              value={genFunctionDescription}
              onChange={(e) => updateGenerationDescription(e.target.value)}
              placeholder="Describe how wait data is generated (e.g., what variables, patterns, or rules are used)..."
            />
            {generateError && (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '12px', 
                marginTop: '6px',
                padding: '2px 0'
              }}>
                {generateError}
              </div>
            )}
          </div>

          {/* Trường hiển thị đoạn code dùng để sinh dữ liệu Wait (read-only, lấy từ backend) */}
          {genFunctionCode.trim() && (
            <>
              <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1', marginBottom: 0, position: 'relative' }}>
                <label className="rcd-action-detail-kv-label">
                  Generation Function Code
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    className="rcd-action-detail-input"
                    style={{ 
                      minHeight: 200, 
                      resize: 'vertical', 
                      fontFamily: 'monospace',
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                      borderBottom: 'none',
                      paddingRight: '80px', // Tạo khoảng trống cho nút Run
                    }}
                    value={genFunctionCode}
                    onChange={(e) => updateGenerationFunctionCode(e.target.value)}
                    placeholder={
                      'Function/code used to generate wait-related variables.'
                    }
                    readOnly
                  />
                  {/* Nút Run nổi ở góc phải trên */}
                  <button
                    type="button"
                    className="rcd-action-detail-add-btn"
                    onClick={handleTestFunction}
                    disabled={!genFunctionCode.trim() || isTesting}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      opacity: !genFunctionCode.trim() || isTesting ? 0.5 : 1,
                      cursor: !genFunctionCode.trim() || isTesting ? 'not-allowed' : 'pointer',
                      zIndex: 10,
                    }}
                    title="Run the function code"
                  >
                    {isTesting ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            animation: 'spin 1s linear infinite',
                          }}
                        >
                          <path
                            d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        Running...
                      </span>
                    ) : (
                      <>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5 3L19 12L5 21V3Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Terminal output nối liền với code */}
              <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1', marginTop: 0, paddingTop: 0 }}>
                <div style={{
                  background: '#1f2937',
                  color: '#f9fafb',
                  borderRadius: '0 0 6px 6px',
                  padding: '12px',
                  fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  minHeight: '80px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #374151',
                  borderTop: 'none',
                }}>
                  {testError ? (
                    <div style={{ color: '#ef4444' }}>
                      {testError}
                    </div>
                  ) : testResult ? (
                    <div style={{ color: '#f9fafb' }}>
                      {testResult}
                    </div>
                  ) : (
                    <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                      Click "Run" to execute the function code...
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {/* Chỉ hiển thị Wait Data khi có dữ liệu */}
        {draft.action_data_generation && draft.action_data_generation.length > 0 && (
          <div className="rcd-action-detail-list">
            <div className="rcd-action-detail-list-item">
              {/* Danh sách các generated Wait data - chỉ hiển thị, không cho sửa */}
              <div className="rcd-action-detail-kv">
                <label className="rcd-action-detail-kv-label">
                  Wait Data
                </label>

                <div className="rcd-action-detail-selectors-list">
                  {draft.action_data_generation.map((gen, idx) => (
                    <div
                      key={gen.action_data_generation_id || idx}
                      className="rcd-action-detail-selector-item"
                    >
                      <input
                        className="rcd-action-detail-input"
                        readOnly
                        // Hiển thị dữ liệu lấy từ gen.value (JSON), ưu tiên field `value` nếu có
                        value={
                          gen.value && typeof gen.value === 'object'
                            ? ((gen.value as any).value ?? '')
                            : ''
                        }
                        placeholder="Generated data value"
                        style={{
                          cursor: 'default',
                          backgroundColor: '#f9fafb',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default WaitActionDetail;
