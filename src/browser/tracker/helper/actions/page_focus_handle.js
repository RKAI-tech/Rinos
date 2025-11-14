import { getPauseMode, sendAction } from './baseAction.js';

const DEBOUNCE_TIME = 500; // ms
let lastActivateTime = 0;
let lastVisibilityState = 'visible';
let hasReportedInitialFocus = false;

function sendPageFocusAction() {
  if (getPauseMode && getPauseMode()) return;

  const now = Date.now();
  if (now - lastActivateTime < DEBOUNCE_TIME) return;
  lastActivateTime = now;

  const pageTitle = document.title || '';
  const pageUrl = window.location.href;

  console.log(`[TabFocusTracker] Sending focus action for page_index=${window.__PAGE_INDEX__}, title=${pageTitle}`);

  sendAction({
    action_type: 'page_focus',
    elements: [],
    action_datas: [
      {
        value: {
          page_index: window.__PAGE_INDEX__ || 0,
          url: pageUrl,
          title: pageTitle,
        },
      },
    ],
  });
}

export function initializeTabActivateListener() {
  console.log(`[TabFocusTracker] Sending focus action for page_index=${window.__PAGE_INDEX__}, title=${pageTitle}`);
  if (getPauseMode && getPauseMode()) return;
  if(!document) return;
  lastVisibilityState = document.visibilityState;

  const handleVisibilityChange = () => {
    const currentState = document.visibilityState;
    if (lastVisibilityState === 'hidden' && currentState === 'visible') {
      sendPageFocusAction();
      hasReportedInitialFocus = true;
    }
    lastVisibilityState = currentState;
  };

  const handleWindowFocus = () => {
    if (document.visibilityState === 'visible') {
      sendPageFocusAction();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange, true);
  window.addEventListener('focus', handleWindowFocus, true);
  if (document.visibilityState === 'visible' && !hasReportedInitialFocus) {
    hasReportedInitialFocus = true;

    console.log(`[TabFocusTracker] Initial visible page detected → send immediate page_focus`);
    sendPageFocusAction(true);
  }
}
