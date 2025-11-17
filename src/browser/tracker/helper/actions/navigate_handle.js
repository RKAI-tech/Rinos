import { getPauseMode, sendAction } from './baseAction.js';
function handleNavigateFunc(){
  
}
export function initializeTabActivateListener() {
  if (getPauseMode && getPauseMode()) return;
 
  window.addEventListener('beforeunload', handleNavigateFunc, true);

}
