import {
  getPauseMode,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { extractElementText } from '../dom/domUtils.js';
let _resizeRafId = null;
let _pendingEvent = null;
let _isExecutingActions = false;

function dispatchResize(e) {
  const target = window; // window resize
  if (e && e.isTrusted === false) {
    try { console.log('Skipping window resize recording - event is not trusted'); } catch {}
    return;
  }
  const selectors = buildSelectors(document.documentElement || document.body);
  const width = Math.max(window.innerWidth || 0, 0);
  const height = Math.max(window.innerHeight || 0, 0);
  const value = `Width:${width}, Height:${height}`;
  const elementText = extractElementText(document.documentElement || document.body);
  sendAction({
    action_type: 'window_resize',
    elements: [{
      selectors: selectors.map((selector) => ({ value: selector })),
    }],
    action_datas: [{
      value: { value: value, elementText: elementText },
    },
    {
      value: {
        page_index: window.__PAGE_INDEX__ || 0,
      },
    }
  ],
  });
}

export function handleWindowResizeEvent(e) {
  if (getPauseMode && getPauseMode()) return;
  // Don't record resize events when executing actions to prevent infinite loop
  if (_isExecutingActions) {
    // console.log('[WindowResize] Skipping resize event recording - actions are executing');
    return;
  }
  
  // console.log('[WindowResize] Recording resize event:', window.innerWidth, 'x', window.innerHeight);
  
  _pendingEvent = e;
  if (_resizeRafId != null) return;
  _resizeRafId = window.requestAnimationFrame(() => {
    _resizeRafId = null;
    const ev = _pendingEvent;
    _pendingEvent = null;
    dispatchResize(ev);
  });
}

export function disposeWindowResizeHandler() {
  if (_resizeRafId != null) {
    try { window.cancelAnimationFrame(_resizeRafId); } catch {}
    _resizeRafId = null;
  }
  _pendingEvent = null;
}

// Functions to control execution state
export function setExecutingActionsState(isExecuting) {
  _isExecutingActions = isExecuting;
  // console.log('[WindowResize] Execution state changed:', isExecuting);
}

