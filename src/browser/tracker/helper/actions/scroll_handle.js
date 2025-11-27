import {
  getPauseMode,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { previewNode, extractElementText } from '../dom/domUtils.js';
let _scrollRafId = null;
let _pendingEvent = null;

function getScrollableTarget(e) {
  // When event comes from document capture, e.target is the scrolled element.
  const el = e && e.target && e.target !== document ? e.target : null;
  if (el && typeof el.scrollTop === 'number' && typeof el.scrollLeft === 'number') {
    return el;
  }
  return document.scrollingElement || document.documentElement || document.body;
}


function dispatchScroll(e) {
  if (e && e.isTrusted === false) {
    try { 
      // console.log('Skipping scroll recording - event is not trusted');
    } catch {}
    return;
  }
  
  const target = getScrollableTarget(e);
  const selectors = buildSelectors(target);
  const isWindow = (target === window || target === document.scrollingElement || target === document.documentElement || target === document.body);
  const scrollX = isWindow ? Math.max(window.scrollX || window.pageXOffset || 0, 0) : Math.max(target.scrollLeft || 0, 0);
  const scrollY = isWindow ? Math.max(window.scrollY || window.pageYOffset || 0, 0) : Math.max(target.scrollTop || 0, 0);
  const value = `X:${scrollX}, Y:${scrollY}`;
  const elementText = extractElementText(target);
  sendAction({
    action_type: 'scroll',
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

export function handleScrollEvent(e) {
  if (getPauseMode && getPauseMode()) return;
  _pendingEvent = e;
  if (_scrollRafId != null) return;
  _scrollRafId = window.requestAnimationFrame(() => {
    _scrollRafId = null;
    const ev = _pendingEvent;
    _pendingEvent = null;
    dispatchScroll(ev);
  });
}

export function disposeScrollHandler() {
  if (_scrollRafId != null) {
    try { window.cancelAnimationFrame(_scrollRafId); } catch {}
    _scrollRafId = null;
  }
  _pendingEvent = null;
}

