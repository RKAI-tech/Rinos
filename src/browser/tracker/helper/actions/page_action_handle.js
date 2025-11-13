import { 
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  sendAction
} from './baseAction.js';
import { extractElementText, previewNode } from '../dom/domUtils.js';

export function handleBrowserAddressBarNavigate(url) {
  if (getPauseMode && getPauseMode()) {
    return;
  }

  if (!url || typeof url !== 'string') {
    return;
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl || trimmedUrl === 'about:blank') {
    return;
  }
  sendAction({
    action_type: 'navigate',
    elements: [], 
    action_datas: [
      {
        value: {
          value: trimmedUrl,
        },
      },
      {
        value: {
          page_index: window.__PAGE_INDEX__ || 0,
        },
      }
    ],
  });
}


export function initializeAddressBarNavigationListener() {
  if (typeof window !== 'undefined') {
    window.handleBrowserAddressBarNavigate = handleBrowserAddressBarNavigate;
  }
}
function handleTabActivate() {
  if (getPauseMode && getPauseMode()) {
    return;
  }

  // Lấy page title và URL
  const pageTitle = document.title || '';
  const pageUrl = window.location.href;

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
      }
    ],
  });
}
export function initializeTabActivateListener() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }

  let wasHidden = document.hidden;
  let lastActivateTime = 0;

  document.addEventListener('visibilitychange', () => {
    if (wasHidden && !document.hidden) {
      const now = Date.now();
      if (now - lastActivateTime < 500) {
        return;
      }
      lastActivateTime = now;
      
      handleTabActivate();
    }
    wasHidden = document.hidden;
  }, true);

  window.addEventListener('focus', () => {
    if (!document.hidden) {
      const now = Date.now();
      if (now - lastActivateTime < 500) {
        return;
      }
      lastActivateTime = now;
      
      handleTabActivate();
    }
  }, true);
}

