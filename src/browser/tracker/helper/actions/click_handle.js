import {
  getPauseMode,
  shouldIgnoreTarget,
  buildSelectors,
  buildCommonActionData,
  sendAction
} from './baseAction.js';
import { extractElementText } from '../dom/domUtils.js';
export function shouldSkipElementForClick(element) {
  try {
    if (!element) return false;
    const tagName = element?.tagName?.toLowerCase?.();
    if (!tagName) return false;
    if (tagName === 'select') return true;
  } catch { }
  return false;
}
export function handleClickLikeBase(e, actionType, eventLabel = 'Click') {
  if (shouldIgnoreTarget(e?.target, eventLabel)) {
    // console.log(`Skipping ${eventLabel} - inside browser controls or assert modal`);
    return;
  }
  if (getPauseMode && getPauseMode()) {
    return;
  }
  if (e.screenX === 0 && e.screenY === 0 && e.detail === 0) {
    return;
  }
  if (e && e.isTrusted === false) {
    try { /* console.log(`Skipping ${eventLabel} - event is not trusted`); */ } catch { }
    return;
  }
  if (e && e.detail === 0) {
    try { /* console.log(`Skipping ${eventLabel} - event is not trusted`); */ } catch { }
    return;
  }

  if (!shouldSkipElementForClick(e?.target)) {
    const selectors = buildSelectors(e?.target, { minScore: 100, validate: true });
    const elementText = extractElementText(e?.target);
    sendAction({
      action_type: actionType,
      elements: [{
        selectors: selectors.map((selector) => ({ value: selector })),
      }],
      action_datas: [{
        value: {
          elementText: elementText,
          htmlDOM: e?.target?.outerHTML,
        },
      },
      {
        value: {
          page_index: window.__PAGE_INDEX__ || 0,
          page_url: window.location.href,
          page_title: document.title,
        },
      }],
    });
  }
}
// Click thường
export function handleClickEvent(e) {
  return handleClickLikeBase(e, 'click', 'Click');
}

// Double click
export function handleDoubleClickEvent(e) {
  return handleClickLikeBase(e, 'double_click', 'Double Click');
}

// Right click (context menu)
export function handleRightClickEvent(e) {
  return handleClickLikeBase(e, 'right_click', 'Right Click');
}

// Shift + Click
export function handleShiftClickEvent(e) {
  if (!e?.shiftKey) return;
  return handleClickLikeBase(e, 'shift_click', 'Shift Click');
}
