import { generateAndValidateSelectors } from '../selectorGenerator.js';
import { previewNode, extractElementText } from '../domUtils.js';
import { showAssertInputModal, closeAssertInputModal, getAssertModal } from '../assertModal.js';
import { handleAiAssert } from './types/ai.js';

// Trạng thái assert
let isAssertMode = false;
let currentAssertType = null;

// Trạng thái hover/timeout khi mở modal bằng hover
let hoverAssertTarget = null;
let assertModalOpenedByHover = false;
let hoverCloseTimeoutId = null;

export function startHoverCloseTimer() {
  try {
    if (hoverCloseTimeoutId) {
      clearTimeout(hoverCloseTimeoutId);
      hoverCloseTimeoutId = null;
    }
    hoverCloseTimeoutId = setTimeout(() => {
      try { closeAssertInputModal(); } catch {}
      assertModalOpenedByHover = false;
      hoverAssertTarget = null;
      hoverCloseTimeoutId = null;
    }, 1000);
  } catch {}
}

export function cancelHoverCloseTimer() {
  try {
    if (hoverCloseTimeoutId) {
      clearTimeout(hoverCloseTimeoutId);
      hoverCloseTimeoutId = null;
    }
  } catch {}
}

export function getAssertState() {
  return { isAssertMode, currentAssertType, assertModalOpenedByHover, hoverAssertTarget };
}

export function setAssertMode(enabled, assertType) {
  isAssertMode = enabled;
  currentAssertType = assertType;
  try {
    if (!enabled || (enabled && assertType && assertType !== 'VALUE' && assertType !== 'TEXT')) {
      closeAssertInputModal();
      if (hoverCloseTimeoutId) {
        clearTimeout(hoverCloseTimeoutId);
        hoverCloseTimeoutId = null;
      }
      hoverAssertTarget = null;
      assertModalOpenedByHover = false;
    }
  } catch {}
}

function isElementDisabled(element) {
  try {
    return (
      !!(element?.disabled) ||
      element?.hasAttribute?.('disabled') ||
      element?.classList?.contains('disabled') ||
      element?.style?.pointerEvents === 'none'
    );
  } catch {
    return false;
  }
}

export function handleClickEventAssertMode(e) {
  // Block hành vi mặc định
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const element = e.target;
  const assertType = currentAssertType || 'VISIBILITY';

  const selectors = generateAndValidateSelectors(element, {
    maxSelectors: 5,
    minScore: 400,
    validate: true
  });

  const elementType = element.tagName.toLowerCase();
  const elementPreview = previewNode(element);
  const elementText = extractElementText(element);

  if (assertType === 'VALUE') return handleValueAssert(element, selectors);
  if (assertType === 'TEXT') return handleTextAssert(element, selectors);
  if (assertType === 'ENABLE') return handleEnableAssert(element, selectors);
  if (assertType === 'DISABLE') return handleDisableAssert(element, selectors);
  if (assertType === 'VISIBILITY') return handleVisibilityAssert(element, selectors);
  if (assertType === 'URL') return handleUrlAssert(selectors);
  if (assertType === 'AI') return handleAiAssert(element, selectors);
}

export function handleHoverEvent(e) {
  if (!isAssertMode) return;
  if (e.target?.closest && (e.target.closest('#rikkei-browser-controls') || e.target.closest('#rikkei-assert-input-modal'))) return;

  const element = e.target;
  if (!isElementDisabled(element)) return;

  assertModalOpenedByHover = true;
  hoverAssertTarget = element;

  // Tái sử dụng click assert logic
  handleClickEventAssertMode(e);

  try {
    const cancelClose = () => cancelHoverCloseTimer();
    const onLeaveElement = (ev) => {
      const rt = ev.relatedTarget;
      const movingIntoModal = !!(rt && typeof rt.closest === 'function' && rt.closest('#rikkei-assert-input-modal'));
      if (movingIntoModal) return;
      startHoverCloseTimer();
    };

    element.addEventListener('mouseenter', cancelClose, { once: false });
    element.addEventListener('mouseleave', onLeaveElement, { once: true });
  } catch {}

  try {
    const modal = getAssertModal && getAssertModal();
    if (modal) {
      const cancelClose = () => cancelHoverCloseTimer();
      const onLeaveModal = (ev) => {
        const rt = ev.relatedTarget;
        const backToElement = !!(rt && hoverAssertTarget && hoverAssertTarget.contains && hoverAssertTarget.contains(rt));
        if (backToElement) return;
        startHoverCloseTimer();
      };
      modal.addEventListener('mouseenter', cancelClose, { once: false });
      modal.addEventListener('mouseleave', onLeaveModal, { once: true });
    }
  } catch {}
}
