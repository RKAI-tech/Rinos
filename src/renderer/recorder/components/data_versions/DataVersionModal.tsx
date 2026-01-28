import React, { useState, useMemo, useEffect } from 'react';
import { Action, ActionDataGeneration } from '../../types/actions';
import { TestCaseDataVersion } from '../../types/testcase';
import { toast } from 'react-toastify';
import NewVersionModal from './NewVersionModal';
import EditVersionModal from './EditVersionModal';
import ConfirmModal from './ConfirmModal';
import { syncActionsOnVersionUpdate, findActiveVersionInActions } from './versionSyncUtils';
import { truncateText } from '../../utils/textUtils';
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
  testcaseId?: string | null;
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
  testcaseDataVersions: TestCaseDataVersion[];
  onTestCaseDataVersionsChange: (updater: (prev: TestCaseDataVersion[]) => TestCaseDataVersion[]) => void;
}

const DataVersionModal: React.FC<DataVersionModalProps> = ({
  isOpen,
  onClose,
  actions,
  testcaseId,
  onActionsChange,
  testcaseDataVersions,
  onTestCaseDataVersionsChange,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [isEditVersionModalOpen, setIsEditVersionModalOpen] = useState(false);
  const [versionToEdit, setVersionToEdit] = useState<TestCaseDataVersion | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Reset selected version when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedVersion(null);
    }
  }, [isOpen]);

  // Auto-select version: ưu tiên version đang active, nếu không có thì chọn version đầu tiên
  useEffect(() => {
    if (isOpen && Array.isArray(testcaseDataVersions) && testcaseDataVersions.length > 0 && !selectedVersion) {
      // Tìm version đang active trong actions
      const activeVersionName = findActiveVersionInActions(actions);
      
      let versionToSelect: TestCaseDataVersion | null = null;
      
      if (activeVersionName) {
        // Tìm version object từ tên version
        versionToSelect = testcaseDataVersions.find(
          v => v.version === activeVersionName
        ) || null;
      }
      
      // Nếu không tìm thấy version active, chọn version đầu tiên
      if (!versionToSelect) {
        versionToSelect = testcaseDataVersions[0];
      }
      
      // Set selected version
      if (versionToSelect) {
        const versionId = versionToSelect.testcase_data_version_id || versionToSelect.version;
        if (versionId) {
          setSelectedVersion(versionId);
        }
      }
    }
  }, [isOpen, testcaseDataVersions, selectedVersion, actions]);


  // Create a map of action_data_generation_id to action and generation
  const actionGenerationMap = useMemo(() => {
    const map = new Map<string, {
      action: Action;
      generation: ActionDataGeneration;
      actionIndex: number;
    }>();

    actions.forEach((action, actionIndex) => {
      if (action.action_data_generation && action.action_data_generation.length > 0) {
        action.action_data_generation.forEach((generation) => {
          if (generation.action_data_generation_id) {
            map.set(generation.action_data_generation_id, {
              action,
              generation,
              actionIndex,
            });
          }
        });
      }
    });

    return map;
  }, [actions]);

  // Get map of action_id to selected generation_id for current version
  const versionGenerationMap = useMemo(() => {
    if (!selectedVersion) return new Map<string, string>();
    
    const map = new Map<string, string>();
    
    // Find version from local testcaseDataVersions
    if (Array.isArray(testcaseDataVersions) && testcaseDataVersions.length > 0) {
      const versionFromLocal = testcaseDataVersions.find(
        v => (v.testcase_data_version_id && v.testcase_data_version_id === selectedVersion) ||
             (v.version && v.version === selectedVersion)
      );
      
      if (versionFromLocal && versionFromLocal.action_data_generations) {
        // Get generation IDs from local version (API format has action_data_generations array)
        const generationIds = versionFromLocal.action_data_generations
          .map(gen => gen.action_data_generation_id)
          .filter((id): id is string => !!id);
        
        // Map each generation ID to its action
        generationIds.forEach((genId: string) => {
          const mapped = actionGenerationMap.get(genId);
          if (mapped && mapped.action.action_id) {
            map.set(mapped.action.action_id, genId);
          }
        });
      }
    }
    
    return map;
  }, [selectedVersion, testcaseDataVersions, actionGenerationMap]);

  // Get all actions that use data
  const allActionsWithData = useMemo(() => {
    return actions
      .map((action, actionIndex) => {
        // Check for generation_data_function_code in action_datas
        let hasGenerationFunction = false;
        
        for (const ad of action.action_datas || []) {
          const v: any = ad.value;
          if (v && typeof v === 'object' && v.generation_data_function_code) {
            hasGenerationFunction = true;
            break;
          }
        }

        const hasGenerations = action.action_data_generation && action.action_data_generation.length > 0;

        if (hasGenerations || hasGenerationFunction) {
          // Get selected generation ID from versionGenerationMap
          const selectedGenId = versionGenerationMap.get(action.action_id || '') || '';
          // If no selected generation from version, use first generation if available
          const finalSelectedGenId = selectedGenId || (action.action_data_generation?.[0]?.action_data_generation_id || '');
          
          return {
            action,
            actionIndex,
            generations: action.action_data_generation || [],
            selectedGenerationId: finalSelectedGenId,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.actionIndex - b.actionIndex);
  }, [actions, versionGenerationMap, selectedVersion]);

  // Handler để mở modal tạo version mới
  const handleAddVersion = () => {
    setIsNewVersionModalOpen(true);
  };

  // Handler để tạo version mới từ NewVersionModal
  const handleCreateNewVersion = (newVersion: { version: string; action_data_generation_ids: string[] }) => {
    // Convert from save format to API format
    const newVersionAPI: TestCaseDataVersion = {
      version: newVersion.version,
      action_data_generations: newVersion.action_data_generation_ids
        .map(genId => {
          // Find the generation object from actions
          for (const action of actions) {
            const gen = action.action_data_generation?.find(g => g.action_data_generation_id === genId);
            if (gen) return gen;
          }
          return null;
        })
        .filter((gen): gen is NonNullable<typeof gen> => gen !== null),
    };
    
    onTestCaseDataVersionsChange(prev => [...prev, newVersionAPI]);
    setIsNewVersionModalOpen(false);
  };

  // Handler để mở modal edit version
  const handleEditVersion = () => {
    if (!selectedVersion) return;
    
    const version = testcaseDataVersions.find(
      v => (v.testcase_data_version_id && v.testcase_data_version_id === selectedVersion) ||
           (v.version && v.version === selectedVersion)
    );
    
    if (version) {
      setVersionToEdit(version);
      setIsEditVersionModalOpen(true);
    }
  };

  // Handler để cập nhật version từ EditVersionModal
  const handleUpdateVersion = (updatedVersion: { version: string; action_data_generation_ids: string[] }) => {
    if (!selectedVersion) return;
    
    // Convert from save format to API format
    const updatedVersionAPI: TestCaseDataVersion = {
      ...versionToEdit,
      version: updatedVersion.version,
      action_data_generations: updatedVersion.action_data_generation_ids
        .map(genId => {
          // Find the generation object from actions
          for (const action of actions) {
            const gen = action.action_data_generation?.find(g => g.action_data_generation_id === genId);
            if (gen) return gen;
          }
          return null;
        })
        .filter((gen): gen is NonNullable<typeof gen> => gen !== null),
    };
    
    // Cập nhật testcaseDataVersions
    onTestCaseDataVersionsChange(prev => prev.map(v => {
      if ((v.testcase_data_version_id && v.testcase_data_version_id === selectedVersion) ||
          (v.version && v.version === selectedVersion)) {
        return updatedVersionAPI;
      }
      return v;
    }));
    
    // SYNC: Nếu version cũ đang được sử dụng trong actions, cập nhật actions
    const oldVersionName = versionToEdit?.version;
    const isOldVersionActive = oldVersionName && findActiveVersionInActions(actions) === oldVersionName;
    
    if (isOldVersionActive && onActionsChange) {
      onActionsChange(prev => {
        const genIdByAction = new Map<string, string>();

        updatedVersion.action_data_generation_ids.forEach(genId => {
          for (const action of prev) {
            const hasGen = action.action_data_generation?.some(
              g => g.action_data_generation_id === genId
            );
            if (hasGen && action.action_id) {
              genIdByAction.set(action.action_id, genId);
              break;
            }
          }
        });

        return prev.map(action => {
          if (!action.action_id) return action;
          const genId = genIdByAction.get(action.action_id);
          if (!genId) return action;

          const actionDatas = [...(action.action_datas || [])];
          let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
          if (foundIndex === -1) {
            actionDatas.push({ value: {} });
            foundIndex = actionDatas.length - 1;
          }

          actionDatas[foundIndex] = {
            ...actionDatas[foundIndex],
            value: {
              ...(actionDatas[foundIndex].value || {}),
              currentVersion: updatedVersion.version,
              selected_value_id: genId,
            },
          };

          return { ...action, action_datas: actionDatas };
        });
      });

      toast.info(`Version "${oldVersionName}" has been updated. Actions using this version have been automatically updated.`);
    }
    
    setIsEditVersionModalOpen(false);
    setVersionToEdit(null);
  };

  // Handler để mở confirm modal xóa version
  const handleDeleteVersion = () => {
    if (!selectedVersion) return;
    setIsDeleteConfirmOpen(true);
  };

  // Handler để xác nhận xóa version
  const handleConfirmDelete = () => {
    if (!selectedVersion) return;
    
    onTestCaseDataVersionsChange(prev => {
      const filtered = prev.filter(v => {
        const versionId = v.testcase_data_version_id || v.version;
        return versionId !== selectedVersion;
      });
      
      // If deleted version was selected, select first available or null
      if (filtered.length > 0) {
        const firstVersion = filtered[0];
        const versionId = firstVersion.testcase_data_version_id || firstVersion.version;
        if (versionId) {
          setSelectedVersion(versionId);
        }
      } else {
        setSelectedVersion(null);
      }
      
      return filtered;
    });
    
    setIsDeleteConfirmOpen(false);
  };

  // Handler để lưu currentVersion vào action_datas và áp dụng version ngay lập tức
  const handleSaveCurrentVersion = () => {
    if (!selectedVersion) {
      toast.warning('Please select a version first');
      return;
    }
    
    // Tìm version object để lấy tên
    const versionObj = testcaseDataVersions.find(
      v => (v.testcase_data_version_id && v.testcase_data_version_id === selectedVersion) ||
           (v.version && v.version === selectedVersion)
    );
    
    if (!versionObj || !versionObj.version) {
      toast.error('Version not found');
      return;
    }
    
    const versionName = versionObj.version;
    
    // Cập nhật currentVersion và áp dụng version ngay lập tức cho tất cả actions có data
    onActionsChange?.(prev => {
      const updated = prev.map(action => {
        // Chỉ cập nhật actions có action_data_generation
        if (!action.action_data_generation || action.action_data_generation.length === 0) {
          return action;
        }
        
        const actionDatas = [...(action.action_datas || [])];
        let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);

        if (foundIndex === -1) {
          actionDatas.push({
            value: {
              currentVersion: versionName,
            },
          });
          foundIndex = actionDatas.length - 1;
        } else {
          actionDatas[foundIndex] = {
            ...actionDatas[foundIndex],
            value: {
              ...(actionDatas[foundIndex].value || {}),
              currentVersion: versionName,
            },
          };
        }

        // Prefer generation from the selected version; fallback to existing selection.
        let selectedGenerationId: string | null = null;

        if (versionObj.action_data_generations) {
          for (const gen of versionObj.action_data_generations) {
            if (gen.action_data_generation_id) {
              const genInAction = action.action_data_generation?.find(
                g => g.action_data_generation_id === gen.action_data_generation_id
              );
              if (genInAction) {
                selectedGenerationId = gen.action_data_generation_id;
                break;
              }
            }
          }
        }

        if (!selectedGenerationId) {
          const existingSelectedId = actionDatas.find(
            ad => ad.value && typeof ad.value === 'object' && ad.value.selected_value_id !== undefined
          )?.value?.selected_value_id;

          selectedGenerationId = existingSelectedId ? String(existingSelectedId) : null;
        }

        if (!selectedGenerationId && action.action_data_generation.length > 0) {
          selectedGenerationId = action.action_data_generation[0].action_data_generation_id || null;
        }

        if (selectedGenerationId) {
          actionDatas[foundIndex] = {
            ...actionDatas[foundIndex],
            value: {
              ...(actionDatas[foundIndex].value || {}),
              selected_value_id: selectedGenerationId,
            },
          };
        }
        
        return {
          ...action,
          action_datas: actionDatas
        };
      });
      
      return updated;
    });

    // Đóng modal
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="data-version-modal-overlay" onClick={onClose}>
      <div className="data-version-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="data-version-modal-header">
          <h4 className="data-version-modal-title">Datatest versions</h4>
          <div className="data-version-modal-header-actions">
            <button
              className="data-version-add-btn"
              onClick={handleAddVersion}
              disabled={isAddingVersion}
              title="Add new version"
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
                  New Version
                </>
              )}
            </button>
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
        </div>

        <>
          {/* Version Dropdown */}
          {Array.isArray(testcaseDataVersions) && testcaseDataVersions.length > 0 ? (
            <div className="data-version-selector">
              <label className="data-version-selector-label">Select Version:</label>
              <div className="data-version-select-wrapper">
                <select
                  className="data-version-select"
                  value={selectedVersion || ''}
                  onChange={(e) => setSelectedVersion(e.target.value || null)}
                >
                  {testcaseDataVersions.map((version) => {
                    const id = version.testcase_data_version_id || version.version || '';
                    const count = version.action_data_generations?.length || 0;
                    return (
                      <option key={id} value={id}>
                        {version.version || `Version ${id}`}
                      </option>
                    );
                  })}
                </select>
                <button
                  className="data-version-edit-btn"
                  onClick={handleEditVersion}
                  disabled={!selectedVersion}
                  title="Edit version"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  className="data-version-delete-btn"
                  onClick={handleDeleteVersion}
                  disabled={!selectedVersion}
                  title="Delete version"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}

          {/* Version Content */}
          <div className="data-version-modal-body">
            {Array.isArray(testcaseDataVersions) && testcaseDataVersions.length === 0 ? (
              <div className="data-version-empty">
                <p>No data versions have been created.</p>
              </div>
            ) : selectedVersion && allActionsWithData.length > 0 ? (
                <div className="data-version-list">
                  {allActionsWithData.map(({ action, actionIndex, generations, selectedGenerationId }) => {
                      // Get the selected generation
                      const selectedGeneration = generations.find(gen => gen.action_data_generation_id === selectedGenerationId) || generations[0];
                      const value = selectedGeneration && selectedGeneration.value && typeof selectedGeneration.value === 'object'
                        ? (selectedGeneration.value as any).value ?? JSON.stringify(selectedGeneration.value)
                        : selectedGeneration?.value || '';

                      return (
                        <div key={action.action_id} className="data-version-item">
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
                            {generations.length > 0 ? (
                              <div 
                                className="data-version-value-content"
                                title={String(value)}
                              >
                                {truncateText(String(value), 50)}
                              </div>
                            ) : (
                              <div className="data-version-value-content">
                                No generations available
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : selectedVersion ? (
                <div className="data-version-empty">
                  <p>No actions with data found for this version.</p>
                </div>
              ) : null}
          </div>
        </>

        <div className="data-version-modal-footer">
          <button 
            className="data-version-modal-btn-save" 
            onClick={handleSaveCurrentVersion}
            disabled={!selectedVersion}
            title={selectedVersion ? 'Save current version' : 'Please select a version first'}
          >
            Save
          </button>
          <button className="data-version-modal-btn-close" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* New Version Modal */}
      {isNewVersionModalOpen && (
        <NewVersionModal
          actions={actions}
          onClose={() => setIsNewVersionModalOpen(false)}
          onCreateVersion={handleCreateNewVersion}
          onActionsChange={onActionsChange}
        />
      )}

      {/* Edit Version Modal */}
      {isEditVersionModalOpen && versionToEdit && (
        <EditVersionModal
          actions={actions}
          version={versionToEdit}
          onClose={() => {
            setIsEditVersionModalOpen(false);
            setVersionToEdit(null);
          }}
          onUpdateVersion={handleUpdateVersion}
          onActionsChange={onActionsChange}
          testcaseDataVersions={testcaseDataVersions}
          onTestCaseDataVersionsChange={onTestCaseDataVersionsChange}
        />
      )}

      {/* Delete Confirm Modal */}
      {isDeleteConfirmOpen && (
        <ConfirmModal
          title="Delete Version"
          message="Are you sure you want to delete this version? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          confirmButtonStyle="danger"
        />
      )}
    </div>
  );
};

export default DataVersionModal;
