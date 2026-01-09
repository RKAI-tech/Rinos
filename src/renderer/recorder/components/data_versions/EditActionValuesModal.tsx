import React, { useState, useEffect } from 'react';
import { Action, ActionDataGeneration } from '../../types/actions';
import { TestCaseDataVersion } from '../../types/testcase';
import { toast } from 'react-toastify';
import EditValueItem from './EditValueItem';
import { findActiveVersionInActions, syncGenerationsBetweenActionsAndVersions } from './versionSyncUtils';
import './EditActionValuesModal.css';

interface EditActionValuesModalProps {
  action: Action;
  onClose: () => void;
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
  onValueUpdated?: () => void;
  testcaseDataVersions?: TestCaseDataVersion[];
  onTestCaseDataVersionsChange?: (updater: (prev: TestCaseDataVersion[]) => TestCaseDataVersion[]) => void;
}

const EditActionValuesModal: React.FC<EditActionValuesModalProps> = ({
  action,
  onClose,
  onActionsChange,
  onValueUpdated,
  testcaseDataVersions,
  onTestCaseDataVersionsChange,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentAction, setCurrentAction] = useState<Action>(action);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [tempNewValue, setTempNewValue] = useState<ActionDataGeneration | null>(null);
  const generations = currentAction.action_data_generation || [];

  // Sync with action prop when it changes
  useEffect(() => {
    setCurrentAction(action);
    // Cancel editing if action changes
    if (editingIndex !== null) {
      setEditingIndex(null);
    }
    // Clear adding new state when action changes
    setIsAddingNew(false);
    setTempNewValue(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (value: any) => {
    if (!onActionsChange) {
      return;
    }

    if (!currentAction.action_id) {
      toast.error('Invalid action ID');
      return;
    }

    // Kiểm tra nếu value rỗng
    const isEmpty = !value || (typeof value === 'string' && !value.trim());

    if (isEmpty) {
      toast.error('Value cannot be empty');
      return;
    }

    // Nếu đang thêm value mới
    if (isAddingNew && tempNewValue) {
      // Thêm value mới vào danh sách
      onActionsChange(prev => {
        const updated = prev.map(a => {
          if (a.action_id === currentAction.action_id) {
            const updatedAction = {
              ...a,
              action_data_generation: [
                ...(a.action_data_generation || []),
                {
                  ...tempNewValue,
                  value: { value: value },
                }
              ],
            };
            setCurrentAction(updatedAction);
            return updatedAction;
          }
          return a;
        });

        // SYNC: Đồng bộ với versions
        if (testcaseDataVersions && onTestCaseDataVersionsChange) {
          const activeVersionName = findActiveVersionInActions(updated);
          const { updatedVersions } = syncGenerationsBetweenActionsAndVersions(
            updated,
            testcaseDataVersions,
            activeVersionName
          );
          onTestCaseDataVersionsChange(() => updatedVersions);
        }

        return updated;
      });

      setIsAddingNew(false);
      setTempNewValue(null);
      setEditingIndex(null);
      toast.success('New value added successfully');
      if (onValueUpdated) {
        onValueUpdated();
      }
      return;
    }

    // Nếu đang edit value hiện có
    if (editingIndex !== null) {
      const generationToUpdate = generations[editingIndex];
      const generationId = generationToUpdate?.action_data_generation_id;
      
      if (!generationId) {
        toast.error('Invalid generation ID');
        return;
      }

      // Lấy giá trị cũ của generation đang được edit
      const oldValue = generationToUpdate.value?.value || 
        (typeof generationToUpdate.value === 'string' ? generationToUpdate.value : '');
      const oldValueStr = String(oldValue);

      // Kiểm tra xem generation này có đang được chọn không (so sánh với action_datas)
      const currentActionDataValue = currentAction.action_datas?.find(
        ad => ad.value && typeof ad.value === 'object' && ad.value.value !== undefined
      )?.value?.value;
      const isCurrentlySelected = currentActionDataValue !== undefined && 
        String(currentActionDataValue) === oldValueStr;

      const updatedGeneration = {
        ...generationToUpdate,
        value: {
          value: value,
        },
      };

      // Cập nhật actions
      onActionsChange(prev => {
        const updated = prev.map(a => {
          if (a.action_id === currentAction.action_id) {
            const updatedGenerations = [...(a.action_data_generation || [])];
            if (updatedGenerations[editingIndex]) {
              updatedGenerations[editingIndex] = updatedGeneration;
            }
            
            // Nếu generation này đang được chọn, cập nhật action_datas để giữ selection
            let updatedActionDatas = [...(a.action_datas || [])];
            if (isCurrentlySelected) {
              // Tìm action_data có value property
              let foundIndex = updatedActionDatas.findIndex(ad => ad.value !== undefined);
              if (foundIndex === -1) {
                // Tạo action_data mới nếu chưa có
                updatedActionDatas.push({ value: {} });
                foundIndex = updatedActionDatas.length - 1;
              }
              
              // Cập nhật action_data với giá trị mới
              updatedActionDatas[foundIndex] = {
                ...updatedActionDatas[foundIndex],
                value: {
                  ...(updatedActionDatas[foundIndex].value || {}),
                  value: String(value)
                }
              };
            }
            
            const updatedAction = {
              ...a,
              action_data_generation: updatedGenerations,
              action_datas: updatedActionDatas,
            };
            setCurrentAction(updatedAction);
            return updatedAction;
          }
          return a;
        });

        // SYNC: Đồng bộ với versions
        if (testcaseDataVersions && onTestCaseDataVersionsChange) {
          const activeVersionName = findActiveVersionInActions(updated);
          const { updatedVersions } = syncGenerationsBetweenActionsAndVersions(
            updated,
            testcaseDataVersions,
            activeVersionName
          );
          onTestCaseDataVersionsChange(() => updatedVersions);
        }

        return updated;
      });

      setEditingIndex(null);
      toast.success('Value updated successfully');
      if (onValueUpdated) {
        onValueUpdated();
      }
    }
  };

  const handleCancelEdit = () => {
    // Nếu đang thêm value mới, chỉ cần reset state
    if (isAddingNew) {
      setIsAddingNew(false);
      setTempNewValue(null);
      setEditingIndex(null);
      return;
    }

    // Nếu đang edit value hiện có, chỉ cần thoát chế độ edit
    setEditingIndex(null);
  };

  const handleAddNewValue = () => {
    if (!currentAction.action_id) {
      toast.error('Invalid action ID');
      return;
    }

    // Tính toán version_number mới
    const maxVersion = generations.length > 0
      ? Math.max(...generations.map(g => g.version_number || 0))
      : 0;

    // Tạo temp ID giống như trong EditVersionModal để có thể được chọn trong dropdown
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Tạo value tạm thời, chưa thêm vào danh sách
    const newGeneration: ActionDataGeneration = {
      action_data_generation_id: tempId,
      version_number: maxVersion + 1,
      value: { value: '' }
    };

    setTempNewValue(newGeneration);
    setIsAddingNew(true);
    // Không set editingIndex vì không có index trong danh sách
  };

  const handleDelete = (index: number) => {
    if (!onActionsChange) {
      toast.error('Cannot delete. Please refresh and try again.');
      return;
    }

    const gen = generations[index];
    if (!gen || !currentAction.action_id) return;

    if (generations.length <= 1) {
      toast.error('Cannot delete the last value. At least one value is required.');
      return;
    }

    onActionsChange(prev => {
      const updated = prev.map(a => {
        if (a.action_id === currentAction.action_id) {
          const updatedGenerations = [...(a.action_data_generation || [])];
          updatedGenerations.splice(index, 1);
          const updatedAction = {
            ...a,
            action_data_generation: updatedGenerations,
          };
          setCurrentAction(updatedAction);
          // Cancel editing if the deleted item was being edited
          if (editingIndex === index) {
            setEditingIndex(null);
          } else if (editingIndex !== null && editingIndex > index) {
            // Adjust editing index if a previous item was deleted
            setEditingIndex(editingIndex - 1);
          }
          return updatedAction;
        }
        return a;
      });

      // SYNC: Đồng bộ với versions (loại bỏ generation đã xóa)
      if (testcaseDataVersions && onTestCaseDataVersionsChange) {
        const activeVersionName = findActiveVersionInActions(updated);
        const { updatedVersions } = syncGenerationsBetweenActionsAndVersions(
          updated,
          testcaseDataVersions,
          activeVersionName
        );
        onTestCaseDataVersionsChange(() => updatedVersions);
      }

      return updated;
    });

    if (onValueUpdated) {
      onValueUpdated();
    }
  };

  const getDisplayValue = (gen: ActionDataGeneration, index: number) => {
    const genValue = gen.value && typeof gen.value === 'object'
      ? (gen.value as any).value ?? JSON.stringify(gen.value)
      : gen.value || '';
    
    if (typeof genValue === 'string') {
      return genValue.length > 100
        ? genValue.substring(0, 100) + '...'
        : genValue;
    }
    
    const jsonStr = JSON.stringify(genValue);
    return jsonStr.length > 100
      ? jsonStr.substring(0, 100) + '...'
      : jsonStr;
  };

  return (
    <div className="edit-action-values-modal-overlay" onClick={onClose}>
      <div className="edit-action-values-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-action-values-modal-header">
          <h3 className="edit-action-values-modal-title">
            Edit Action Values
            {currentAction.description && (
              <span className="edit-action-values-modal-subtitle"> - {currentAction.description}</span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="edit-action-values-btn-new"
              onClick={handleAddNewValue}
              disabled={isAddingNew || editingIndex !== null}
              title="Add new value"
              style={{
                background: isAddingNew || editingIndex !== null ? '#9ca3af' : '#10b981',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                cursor: isAddingNew || editingIndex !== null ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                transition: 'all 0.2s ease',
                fontSize: '12px',
                fontWeight: 500,
                height: '32px',
                opacity: isAddingNew || editingIndex !== null ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isAddingNew && editingIndex === null) {
                  e.currentTarget.style.background = '#059669';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAddingNew && editingIndex === null) {
                  e.currentTarget.style.background = '#10b981';
                }
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '4px' }}>
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              New Value
            </button>
            <button className="edit-action-values-modal-close" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="edit-action-values-modal-body">
          <div className="edit-action-values-list">
            {/* Hiển thị value mới đang được thêm ở đầu danh sách */}
            {isAddingNew && tempNewValue && (
              <div className="edit-action-values-item">
                <EditValueItem
                  key="new-value-temp"
                  generation={tempNewValue}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              </div>
            )}

            {/* Hiển thị danh sách values hiện có */}
            {generations.length === 0 && !isAddingNew ? (
              <div className="edit-action-values-empty">
                <p>No values found for this action.</p>
              </div>
            ) : (
              generations.map((gen, index) => {
                const isEditing = editingIndex === index;
                const displayValue = getDisplayValue(gen, index);

                return (
                  <div key={gen.action_data_generation_id || index} className="edit-action-values-item">
                    {isEditing ? (
                      <EditValueItem
                        key={gen.action_data_generation_id || `edit-${index}`}
                        generation={gen}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                      />
                    ) : (
                      <div className="edit-action-values-view-mode">
                        <div className="edit-action-values-value">
                          <pre className="edit-action-values-value-text">{displayValue}</pre>
                        </div>
                        <div className="edit-action-values-actions">
                          <button
                            className="edit-action-values-btn-edit"
                            onClick={() => handleEdit(index)}
                            title="Edit value"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            className="edit-action-values-btn-delete"
                            onClick={() => handleDelete(index)}
                            title="Delete value"
                            disabled={generations.length <= 1}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="edit-action-values-modal-footer">
          <button className="edit-action-values-modal-btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditActionValuesModal;

