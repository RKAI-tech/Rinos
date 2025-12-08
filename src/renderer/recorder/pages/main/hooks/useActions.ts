import { useState, useEffect, useCallback, useMemo } from 'react';
import { Action } from '../../../types/actions';
import { ActionService } from '../../../services/actions';
import { ActionOperationResult } from '../../../components/action_tab/ActionTab';
import { receiveActionWithInsert } from '../../../utils/receive_action';

interface UseActionsProps {
  testcaseId: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
}

export const useActions = ({ testcaseId, onDirtyChange }: UseActionsProps) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedInsertPosition, setSelectedInsertPosition] = useState<number>(0);
  const [displayInsertPosition, setDisplayInsertPosition] = useState<number>(0);
  const [savedActionsSnapshot, setSavedActionsSnapshot] = useState<Action[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const actionService = useMemo(() => new ActionService(), []);

  // Load actions khi có testcase ID
  useEffect(() => {
    const loadActions = async () => {
      if (testcaseId) {
        setIsLoading(true);
        try {
          const response = await actionService.getActionsByTestCase(testcaseId);
          if (response.success && response.data) {
            const loaded = response.data.actions || [];
            setActions(loaded);
            setSelectedInsertPosition(loaded.length);
            setSavedActionsSnapshot(JSON.parse(JSON.stringify(loaded)));
            setIsDirty(false);
            onDirtyChange?.(false);
          } else {
            setActions([]);
            setSelectedInsertPosition(0);
            setSavedActionsSnapshot([]);
            setIsDirty(false);
            onDirtyChange?.(false);
          }
        } catch (error) {
          setActions([]);
          setSelectedInsertPosition(0);
          setSavedActionsSnapshot([]);
          setIsDirty(false);
          onDirtyChange?.(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setActions([]);
        setSelectedInsertPosition(0);
        setSavedActionsSnapshot([]);
        setIsDirty(false);
        onDirtyChange?.(false);
      }
    };

    loadActions();
  }, [testcaseId, actionService, onDirtyChange]);

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
      const response = await actionService.getActionsByTestCase(effectiveId);
      console.log('hook: reload actions', response);
      if (response.success && response.data) {
        const newActions = response.data.actions || [];
        setActions(newActions);
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(newActions)));
        setIsDirty(false);
        onDirtyChange?.(false);
        const len = newActions.length;
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
  }, [testcaseId, actions, actionService, onDirtyChange]);

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

  const handleSaveActions = useCallback(async (): Promise<ActionOperationResult> => {
    console.log('hook: save actions', actions);
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
      const normalizedActions = normalizeActionsForSave(actions);
      const response = await actionService.batchCreateActions(normalizedActions);
      if (response.success) {
        setSavedActionsSnapshot(JSON.parse(JSON.stringify(actions)));
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
      const next = prev.map(a => a.action_id === updatedAction.action_id ? { ...a, ...updatedAction } : a);
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

