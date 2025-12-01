import { useMemo } from 'react';
import { Action } from '../../../types/actions';
import { BasicAuthentication } from '../../../types/basic_auth';
import { areActionsEqual, areBasicAuthEqual } from '../utils/comparisonHelpers';

interface UseUnsavedChangesProps {
  testcaseId: string | null;
  isDirty: boolean;
  actions: Action[];
  savedActionsSnapshot: Action[];
  basicAuth: BasicAuthentication | undefined;
  savedBasicAuthSnapshot: BasicAuthentication | undefined;
}

export const useUnsavedChanges = ({
  testcaseId,
  isDirty,
  actions,
  savedActionsSnapshot,
  basicAuth,
  savedBasicAuthSnapshot,
}: UseUnsavedChangesProps) => {
  const hasUnsavedActions = useMemo(() => {
    if (!testcaseId) return false;
    if (!isDirty) return false;
    
    const actionsChanged = !areActionsEqual(actions, savedActionsSnapshot);
    const basicAuthChanged = !areBasicAuthEqual(basicAuth, savedBasicAuthSnapshot);
    
    return actionsChanged || basicAuthChanged;
  }, [testcaseId, isDirty, actions, savedActionsSnapshot, basicAuth, savedBasicAuthSnapshot]);

  return {
    hasUnsavedActions,
  };
};

