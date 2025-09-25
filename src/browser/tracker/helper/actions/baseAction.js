import { generateAndValidateSelectors } from '../selectorGenerator.js';
import { previewNode, extractElementText } from '../domUtils.js';

// Trạng thái chung
let isPaused = false;
let lastInputAction = null;

// Public API: trạng thái
export function setPauseMode(enabled) {
  isPaused = enabled;
  console.log('Pause mode set to:', enabled, '- Recording paused but web interactions continue normally');
}

export function getPauseMode() {
  return isPaused;
}

export function resetLastInputAction() {
  lastInputAction = null;
  console.log('lastInputAction reset successfully');
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
    if (target.closest('#rikkei-browser-controls') || target.closest('#rikkei-assert-input-modal')) {
      console.log(`Skipping ${label} - inside browser controls or assert modal`);
      return true;
    }
  } catch {}
  return false;
}

// Helper: phần tử không nên track bằng click (đã có change)


// Helper: tạo selectors chuẩn
export function buildSelectors(target, options = {}) {
  const { maxSelectors = 5, minScore = 300, validate = true } = options;
  try {
    return generateAndValidateSelectors(target, { maxSelectors, minScore, validate });
  } catch (e) {
    console.warn('buildSelectors failed:', e);
    return [];
  }
}

// Helper: dựng payload chung
export function buildCommonActionData(e, selectors, extra = {}) {
  return {
    selector: selectors,
    element: e?.target?.tagName?.toLowerCase?.() || 'unknown',
    elementPreview: previewNode(e?.target),
    elementText: extractElementText(e?.target),
    coordinates: (typeof e?.clientX === 'number' && typeof e?.clientY === 'number')
      ? { x: e.clientX, y: e.clientY }
      : undefined,
    ...extra
  };
}

// Helper: gửi action sang main
export function sendAction(type, data) {
  console.log('Attempting to send action:', type, data);
  if (window.sendActionToMain) {
    const timestamp = Date.now();
    try {
      const action = {
        type,
        data: {
          ...data,
          timestamp,
          url: window.location.href,
          title: document.title
        }
      };
      window.sendActionToMain(action);
      console.log('Action sent successfully:', type, action, 'timestamp:', timestamp);
    } catch (error) {
      console.error('Error sending action:', error);
    }
  } else {
    console.error('sendActionToMain function not available');
  }
}
