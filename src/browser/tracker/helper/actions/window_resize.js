import {
  getPauseMode,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';

let _resizeRafId = null;
let _pendingEvent = null;

function dispatchResize(e) {
  const target = window; // window resize
  const selectors = buildSelectors(document.documentElement || document.body);
  const width = Math.max(window.innerWidth || 0, 0);
  const height = Math.max(window.innerHeight || 0, 0);
  const value = `Width:${width}, Height:${height}`;
  const payload = buildCommonActionData(e, selectors, { value }, 'window_resize');
  sendAction('window_resize', payload);
}

export function handleWindowResizeEvent(e) {
  if (getPauseMode && getPauseMode()) return;
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

