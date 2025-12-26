import React, { useState, useMemo } from 'react';
import { Action, ActionDataGeneration } from '../../types/actions';
import { executeJavaScript } from '../../pages/main/utils/executeJavaScript';
import { toast } from 'react-toastify';
import './DataVersionModal.css';

export type ActionOperationResult = {
  success: boolean;
  message?: string;
  level?: 'success' | 'warning' | 'error';
};

interface DataVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: Action[];
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
  onSaveActions?: () => Promise<ActionOperationResult | void> | ActionOperationResult | void;
  isSaving?: boolean;
}

const DataVersionModal: React.FC<DataVersionModalProps> = ({
  isOpen,
  onClose,
  actions,
  onActionsChange,
  onSaveActions,
  isSaving,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const saveTimeoutRef = React.useRef<number | null>(null);
  const successDisplayDuration = 1600;

  const clearSaveTimeout = () => {
    if (saveTimeoutRef.current != null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      clearSaveTimeout();
    };
  }, []);

  const normalizeResult = (result?: ActionOperationResult | void): ActionOperationResult => {
    if (!result) {
      return { success: true };
    }
    return result;
  };

  const setSaveSuccessWithTimeout = () => {
    clearSaveTimeout();
    setSaveStatus('success');
    saveTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus('idle');
      saveTimeoutRef.current = null;
    }, successDisplayDuration);
  };

  const handleSaveClick = async () => {
    if (!onSaveActions) {
      toast.warning('Save function is not available.');
      return;
    }

    if (saveStatus === 'loading' || isSaving) {
      return;
    }

    clearSaveTimeout();
    setSaveStatus('loading');

    try {
      const rawResult = await onSaveActions();
      const normalized = normalizeResult(rawResult);
      if (normalized.success) {
        setSaveSuccessWithTimeout();
        toast.success('Data versions saved successfully.');
      } else {
        setSaveStatus('idle');
        toast.error(normalized.message || 'Failed to save data versions.');
      }
    } catch (error: any) {
      setSaveStatus('idle');
      toast.error(`Failed to save: ${error.message || 'Unknown error'}`);
    }
  };

  const shouldShowSaveSpinner = saveStatus === 'loading' || (saveStatus === 'idle' && !!isSaving);

  const successIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="success">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M8 12.5L10.5 15L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  // Thu thập và nhóm tất cả action_data_generation theo version_number
  const versionsMap = useMemo(() => {
    const map = new Map<number, Array<{
      action: Action;
      generation: ActionDataGeneration;
      actionIndex: number;
    }>>();

    actions.forEach((action, actionIndex) => {
      if (action.action_data_generation && action.action_data_generation.length > 0) {
        action.action_data_generation.forEach((generation) => {
          const versionNumber = generation.version_number || 1;
          if (!map.has(versionNumber)) {
            map.set(versionNumber, []);
          }
          map.get(versionNumber)!.push({
            action,
            generation,
            actionIndex,
          });
        });
      }
    });

    // Sắp xếp các items trong mỗi version theo action index
    map.forEach((items) => {
      items.sort((a, b) => a.actionIndex - b.actionIndex);
    });

    return map;
  }, [actions]);

  // Lấy danh sách các version numbers và sắp xếp
  const versionNumbers = useMemo(() => {
    return Array.from(versionsMap.keys()).sort((a, b) => a - b);
  }, [versionsMap]);

  // Set version đầu tiên làm selected khi mở modal hoặc khi versionNumbers thay đổi
  React.useEffect(() => {
    if (isOpen && versionNumbers.length > 0 && selectedVersion === null) {
      setSelectedVersion(versionNumbers[0]);
    }
  }, [isOpen, versionNumbers, selectedVersion]);

  // Reset selected version khi đóng modal
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedVersion(null);
    }
  }, [isOpen]);

  // Tìm max version number để tạo version mới
  const maxVersionNumber = useMemo(() => {
    if (versionNumbers.length === 0) return 0;
    return Math.max(...versionNumbers);
  }, [versionNumbers]);

  // Handler để add version mới
  const handleAddVersion = async () => {
    if (!onActionsChange) {
      toast.error('Cannot update actions. Please refresh and try again.');
      return;
    }

    setIsAddingVersion(true);

    try {
      // Tìm tất cả actions có generation_data_function_code
      const actionsWithGenerationFunction: Array<{
        action: Action;
        actionIndex: number;
        functionCode: string;
      }> = [];

      actions.forEach((action, actionIndex) => {
        // Tìm generation_data_function_code trong action_datas
        for (const ad of action.action_datas || []) {
          const v: any = ad.value;
          if (v && typeof v === 'object' && v.generation_data_function_code) {
            const functionCode = String(v.generation_data_function_code || '').trim();
            if (functionCode) {
              actionsWithGenerationFunction.push({
                action,
                actionIndex,
                functionCode,
              });
              break; // Chỉ lấy function code đầu tiên tìm thấy
            }
          }
        }
      });

      if (actionsWithGenerationFunction.length === 0) {
        toast.warning('No actions with generation function code found.');
        setIsAddingVersion(false);
        return;
      }

      // Tạo version number mới
      const newVersionNumber = maxVersionNumber + 1;

      // Chạy function code cho mỗi action và tạo action_data_generation mới
      onActionsChange((prevActions) => {
        return prevActions.map((action) => {
          // Tìm action này trong danh sách có generation function
          const actionWithFunction = actionsWithGenerationFunction.find(
            (item) => item.action.action_id === action.action_id
          );

          if (!actionWithFunction) {
            // Action không có generation function, giữ nguyên
            return action;
          }

          // Chạy function code để sinh data mới
          let generatedValue: any = '';
          try {
            const executionResult = executeJavaScript(actionWithFunction.functionCode);
            if (executionResult.error) {
              console.error(`Error executing function for action ${action.action_id}:`, executionResult.error);
              // Vẫn tạo version nhưng với giá trị rỗng hoặc error message
              generatedValue = '';
            } else {
              // Parse result nếu có thể
              const resultStr = executionResult.result.trim();
              try {
                // Thử parse JSON
                generatedValue = JSON.parse(resultStr);
              } catch {
                // Nếu không phải JSON, dùng string
                generatedValue = resultStr || '';
              }
            }
          } catch (error: any) {
            console.error(`Error executing function for action ${action.action_id}:`, error);
            generatedValue = '';
          }

          // Tạo action_data_generation mới
          const newGeneration: ActionDataGeneration = {
            value: {
              value: generatedValue,
            },
            version_number: newVersionNumber,
          };

          // Thêm vào action_data_generation
          const updatedAction: Action = {
            ...action,
            action_data_generation: [
              ...(action.action_data_generation || []),
              newGeneration,
            ],
          };

          return updatedAction;
        });
      });

      // Chọn version mới vừa tạo
      setSelectedVersion(newVersionNumber);

      toast.success(`Version ${newVersionNumber} created successfully for ${actionsWithGenerationFunction.length} action(s).`);
    } catch (error: any) {
      console.error('Error adding new version:', error);
      toast.error(`Failed to create new version: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingVersion(false);
    }
  };

  if (!isOpen) return null;

  const currentVersionData = selectedVersion !== null ? versionsMap.get(selectedVersion) || [] : [];

  return (
    <div className="data-version-modal-overlay" onClick={onClose}>
      <div className="data-version-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="data-version-modal-header">
          <h2 className="data-version-modal-title">Manage Data Versions</h2>
          <button
            className="data-version-modal-close"
            onClick={onClose}
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

        {versionNumbers.length === 0 ? (
          <div className="data-version-modal-body">
            <div className="data-version-empty">
              <p>No data versions have been created.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Version Dropdown */}
            <div className="data-version-selector">
              <label className="data-version-selector-label">Select Version:</label>
              <select
                className="data-version-select"
                value={selectedVersion || ''}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
              >
                {versionNumbers.map((versionNum) => {
                  const count = versionsMap.get(versionNum)?.length || 0;
                  return (
                    <option key={versionNum} value={versionNum}>
                      Version {versionNum} ({count} {count === 1 ? 'item' : 'items'})
                    </option>
                  );
                })}
              </select>
              <button
                className="data-version-add-btn"
                onClick={handleAddVersion}
                disabled={isAddingVersion || !onActionsChange}
                title="Add new version by executing generation functions"
              >
                {isAddingVersion ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                    Adding...
                  </span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Add Version
                  </>
                )}
              </button>
            </div>

            {/* Version Content */}
            <div className="data-version-modal-body">
              {selectedVersion !== null && currentVersionData.length > 0 ? (
                <div className="data-version-list">
                  {currentVersionData.map((item, idx) => {
                    const { action, generation, actionIndex } = item;
                    const value = generation.value && typeof generation.value === 'object'
                      ? (generation.value as any).value ?? JSON.stringify(generation.value)
                      : generation.value || '';

                    return (
                      <div key={`${action.action_id}-${generation.action_data_generation_id || idx}`} className="data-version-item">
                        <div className="data-version-item-header">
                          <div className="data-version-item-info">
                            <span className="data-version-action-index">Action #{actionIndex + 1}</span>
                            <span className="data-version-action-type">{action.action_type}</span>
                          </div>
                          {action.description && (
                            <div className="data-version-action-description">{action.description}</div>
                          )}
                        </div>
                        <div className="data-version-item-value">
                          <label className="data-version-value-label">Value:</label>
                          <div className="data-version-value-content">
                            {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="data-version-empty">
                  <p>No data found for this version.</p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="data-version-modal-footer">
          <button className="data-version-modal-btn-close" onClick={onClose}>
            Close
          </button>
          {onSaveActions && (
            <button
              className="data-version-modal-btn-save"
              onClick={handleSaveClick}
              disabled={shouldShowSaveSpinner}
              title="Save data versions to backend"
            >
              {saveStatus === 'success' && !shouldShowSaveSpinner ? (
                successIcon
              ) : shouldShowSaveSpinner ? (
                <span className="data-version-spinner" aria-label="saving" />
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="17,21 17,13 7,13 7,21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="7,3 7,8 15,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Save
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataVersionModal;
