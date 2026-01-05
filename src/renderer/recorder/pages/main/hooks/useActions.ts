import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Action, Element as ActionElement, TestCaseDataVersion } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import { ActionOperationResult } from '../../../components/action_tab/ActionTab';
import { receiveActionWithInsert } from '../../../utils/receive_action';
import { TestCaseDataVersion as TestCaseDataVersionFromAPI } from '../../../types/testcase';

interface UseActionsProps {
  testcaseId: string | null;
  projectId?: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
  testcaseDataVersions?: TestCaseDataVersionFromAPI[];
}

// Utility function to apply currentVersion to actions
const applyCurrentVersionToActions = (
  actionsToApply: Action[],
  testcaseDataVersions: TestCaseDataVersionFromAPI[]
): Action[] => {
  if (!testcaseDataVersions || testcaseDataVersions.length === 0) {
    return actionsToApply;
  }

  return actionsToApply.map(action => {
    // Chỉ xử lý actions có action_data_generation
    if (!action.action_data_generation || action.action_data_generation.length === 0) {
      return action;
    }
    
    // Lấy currentVersion từ action_datas
    let currentVersionName: string | null = null;
    for (const ad of action.action_datas || []) {
      if (ad.value && typeof ad.value === 'object' && ad.value.currentVersion) {
        currentVersionName = String(ad.value.currentVersion);
        break;
      }
    }
    
    // Tìm version tương ứng
    let selectedGenerationId: string | null = null;
    if (currentVersionName) {
      const version = testcaseDataVersions.find(v => v.version === currentVersionName);
      if (version && version.action_data_generations) {
        // Tìm generation ID đầu tiên thuộc về action này
        for (const gen of version.action_data_generations) {
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
    }
    
    // Nếu không tìm thấy, dùng generation đầu tiên
    if (!selectedGenerationId && action.action_data_generation.length > 0) {
      selectedGenerationId = action.action_data_generation[0].action_data_generation_id || null;
    }
    
    // Tìm generation và lấy value
    const selectedGeneration = action.action_data_generation.find(
      g => g.action_data_generation_id === selectedGenerationId
    );
    
    if (selectedGeneration && selectedGeneration.value) {
      const generationValue = selectedGeneration.value.value || 
        (typeof selectedGeneration.value === 'string' ? selectedGeneration.value : '');
      
      // Cập nhật action_datas[0].value.value
      const actionDatas = [...(action.action_datas || [])];
      let foundIndex = actionDatas.findIndex(ad => ad.value !== undefined);
      
      if (foundIndex === -1) {
        actionDatas.push({ 
          value: { 
            value: String(generationValue),
            ...(currentVersionName ? { currentVersion: currentVersionName } : {})
          } 
        });
      } else {
        actionDatas[foundIndex] = {
          ...actionDatas[foundIndex],
          value: {
            ...(actionDatas[foundIndex].value || {}),
            value: String(generationValue),
            ...(currentVersionName ? { currentVersion: currentVersionName } : {})
          }
        };
      }
      
      return {
        ...action,
        action_datas: actionDatas
      };
    }
    
    return action;
  });
};

export const useActions = ({ testcaseId, projectId, onDirtyChange, testcaseDataVersions = [] }: UseActionsProps) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedInsertPosition, setSelectedInsertPosition] = useState<number>(0);
  const [displayInsertPosition, setDisplayInsertPosition] = useState<number>(0);
  const [savedActionsSnapshot, setSavedActionsSnapshot] = useState<Action[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const actionService = useMemo(() => new ActionService(), []);
  const previousVersionsRef = useRef<string>('');
  const lastAppliedActionsRef = useRef<string>('');

  // Load actions khi có testcase ID
  useEffect(() => {
    const loadActions = async () => {
      if (testcaseId) {
        setIsLoading(true);
        try {
          const response = await actionService.getActionsByTestCase(testcaseId, 0, 0, projectId || undefined);
          
          // Check if testcase was deleted (404 or Not Found error)
          if (!response.success && response.error) {
            const errorLower = response.error.toLowerCase();
            if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
              console.info(`[useActions] Testcase ${testcaseId} not found (likely deleted), clearing actions`);
              setActions([]);
              setSelectedInsertPosition(0);
              setSavedActionsSnapshot([]);
              setIsDirty(false);
              onDirtyChange?.(false);
              previousVersionsRef.current = '';
              lastAppliedActionsRef.current = '';
              return;
            }
          }
          
          if (response.success && response.data) {
            const loaded = response.data.actions || [];
            setActions(loaded);
            setSelectedInsertPosition(loaded.length);
            setSavedActionsSnapshot(JSON.parse(JSON.stringify(loaded)));
            setIsDirty(false);
            onDirtyChange?.(false);
            // Reset ref để force apply version sau khi load
            previousVersionsRef.current = '';
            lastAppliedActionsRef.current = '';
          } else {
            setActions([]);
            setSelectedInsertPosition(0);
            setSavedActionsSnapshot([]);
            setIsDirty(false);
            onDirtyChange?.(false);
            previousVersionsRef.current = '';
            lastAppliedActionsRef.current = '';
          }
        } catch (error) {
          setActions([]);
          setSelectedInsertPosition(0);
          setSavedActionsSnapshot([]);
          setIsDirty(false);
          onDirtyChange?.(false);
          previousVersionsRef.current = '';
          lastAppliedActionsRef.current = '';
        } finally {
          setIsLoading(false);
        }
      } else {
        setActions([]);
        setSelectedInsertPosition(0);
        setSavedActionsSnapshot([]);
        setIsDirty(false);
        onDirtyChange?.(false);
        previousVersionsRef.current = '';
        lastAppliedActionsRef.current = '';
      }
    };

    loadActions();
  }, [testcaseId, actionService, onDirtyChange, projectId]);

  // Áp dụng currentVersion khi testcaseDataVersions thay đổi hoặc sau khi actions được load
  useEffect(() => {
    const currentVersionsString = JSON.stringify(testcaseDataVersions);
    
    // Bỏ qua nếu versions không thay đổi và đã apply cho actions hiện tại
    if (currentVersionsString === previousVersionsRef.current) {
      return;
    }

    setActions(prevActions => {
      if (prevActions.length === 0 || testcaseDataVersions.length === 0) {
        previousVersionsRef.current = currentVersionsString;
        return prevActions;
      }

      const appliedActions = applyCurrentVersionToActions(prevActions, testcaseDataVersions);
      
      // Chỉ cập nhật nếu có thay đổi thực sự
      const appliedActionsString = JSON.stringify(appliedActions);
      const prevActionsString = JSON.stringify(prevActions);
      
      if (prevActionsString !== appliedActionsString) {
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(appliedActions)));
        previousVersionsRef.current = currentVersionsString;
        lastAppliedActionsRef.current = appliedActionsString;
        return appliedActions;
      }
      
      previousVersionsRef.current = currentVersionsString;
      lastAppliedActionsRef.current = appliedActionsString;
      return prevActions;
    });
  }, [testcaseDataVersions]);

  // Đồng bộ nhãn vị trí chèn với độ dài actions khi không chọn vị trí cụ thể
  useEffect(() => {
    if (selectedInsertPosition === 0) {
      setDisplayInsertPosition(actions.length === 0 ? 0 : actions.length);
    }
  }, [actions.length, selectedInsertPosition]);

  const handleActionsChange = useCallback((newActions: Action[] | ((prev: Action[]) => Action[])) => {
    setActions(prev => {
      const next = typeof newActions === 'function' ? newActions(prev) : newActions;
      setIsDirty(true);
      onDirtyChange?.(true);
      return next;
    });
  }, [onDirtyChange]);

  const handleDeleteAction = useCallback((actionId: string) => {
    setActions(prev => {
      const removedIndex = prev.findIndex(a => a.action_id === actionId);
      if (removedIndex === -1) return prev;
      const next = prev.filter(a => a.action_id !== actionId);

      setIsDirty(true);
      onDirtyChange?.(true);

      const adjust = (idx: number | null): number | null => {
        if (idx === null) return null;
        const newLen = next.length;
        if (removedIndex < idx) return Math.max(0, Math.min(idx - 1, newLen));
        return Math.max(0, Math.min(idx, newLen));
      };

      setSelectedInsertPosition(v => next.length === 0 ? 0 : (adjust(v as number | null) ?? 0));

      setDisplayInsertPosition(v => {
        if (next.length === 0) return 0;
        if (v === null || v === undefined) return next.length;
        const newLen = next.length;
        if (removedIndex < v) return Math.max(0, Math.min(v - 1, newLen));
        return Math.max(0, Math.min(v, newLen));
      });

      return next;
    });
  }, [onDirtyChange]);

  const handleReorderActions = useCallback((reorderedActions: Action[]) => {
    setActions(reorderedActions);
    setIsDirty(true);
    onDirtyChange?.(true);
  }, [onDirtyChange]);

  const handleSelectInsertPosition = useCallback(async (position: number | null, url: string, isBrowserOpen: boolean, startBrowser: (url: string, executeUntilIndex?: number | null) => Promise<void>) => {
    const prev = selectedInsertPosition;
    setSelectedInsertPosition(position ?? 0);
    try {
      const fromIndex = (prev === undefined) ? actions.length : prev;
      const fromText = `#${fromIndex}`;
      const toText = `#${position ?? 0}`;
      // toast.info(`Recording position changed: ${fromText} to ${toText}`);
    } catch {}
    if (position !== null && !isBrowserOpen) {
      try {
        await startBrowser(url, position);
      } catch (e) {
        // Silent fail
      }
    }
  }, [actions.length, selectedInsertPosition]);

  const reloadActions = useCallback(async (): Promise<ActionOperationResult> => {
    const effectiveId = testcaseId || actions[0]?.testcase_id || null;
    if (!effectiveId) {
      return {
        success: false,
        message: 'Missing testcase ID to reload actions',
        level: 'warning',
      };
    }
    setIsLoading(true);
    try {
      const response = await actionService.getActionsByTestCase(effectiveId, 0, 0, projectId || undefined);
      
      // Check if testcase was deleted (404 or Not Found error)
      if (!response.success && response.error) {
        const errorLower = response.error.toLowerCase();
        if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
          console.info(`[useActions] Testcase ${effectiveId} not found (likely deleted) during reload, clearing actions`);
          setActions([]);
          setSelectedInsertPosition(0);
          setDisplayInsertPosition(0);
          setSavedActionsSnapshot([]);
          setIsDirty(false);
          onDirtyChange?.(false);
          return {
            success: false,
            message: 'Testcase not found (likely deleted)',
            level: 'warning',
          };
        }
      }
      
      if (response.success && response.data) {
        const newActions = response.data.actions || [];
        // Apply currentVersion to actions if testcaseDataVersions are available
        const appliedActions = testcaseDataVersions.length > 0 
          ? applyCurrentVersionToActions(newActions, testcaseDataVersions)
          : newActions;
        setActions(appliedActions);
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(appliedActions)));
        setIsDirty(false);
        onDirtyChange?.(false);
        const len = appliedActions.length;
        setSelectedInsertPosition(len);
        setDisplayInsertPosition(len);
        return {
          success: true,
          message: 'Actions reloaded successfully',
        };
      } else {
        setActions([]);
        setSelectedInsertPosition(0);
        setDisplayInsertPosition(0);
        setSavedActionsSnapshot([]);
        setIsDirty(false);
        onDirtyChange?.(false);
        return {
          success: false,
          message: response.error || 'Failed to reload actions',
          level: 'error',
        };
      }
    } catch (error) {
      setActions([]);
      setSelectedInsertPosition(0);
      setDisplayInsertPosition(0);
      setSavedActionsSnapshot([]);
      setIsDirty(false);
      onDirtyChange?.(false);
      const message = error instanceof Error ? error.message : 'Failed to reload actions';
      return {
        success: false,
        message,
        level: 'error',
      };
    } finally {
      setIsLoading(false);
    }
  }, [testcaseId, actions, actionService, onDirtyChange, testcaseDataVersions]);

  // Normalize actions before saving to ensure elements have correct order_index
  const normalizeActionsForSave = useCallback((actionsToNormalize: Action[]): Action[] => {
    return actionsToNormalize.map(action => ({
      ...action,
      // Normalize elements: set order_index theo thứ tự mới (1, 2, 3, ...)
      elements: (action.elements || []).map((el, idx) => ({
        ...el,
        order_index: idx + 1, // Set order_index theo thứ tự mới (1, 2, 3, ...)
      })),
    }));
  }, []);

  const handleSaveActions = useCallback(async (
    testcaseDataVersions?: TestCaseDataVersionFromAPI[],
    checkDuplicates?: (actions: Action[]) => Promise<Action[]>
  ): Promise<ActionOperationResult> => {
    if (!testcaseId) {
      return {
        success: false,
        message: 'No testcase ID available for saving',
        level: 'error',
      };
    }

    if (actions.length === 0) {
      return {
        success: false,
        message: 'No actions to save',
        level: 'warning',
      };
    }

    try {
      // Normalize actions before saving to ensure elements have correct order_index
      let actionsToSave = normalizeActionsForSave(actions);
      
      // Đảm bảo tất cả generations có ID
      actionsToSave = actionsToSave.map(action => {
        if (!action.action_data_generation || action.action_data_generation.length === 0) {
          return action;
        }
        
        return {
          ...action,
          action_data_generation: action.action_data_generation.map((gen, idx) => {
            // Nếu generation chưa có ID, tạo temp ID
            if (!gen.action_data_generation_id) {
              return {
                ...gen,
                action_data_generation_id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                version_number: idx + 1,
              };
            }
            return {
              ...gen,
              version_number: idx + 1,
            };
          }),
        };
      });
      
      // Kiểm tra duplicate elements nếu có callback
      if (checkDuplicates) {
        actionsToSave = await checkDuplicates(actionsToSave);
        // Cập nhật actions nếu có thay đổi
        if (JSON.stringify(actionsToSave) !== JSON.stringify(normalizeActionsForSave(actions))) {
          setActions(actionsToSave);
        }
      }
      
      // Tự động thêm action mới vào tất cả các version
      let versionsToSave = testcaseDataVersions ? [...testcaseDataVersions] : [];
      console.log('Versions before adding new generations', versionsToSave.filter(v => v.version === 'abcxyz'));
      
      if (versionsToSave.length > 0) {
        // Tìm actions có generation nhưng chưa được reference trong version nào
        const actionsWithUnreferencedGenerations = actionsToSave.filter(action => {
          if (!action.action_data_generation || action.action_data_generation.length === 0) {
            return false;
          }
          
          // Lấy generation đầu tiên của action
          const firstGeneration = action.action_data_generation[0];
          if (!firstGeneration || !firstGeneration.action_data_generation_id) {
            return false;
          }
          
          // Kiểm tra xem generation này có trong version nào không
          const isReferenced = versionsToSave.some(version => {
            return version.action_data_generations?.some(gen => 
              gen.action_data_generation_id === firstGeneration.action_data_generation_id
            );
          });
          
          return !isReferenced;
        });

        console.log('Actions with unreferenced generations', actionsWithUnreferencedGenerations.filter(a => a.action_id === 'abcxyz'));

        // Thêm generation đầu tiên của mỗi action mới vào TẤT CẢ các version
        if (actionsWithUnreferencedGenerations.length > 0) {
          const newGenerations = actionsWithUnreferencedGenerations
            .map(action => action.action_data_generation?.[0])
            .filter((gen): gen is NonNullable<typeof gen> => 
              gen !== null && 
              gen !== undefined && 
              !!gen.action_data_generation_id
            );
          
          // Thêm vào tất cả các version
          versionsToSave = versionsToSave.map(version => {
            // Kiểm tra xem generation nào chưa có trong version này
            const missingGenerations = newGenerations.filter(newGen => {
              return !version.action_data_generations?.some(
                existingGen => existingGen.action_data_generation_id === newGen.action_data_generation_id
              );
            });
            
            if (missingGenerations.length > 0) {
              return {
                ...version,
                action_data_generations: [
                  ...(version.action_data_generations || []),
                  ...missingGenerations,
                ],
              };
            }
            
            return version;
          });
        }
        console.log('Versions after adding new generations', versionsToSave.filter(v => v.version === 'abcxyz'));
      }

      // console.log('Actions', actionsToSave);
      // const hasAbcxyz = versionsToSave.some(v => v.version === 'abcxyz');
      // if (hasAbcxyz) {
      //   console.log('Versions', versionsToSave.filter(v => v.version === 'abcxyz'));
      // }
      
      // Convert versions to save format
      const versionsToSaveFormatted = versionsToSave.length > 0
        ? versionsToSave.map((v) => ({
            testcase_data_version_id: v.testcase_data_version_id,
            version: v.version,
            action_data_generation_ids: (v as any).action_data_generation_ids,
          }))
        : undefined;

      console.log('Versions final', versionsToSaveFormatted?.filter(v => v.version === 'abcxyz'));

      const response = await actionService.batchCreateActions(actionsToSave, versionsToSaveFormatted, projectId || undefined);
      if (response.success) {
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(actionsToSave)));
        setIsDirty(false);
        onDirtyChange?.(false);
        return {
          success: true,
          message: 'Actions saved successfully',
        };
      }

      return {
        success: false,
        message: 'Failed to save actions. Please try again.',
        level: 'error',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save actions';
      return {
        success: false,
        message,
        level: 'error',
      };
    }
  }, [testcaseId, actions, actionService, onDirtyChange, normalizeActionsForSave]);

  const handleDeleteAllActions = useCallback(async (): Promise<void> => {
    const effectiveId = testcaseId || actions[0]?.testcase_id || null;
    if (!effectiveId) {
      throw new Error('No testcase ID available for deletion');
    }

    const response = await actionService.deleteActionsByTestCase(effectiveId);
    if (response.success) {
      setActions([]);
      setSelectedInsertPosition(0);
      setSavedActionsSnapshot([]);
      setIsDirty(false);
      onDirtyChange?.(false);
    } else {
      throw new Error(response.error || 'Failed to delete actions');
    }
  }, [testcaseId, actions, actionService, onDirtyChange]);

  const handleUpdateAction = useCallback((updatedAction: Action) => {
    setActions(prev => {
      // Map element_id -> element (từ action đã chỉnh sửa) để đồng bộ cho các action khác
      const elementById: Record<string, ActionElement> = {};
      (updatedAction.elements || []).forEach((el) => {
        if (el.element_id) {
          elementById[el.element_id] = el;
        }
      });

      const next = prev.map(a => {
        if (a.action_id === updatedAction.action_id) {
          // Action đang sửa: thay bằng bản mới
          return { ...a, ...updatedAction };
        }

        if (!a.elements || Object.keys(elementById).length === 0) {
          return a;
        }

        // Action khác: cập nhật các element trùng element_id
        const updatedElements = a.elements.map((el) => {
          if (el.element_id && elementById[el.element_id]) {
            const source = elementById[el.element_id];
            return {
              ...el,
              ...source,
              element_id: el.element_id, // giữ nguyên id
              // giữ order_index gốc của action hiện tại nếu có
              order_index: el.order_index ?? source.order_index,
            };
          }
          return el;
        });

        return { ...a, elements: updatedElements };
      });

      setIsDirty(true);
      onDirtyChange?.(true);
      return next;
    });
    return updatedAction;
  }, [onDirtyChange]);

  return {
    actions,
    isLoading,
    isSaving,
    setIsSaving,
    selectedInsertPosition,
    setSelectedInsertPosition,
    displayInsertPosition,
    setDisplayInsertPosition,
    savedActionsSnapshot,
    isDirty,
    setIsDirty,
    handleActionsChange,
    handleDeleteAction,
    handleReorderActions,
    handleSelectInsertPosition,
    reloadActions,
    handleSaveActions,
    handleDeleteAllActions,
    handleUpdateAction,
    actionService,
  };
};

