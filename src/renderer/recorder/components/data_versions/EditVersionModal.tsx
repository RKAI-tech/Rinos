import React, { useState, useMemo, useEffect } from 'react';
import { Action, ActionDataGeneration } from '../../types/actions';
import { TestCaseDataVersion } from '../../types/testcase';
import { toast } from 'react-toastify';
import GenerateActionValueModal from './GenerateActionValueModal';
import './EditVersionModal.css';

interface EditVersionModalProps {
  actions: Action[];
  version: TestCaseDataVersion;
  onClose: () => void;
  onUpdateVersion: (version: { version: string; action_data_generation_ids: string[] }) => void;
  onActionsChange?: (updater: (prev: Action[]) => Action[]) => void;
}

const EditVersionModal: React.FC<EditVersionModalProps> = ({
  actions,
  version,
  onClose,
  onUpdateVersion,
  onActionsChange,
}) => {
  const [versionName, setVersionName] = useState(version.version || '');
  const [selectedGenerations, setSelectedGenerations] = useState<Map<string, string>>(new Map());
  const [isCreating, setIsCreating] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [currentActionForGenerate, setCurrentActionForGenerate] = useState<Action | null>(null);

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

  // Initialize selected generations from version
  useEffect(() => {
    const initialSelections = new Map<string, string>();
    
    // Get generation IDs from the version
    const versionGenIds = (version.action_data_generations || [])
      .map(gen => gen.action_data_generation_id)
      .filter((id): id is string => !!id);
    
    // Map each generation ID to its action
    versionGenIds.forEach((genId: string) => {
      for (const action of actions) {
        const gen = action.action_data_generation?.find(g => g.action_data_generation_id === genId);
        if (gen && action.action_id) {
          initialSelections.set(action.action_id, genId);
          break;
        }
      }
    });
    
    // For actions without a selected generation, use first available
    actionsWithData.forEach(({ action, generations }) => {
      if (!initialSelections.has(action.action_id || '') && generations.length > 0 && generations[0].action_data_generation_id) {
        initialSelections.set(action.action_id || '', generations[0].action_data_generation_id);
      }
    });
    
    setSelectedGenerations(initialSelections);
  }, [version, actions, actionsWithData]);

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
    // This will update the dropdown selection right away
    handleSelectGeneration(actionId, tempId);

    toast.success('New generation created and selected successfully');
  };

  const handleConfirm = () => {
    if (!versionName.trim()) {
      toast.error('Please enter a version name');
      return;
    }

    const generationIds: string[] = [];
    selectedGenerations.forEach((genId) => {
      if (genId && genId !== '__create_new__') {
        generationIds.push(genId);
      }
    });

    if (generationIds.length === 0) {
      toast.error('Please select at least one action generation');
      return;
    }

    const updatedVersion = {
      version: versionName.trim(),
      action_data_generation_ids: generationIds,
    };

    onUpdateVersion(updatedVersion);
  };

  return (
    <div className="new-version-modal-overlay" onClick={onClose}>
      <div className="new-version-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="new-version-modal-header">
          <h3 className="new-version-modal-title">Edit Version</h3>
          <button className="new-version-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="new-version-modal-body">
          <div className="edit-version-name-input">
            <label className="edit-version-label">Version Name:</label>
            <input
              type="text"
              className="edit-version-input"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              placeholder="Enter version name"
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
                        className="edit-version-generate-btn"
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
            Update Version
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
    </div>
  );
};

export default EditVersionModal;

