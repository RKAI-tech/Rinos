import { Action } from '../../../types/actions';
import { BasicAuthentication } from '../../../types/basic_auth';

export const areActionsEqual = (a1: Action[], a2: Action[]): boolean => {
  if (a1.length !== a2.length) return false;
  
  const normalize = (actions: Action[]) => {
    return actions.map(action => {
      const { action_id, ...rest } = action;
      return JSON.stringify(rest, Object.keys(rest).sort());
    }).sort();
  };
  
  return JSON.stringify(normalize(a1)) === JSON.stringify(normalize(a2));
};

export const areBasicAuthEqual = (a1: BasicAuthentication | undefined, a2: BasicAuthentication | undefined): boolean => {
  if (a1 === undefined && a2 === undefined) return true;
  if (a1 === undefined || a2 === undefined) return false;
  return JSON.stringify(a1) === JSON.stringify(a2);
};

