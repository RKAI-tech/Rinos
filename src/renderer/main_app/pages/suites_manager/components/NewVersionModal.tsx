import React, { useState, useMemo, useEffect } from 'react';
import { Action, ActionDataGeneration } from '../../../types/actions';
import { TestCaseDataVersion } from '../../../types/testcases';
import { toast } from 'react-toastify';
import GenerateActionValueModal from './GenerateActionValueModal';
import EditActionValuesModal from './EditActionValuesModal';
import './NewVersionModal.css';

interface NewVersionModalProps {
  actions: Action[];
  onClose: () => void;
  onCreateVersion: (version: { version: string; action_data_generation_ids: string[] }) => void;
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
  testcaseDataVersions?: TestCaseDataVersion[];
  onTestCaseDataVersionsChange?: (updater: (prev: TestCaseDataVersion[]) => TestCaseDataVersion[]) => void;
}

const NewVersionModal: React.FC<NewVersionModalProps> = ({
  actions,
  onClose,
  onCreateVersion,
  onActionsChange,
  testcaseDataVersions,
  onTestCaseDataVersionsChange,
}) => {
  const [versionName, setVersionName] = useState('');
  const [selectedGenerations, setSelectedGenerations] = useState<Map<string, string>>(new Map());
  const [isCreating, setIsCreating] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [currentActionForGenerate, setCurrentActionForGenerate] = useState<Action | null>(null);
  const [editValuesModalOpen, setEditValuesModalOpen] = useState(false);
  const [currentActionIdForEdit, setCurrentActionIdForEdit] = useState<string | null>(null);

  // Get current action for edit from actions prop
  const currentActionForEdit = currentActionIdForEdit
    ? actions.find(a => a.action_id === currentActionIdForEdit) || null
    : null;

  // Find all actions that use data (have action_data_generation or generation_data_function_code)
  const actionsWithData = useMemo(() => {
    return actions
      .map((action, index) => {
        // Check for generation_data_function_code in action_datas
        let hasGenerationFunction = false;
        let functionCode = '';
        
        for (const ad of action.action_datas || []) {
          const v: any = ad.value;
          if (v && typeof v === 'object' && v.generation_data_function_code) {
            hasGenerationFunction = true;
            functionCode = String(v.generation_data_function_code || '').trim();
            break;
          }
        }

        const hasGenerations = action.action_data_generation && action.action_data_generation.length > 0;

        if (hasGenerations || hasGenerationFunction) {
          return {
            action,
            actionIndex: index,
            hasGenerationFunction,
            functionCode,
            generations: action.action_data_generation || [],
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [actions]);

  // Initialize selected generations with first available generation for each action
  useEffect(() => {
    const initialSelections = new Map<string, string>();
    actionsWithData.forEach(({ action, generations }) => {
      if (generations.length > 0 && generations[0].action_data_generation_id) {
        initialSelections.set(action.action_id || '', generations[0].action_data_generation_id);
      }
    });
    setSelectedGenerations(initialSelections);
  }, [actionsWithData]);

  const handleSelectGeneration = (actionId: string, generationId: string) => {
    setSelectedGenerations(prev => {
      const next = new Map(prev);
      next.set(actionId, generationId);
      return next;
    });
  };

  const handleOpenGenerate = (actionId: string) => {
    const action = actions.find(a => a.action_id === actionId);
    if (action) {
      setCurrentActionForGenerate(action);
      setGenerateModalOpen(true);
    }
  };

  const handleOpenEditValues = (actionId: string) => {
    const action = actions.find(a => a.action_id === actionId);
    if (action) {
      setCurrentActionIdForEdit(actionId);
      setEditValuesModalOpen(true);
    }
  };

  const handleSaveGeneratedValue = (value: any) => {
    if (!onActionsChange || !currentActionForGenerate) {
      toast.error('Cannot update actions. Please refresh and try again.');
      return;
    }

    const actionId = currentActionForGenerate.action_id;
    if (!actionId) return;

    // Create new generation with temporary ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGeneration: ActionDataGeneration = {
      action_data_generation_id: tempId,
      value: {
        value: value,
      },
    };

    // Update action
    onActionsChange(prev => prev.map(a => {
      if (a.action_id === actionId) {
        return {
          ...a,
          action_data_generation: [
            ...(a.action_data_generation || []),
            newGeneration,
          ],
        };
      }
      return a;
    }));

    // Select the newly created generation immediately
    handleSelectGeneration(actionId, tempId);

    toast.success('New generation created and selected successfully');
  };

  const handleConfirm = () => {
    if (!versionName.trim()) {
      toast.error('Please enter a Test Data name');
      return;
    }

    const generationIds: string[] = [];
    selectedGenerations.forEach((genId) => {
      if (genId) {
        generationIds.push(genId);
      }
    });

    if (generationIds.length === 0) {
      toast.error('Please select at least one action generation');
      return;
    }

    const newVersion = {
      version: versionName.trim(),
      action_data_generation_ids: generationIds,
    };

    onCreateVersion(newVersion);
    setVersionName('');
    setSelectedGenerations(new Map());
  };

  return (
    <div className="new-version-modal-overlay" onClick={onClose}>
      <div className="new-version-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-version-modal-header">
          <h3 className="new-version-modal-title">Create New Test Data</h3>
          <button className="new-version-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="new-version-modal-body">
          <div className="new-version-name-input-horizontal">
            <label className="new-version-label-horizontal">Test Data Name:</label>
            <input
              type="text"
              className="new-version-input-horizontal"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Enter Test Data name"
            />
          </div>

          <div className="new-version-actions-list">
            <label className="new-version-label">Select Data for Each Action:</label>
            {actionsWithData.length === 0 ? (
              <div className="new-version-empty">
                <p>No actions with data found.</p>
              </div>
            ) : (
              actionsWithData.map(({ action, actionIndex, generations, hasGenerationFunction, functionCode }) => {
                const selectedGenId = selectedGenerations.get(action.action_id || '') || '';
                
                return (
                  <div key={action.action_id} className="new-version-action-item">
                    <div className="new-version-action-header">
                      <span className="new-version-action-index">#{actionIndex + 1}</span>
                      <span className="new-version-action-type">{action.action_type}</span>
                      {action.description && (
                        <span className="new-version-action-desc">{action.description}</span>
                      )}
                    </div>
                    <div className="new-version-action-select">
                      <select
                        className="new-version-select"
                        value={selectedGenId}
                        onChange={(e) => handleSelectGeneration(action.action_id || '', e.target.value)}
                      >
                        {generations.length === 0 && (
                          <option value="">No generations available</option>
                        )}
                        {generations.map((gen, idx) => {
                          const genValue = gen.value && typeof gen.value === 'object'
                            ? (gen.value as any).value ?? JSON.stringify(gen.value)
                            : gen.value || '';
                          const displayValue = typeof genValue === 'string'
                            ? genValue.substring(0, 50) + (genValue.length > 50 ? '...' : '')
                            : JSON.stringify(genValue).substring(0, 50) + '...';
                          return (
                            <option key={gen.action_data_generation_id || idx} value={gen.action_data_generation_id || ''}>
                              {displayValue}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        className="new-version-edit-btn"
                        onClick={() => handleOpenEditValues(action.action_id || '')}
                        disabled={isCreating}
                        title="Edit action values"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        className="new-version-generate-btn"
                        onClick={() => handleOpenGenerate(action.action_id || '')}
                        disabled={isCreating}
                        title="Generate new action value"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="new-version-modal-footer">
          <button className="new-version-modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="new-version-modal-btn-confirm"
            onClick={handleConfirm}
            disabled={!versionName.trim()}
          >
            Create Test Data
          </button>
        </div>
      </div>

      {/* Generate Action Value Modal */}
      {generateModalOpen && currentActionForGenerate && (
        <GenerateActionValueModal
          action={currentActionForGenerate}
          onClose={() => {
            setGenerateModalOpen(false);
            setCurrentActionForGenerate(null);
          }}
          onSave={handleSaveGeneratedValue}
        />
      )}

      {/* Edit Action Values Modal */}
      {editValuesModalOpen && currentActionForEdit && (
        <EditActionValuesModal
          action={currentActionForEdit}
          onClose={() => {
            setEditValuesModalOpen(false);
            setCurrentActionIdForEdit(null);
          }}
          onActionsChange={onActionsChange}
          testcaseDataVersions={testcaseDataVersions}
          onTestCaseDataVersionsChange={onTestCaseDataVersionsChange}
          onValueUpdated={() => {
            // The action will be updated through onActionsChange
            // The modal will sync automatically via the action prop
          }}
        />
      )}
    </div>
  );
};

export default NewVersionModal;

