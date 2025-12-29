import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Action, Element, ActionDataGeneration } from '../../../../types/actions';
import { ActionService } from '../../../../services/actions';
import { executeJavaScript } from '../../../../pages/main/utils/executeJavaScript';
import '../../ActionDetailModal.css';

const actionService = new ActionService();

interface InputActionDetailProps {
  draft: Action;
  updateDraft: (updater: (prev: Action) => Action) => void;
  updateField: (key: keyof Action, value: any) => void;
  updateElement: (index: number, updater: (el: Element) => Element) => void;
  addNewSelector: (elementIndex: number) => void;
  updateSelector: (elementIndex: number, selectorIndex: number, value: string) => void;
  removeSelector: (elementIndex: number, selectorIndex: number) => void;
}

// Export normalize function for input action
export const normalizeInputAction = (source: Action): Action => {
  const cloned: Action = {
    ...source,
    // Ensure elements selectors are trimmed and non-empty
    elements: (source.elements || []).map((el, idx) => ({
      ...el,
      selectors: (el.selectors || [])
        .map((s: any) => ({ value: (s.value || '').trim() }))
        .filter((s: any) => s.value.length > 0),
      order_index: idx + 1, // Set order_index theo thứ tự mới (1, 2, 3, ...)
    })),
  };

  // For input action, normalize all action_datas that have value
  // Preserve all existing properties in action_datas
  cloned.action_datas = (source.action_datas ?? []).map(ad => {
    if(!ad.value) return ad;
    if (!("value" in ad.value)) return ad;
    // If this action_data has a value property, normalize it
    if (ad.value !== undefined) {
      return {
        ...ad,
        value: {
          ...(ad.value || {}),
          value: String(ad.value.value),
        },
      };
    }
    // Otherwise, keep it as is
    return ad;
  });

  return cloned;
};

const InputActionDetail: React.FC<InputActionDetailProps> = ({
  draft,
  updateDraft,
  updateField,
  updateElement,
  addNewSelector,
  updateSelector,
  removeSelector,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [genFunctionDescription, setGenFunctionDescription] = useState('');
  const [genFunctionCode, setGenFunctionCode] = useState('');
  const [genFunctionName, setGenFunctionName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [editableTestResult, setEditableTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState('');
  const [generateError, setGenerateError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVersions, setEditingVersions] = useState<Array<{ version_number?: number; value: string }>>([]);
  const prevInputValueRef = useRef<string>('');
  
  useEffect(() => {
    // Find value from any action_data in the array, not just [0]
    for (const ad of draft.action_datas || []) {
      if (ad.value?.["value"]) {
        const value = ad.value?.["value"];
        setInputValue(value);
        prevInputValueRef.current = value; // Lưu giá trị ban đầu
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

  // Hàm update action data value - giữ nguyên các action_data khác
  const updateActionDataValue = (value: string) => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const actionDatas = [...(next.action_datas || [])];
      
      // Tìm action_data có value property, nếu không có thì tạo mới
      let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
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
          value
        }
      };
      
      next.action_datas = actionDatas;
      return next;
    });
  };

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

  // Helper function để truncate text
  const truncate = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Helper function để lấy max version_number
  const getMaxVersionNumber = (): number => {
    if (!draft.action_data_generation || draft.action_data_generation.length === 0) {
      return 0;
    }
    const versions = draft.action_data_generation
      .map(gen => gen.version_number || 0)
      .filter(v => v > 0);
    return versions.length > 0 ? Math.max(...versions) : 0;
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
    setEditableTestResult(''); // Clear editable result
    setTestError(''); // Clear error cũ

    // Gọi utility function để execute JavaScript code
    const executionResult = executeJavaScript(genFunctionCode);
    
    const result = executionResult.result || '';
    setTestResult(result);
    setEditableTestResult(result); // Set editable result cùng với testResult
    setTestError(executionResult.error);
    setIsTesting(false);
  };

  // Handler để lưu test result thành version mới
  const handleSaveVersion = () => {
    const valueToSave = editableTestResult || testResult;
    if (!valueToSave || !valueToSave.trim()) {
      return;
    }

    const maxVersion = getMaxVersionNumber();
    const newVersion: ActionDataGeneration = {
      version_number: maxVersion + 1,
      value: { value: valueToSave.trim() }
    };

    updateDraft(prev => ({
      ...prev,
      action_data_generation: [...(prev.action_data_generation || []), newVersion]
    }));

    // Optionally: auto-select version mới vừa tạo
    // Update inputValue để dropdown hiển thị version mới
    setInputValue(valueToSave.trim());
    updateActionDataValue(valueToSave.trim());
  };

  // Handler khi chọn version từ dropdown
  const handleVersionSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    
    if (!selectedValue) {
      return;
    }

    // Tìm version được chọn
    const selectedVersion = draft.action_data_generation?.find(
      gen => gen.version_number?.toString() === selectedValue
    );

    if (selectedVersion && selectedVersion.value) {
      const versionValue = selectedVersion.value.value || 
        (typeof selectedVersion.value === 'string' ? selectedVersion.value : '');
      
      if (versionValue) {
        const valueStr = String(versionValue);
        setInputValue(valueStr);
        updateActionDataValue(valueStr);
        prevInputValueRef.current = valueStr;
      }
    }
  };

  // Handler mở edit modal
  const handleOpenEditModal = () => {
    const versionValues = versions.map(version => {
      const versionValue = version.value?.value || 
        (typeof version.value === 'string' ? version.value : '');
      return {
        version_number: version.version_number,
        value: String(versionValue || '')
      };
    });
    setEditingVersions(versionValues);
    setIsEditModalOpen(true);
  };

  // Handler đóng edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingVersions([]);
  };

  // Handler confirm edit modal
  const handleConfirmEditModal = () => {
    updateDraft(prev => {
      const next = { ...prev } as Action;
      const updatedGenerations = (next.action_data_generation || []).map(gen => {
        const editedVersion = editingVersions.find(
          ev => ev.version_number === gen.version_number
        );
        if (editedVersion) {
          return {
            ...gen,
            value: { value: editedVersion.value }
          };
        }
        return gen;
      });
      next.action_data_generation = updatedGenerations;
      return next;
    });
    handleCloseEditModal();
  };

  // Handler update editing version value
  const handleUpdateEditingVersion = (versionNumber: number | undefined, newValue: string) => {
    setEditingVersions(prev => 
      prev.map(v => 
        v.version_number === versionNumber 
          ? { ...v, value: newValue }
          : v
      )
    );
  };

  // Memoize versions để hiển thị trong dropdown
  const versions = useMemo(() => {
    if (!draft.action_data_generation || draft.action_data_generation.length === 0) {
      return [];
    }
    return [...draft.action_data_generation].sort((a, b) => {
      const aVersion = a.version_number || 0;
      const bVersion = b.version_number || 0;
      return aVersion - bVersion;
    });
  }, [draft.action_data_generation]);

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

  const renderElements = () => {
    if (!draft.elements || draft.elements.length === 0) {
      return <div className="rcd-action-detail-empty" style={{ fontSize: '12px' }}>No elements</div>;
    }
    return (
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title" style={{ fontSize: '13px', marginBottom: '10px' }}>Elements</div>
        <div className="rcd-action-detail-list">
          {draft.elements.map((el, idx) => (
            <div key={idx} className="rcd-action-detail-list-item">
              {/* Selectors Section */}
              <div className="rcd-action-detail-kv">
                <div className="rcd-action-detail-kv-label-container">
                  <label className="rcd-action-detail-kv-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Selectors</label>
                  <button
                    type="button"
                    className="rcd-action-detail-add-btn"
                    onClick={() => addNewSelector(idx)}
                    title="Add new selector"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Add Selector
                  </button>
                </div>
                <div className="rcd-action-detail-selectors-list">
                  {el.selectors && el.selectors.length > 0 ? (
                    el.selectors.map((sel, selIdx) => (
                      <div key={selIdx} className="rcd-action-detail-selector-item">
                        <input
                          className="rcd-action-detail-input"
                          value={sel.value || ''}
                          onChange={(e) => updateSelector(idx, selIdx, e.target.value)}
                          placeholder="Enter CSS selector"
                          style={{ fontSize: '12px', padding: '6px 10px', minHeight: '32px', height: '32px' }}
                        />
                        <button
                          type="button"
                          className="rcd-action-detail-remove-btn"
                          onClick={() => removeSelector(idx, selIdx)}
                          title="Remove selector"
                          style={{ padding: '4px', width: '24px', height: '24px' }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rcd-action-detail-no-selectors" style={{ fontSize: '11px' }}>
                      No selectors. Click "Add Selector" to add one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title">General</div>
        <div className="rcd-action-detail-grid">
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Type</label>
            <div className="rcd-action-detail-kv-value" style={{ fontSize: '12px', padding: '6px 10px', minHeight: '32px' }}>
              <code style={{ fontSize: '11px' }}>{draft.action_type}</code>
            </div>
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label" style={{ fontSize: '12px', marginBottom: '6px' }}>Description</label>
            <input
              className="rcd-action-detail-input"
              value={draft.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Enter action description"
              style={{ fontSize: '12px', padding: '6px 10px', minHeight: '32px', height: '32px' }}
            />
          </div>
          <div className="rcd-action-detail-kv">
            <label className="rcd-action-detail-kv-label">Value</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <select
                className="rcd-action-detail-input"
                value={(() => {
                  if (versions.length === 0) return '';
                  // Tìm version có giá trị khớp với inputValue hiện tại
                  const matchingVersion = versions.find(v => {
                    const val = v.value?.value || (typeof v.value === 'string' ? v.value : '');
                    return String(val) === inputValue;
                  });
                  // Nếu có match thì dùng version đó, nếu không thì dùng version đầu tiên
                  return matchingVersion?.version_number?.toString() || versions[0]?.version_number?.toString() || '';
                })()}
                onChange={handleVersionSelect}
                style={{ 
                  cursor: 'pointer', 
                  flex: 1,
                  fontSize: '12px',
                  padding: '6px 10px',
                  height: '32px',
                }}
                disabled={versions.length === 0}
              >
                {versions.length === 0 ? (
                  <option value="">No versions available</option>
                ) : (
                  versions.map((version) => {
                    const versionValue = version.value?.value || 
                      (typeof version.value === 'string' ? version.value : '');
                    const displayValue = truncate(String(versionValue || ''), 50);
                    return (
                      <option 
                        key={version.version_number || `version-${version.action_data_generation_id}`} 
                        value={version.version_number?.toString() || ''}
                      >
                        {displayValue}
                      </option>
                    );
                  })
                )}
              </select>
              {versions.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  style={{
                    background: 'none',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    transition: 'all 0.2s ease',
                    minWidth: '32px',
                    height: '32px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                  title="Edit version values"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Input Data Generation section */}
      <div className="rcd-action-detail-section">
        <div className="rcd-action-detail-section-title" style={{ fontSize: '13px', marginBottom: '10px' }}>
          Input Data Generation
        </div>
        <div className="rcd-action-detail-grid">
          {/* Trường mô tả cách Input data được sinh ra */}
          <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1' }}>
            <div className="rcd-action-detail-kv-label-container">
              <label className="rcd-action-detail-kv-label" style={{ fontSize: '12px', marginBottom: '6px' }}>
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
              style={{ 
                minHeight: '40px', 
                resize: 'vertical',
                fontSize: '12px',
                padding: '6px 10px',
                lineHeight: '1.5',
              }}
              value={genFunctionDescription}
              onChange={(e) => updateGenerationDescription(e.target.value)}
              placeholder="Describe how input data is generated (e.g., what variables, patterns, or rules are used)..."
            />
            {generateError && (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '11px', 
                marginTop: '4px',
                padding: '4px 8px',
                background: '#fef2f2',
                borderRadius: '4px',
                border: '1px solid #fecaca',
              }}>
                {generateError}
              </div>
            )}
          </div>

          {/* Trường hiển thị đoạn code dùng để sinh dữ liệu Input (read-only, lấy từ backend) */}
          {genFunctionCode.trim() && (
            <>
              <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1', marginBottom: 0, position: 'relative' }}>
                <label className="rcd-action-detail-kv-label" style={{ fontSize: '12px', marginBottom: '6px' }}>
                  Generation Function Code
                </label>
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', border: '1px solid #374151' }}>
                  <textarea
                    className="rcd-action-detail-input"
                    style={{ 
                      minHeight: 160, 
                      resize: 'vertical', 
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      border: 'none',
                      borderRadius: 0,
                      padding: '12px 14px',
                      paddingRight: '70px',
                      tabSize: 2,
                      whiteSpace: 'pre',
                      overflowWrap: 'normal',
                      overflowX: 'auto',
                    }}
                    value={genFunctionCode}
                    onChange={(e) => updateGenerationFunctionCode(e.target.value)}
                    placeholder={
                      'Function/code used to generate input-related variables.'
                    }
                    spellCheck={false}
                  />
                  {/* Nút Run nổi ở góc phải trên */}
                  <button
                    type="button"
                    className="rcd-action-detail-add-btn"
                    onClick={handleTestFunction}
                    disabled={!genFunctionCode.trim() || isTesting}
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      opacity: !genFunctionCode.trim() || isTesting ? 0.5 : 1,
                      cursor: !genFunctionCode.trim() || isTesting ? 'not-allowed' : 'pointer',
                      zIndex: 10,
                      fontSize: '11px',
                      padding: '4px 8px',
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

              {/* Terminal output nối liền với code - editable */}
              <div className="rcd-action-detail-kv" style={{ gridColumn: '1 / -1', marginTop: 0, paddingTop: 0 }}>
                <div style={{ position: 'relative', borderRadius: '0 0 6px 6px', overflow: 'hidden', border: '1px solid #374151', borderTop: 'none' }}>
                  <textarea
                    className="rcd-action-detail-input"
                    style={{
                      background: '#1e1e1e',
                      color: '#d4d4d4',
                      borderRadius: 0,
                      padding: '12px 14px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      minHeight: '60px',
                      maxHeight: '180px',
                      resize: 'vertical',
                      whiteSpace: 'pre-wrap',
                      border: 'none',
                      paddingRight: '70px',
                      tabSize: 2,
                      overflowWrap: 'normal',
                      overflowX: 'auto',
                    }}
                    value={editableTestResult || testResult || ''}
                    onChange={(e) => setEditableTestResult(e.target.value)}
                    placeholder={testError ? '' : testResult ? '' : 'Click "Run" to execute the function code...'}
                    spellCheck={false}
                  />
                  {/* Button Save nổi ở góc phải */}
                  <button
                    type="button"
                    className="rcd-action-detail-add-btn"
                    onClick={handleSaveVersion}
                    disabled={!editableTestResult && !testResult}
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      right: '6px',
                      opacity: (!editableTestResult && !testResult) ? 0.5 : 1,
                      cursor: (!editableTestResult && !testResult) ? 'not-allowed' : 'pointer',
                      zIndex: 10,
                      fontSize: '11px',
                      padding: '4px 8px',
                    }}
                    title="Save generated value as new version"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M17 21V13H7V21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 3V8H15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Save
                  </button>
                </div>
                {testError && (
                  <div style={{ 
                    color: '#f87171', 
                    fontSize: '11px', 
                    marginTop: '4px',
                    padding: '8px 12px',
                    background: '#1e1e1e',
                    borderRadius: '0 0 6px 6px',
                    border: '1px solid #374151',
                    borderTop: 'none',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}>
                    {testError}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Versions Modal */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
          onClick={handleCloseEditModal}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                Edit Version Values
              </h3>
              <button
                type="button"
                onClick={handleCloseEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div
              style={{
                padding: '16px',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editingVersions.map((version, idx) => (
                  <div key={version.version_number || idx}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#374151',
                        marginBottom: '6px',
                      }}
                    >
                      Version {version.version_number || idx + 1}
                    </label>
                    <textarea
                      className="rcd-action-detail-input"
                      value={version.value}
                      onChange={(e) => handleUpdateEditingVersion(version.version_number, e.target.value)}
                      placeholder="Enter value"
                      style={{
                        minHeight: '48px',
                        resize: 'vertical',
                        width: '100%',
                        fontSize: '12px',
                        padding: '6px 10px',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={handleCloseEditModal}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEditModal}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {renderElements()}
    </>
  );
};

export default InputActionDetail;

