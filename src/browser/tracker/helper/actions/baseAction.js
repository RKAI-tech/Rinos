import { generateAndValidateSelectors } from '../selector_generator/selectorGenerator.js';
import { previewNode, extractElementText } from '../dom/domUtils.js';

// Trạng thái chung
let isPaused = false;
let lastInputAction = null;

// Public API: trạng thái
export function setPauseMode(enabled) {
  isPaused = enabled;
  // console.log('Pause mode set to:', enabled, '- Recording paused but web interactions continue normally');
}

export function getPauseMode() {
  return isPaused;
}

export function resetLastInputAction() {
  lastInputAction = null;
  // console.log('lastInputAction reset successfully');
}

export function getLastInputAction() {
  return lastInputAction;
}

export function setLastInputAction(action) {
  lastInputAction = action;
}

// Helper: bỏ qua target không cần track
export function shouldIgnoreTarget(target, label = 'Event') {
  try {
    if (!target || typeof target.closest !== 'function') return false;
    // Silently ignore events inside the query panel (handled by its own listeners)
    if (target.closest('#rikkei-query-panel')) {
      return true;
    } else {
      // console.log(`Skipping ${label} - inside query panel`);
    }
    // Ignore and log for controls and assert modal only
    if (target.closest('#rikkei-browser-controls') || target.closest('#rikkei-assert-input-modal')) {
      // console.log(`Skipping ${label} - inside browser controls or assert modal`);
      return true;
    }
  } catch { }
  return false;
}

// Helper: phần tử không nên track bằng click (đã có change)


// Helper: tạo selectors chuẩn
export function buildSelectors(target, options = {}) {
  const { maxSelectors = 5, minScore = 100, validate = true } = options;
  try {
    return generateAndValidateSelectors(target, { maxSelectors, minScore, validate });
  } catch (e) {
    return [];
  }
}


export function buildCommonActionData(e, selectors, extra = {}, actionType = 'unknown') {
  return {
    action_type: actionType,
    elements: [{
      selectors: selectors.map((selector) => ({ value: selector })),
    }],
    action_datas: [{
      value: {
        coordinates: (typeof e?.clientX === 'number' && typeof e?.clientY === 'number')
          ? { x: e.clientX, y: e.clientY }
          : undefined,
        ...extra,
      },
    }],
  };
}


export function sendAction(action) {
  if (window.sendActionToMain) {
    try {
      window.sendActionToMain(action);
    } catch (error) {
      console.error('[BaseAction] Error sending action:', error);
    }
  } else {
    console.error('[BaseAction] sendActionToMain function not available');
  }
}
