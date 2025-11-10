import { createHoverOverlay, enableHoverEffects, disableHoverEffects, showHoverEffect, hideHoverEffect, getCurrentHoveredElement, getHoverOverlay } from '../dom/hoverOverlay.js';
import { initializeErrorHandlers } from './errorHandler.js';
import { initializeNavigationPrevention, setAssertMode as setNavAssertMode } from './navigationPrevention.js';
import { handleClickEvent } from './eventHandlers.js';
import { setPauseMode } from '../actions/baseAction.js';
import { handleDoubleClickEvent, handleRightClickEvent, handleShiftClickEvent } from '../actions/click_handle.js';
import { generateSelector, validateAndImproveSelector } from '../selector_generator/selectorGenerator.js';
import { previewNode, extractElementText } from '../dom/domUtils.js';
import { showAssertInputModal, closeAssertInputModal } from '../components/modals/assertInputModal.js';
import { handleTextInputEvent } from '../actions/text_input_handle.js';
import { initializeElementFreezer, freezeEntireScreen, unfreezeEntireScreen, unfreezeAllElements } from '../dom/elementFreezer.js';
// import { handleCheckboxRadioChangeEvent } from '../actions/change_handle.js';
import { handleKeyDownEvent } from '../actions/keyboard_handle.js';
import { handleSelectChangeEvent } from '../actions/select_handle.js';
import { handleDragStartEvent, handleDragEndEvent, handleDropEvent } from '../actions/drag_and_drop.js';
import { handleUploadChangeEvent } from '../actions/upload_handle.js';
import { handleScrollEvent } from '../actions/scroll_handle.js';
import { handleWindowResizeEvent, setExecutingActionsState } from '../actions/window_resize.js';

let globalAssertMode = false;
let browserControls = null;
let browserHandlersDisposer = null;

function handleAssertCaptureBlocking(e) {
  if (!globalAssertMode) {
    return;
  }

  // Allow interactions with assert modal
  if (e.target && e.target.closest && e.target.closest('#rikkei-assert-input-modal')) {
    return;
  }

  // Allow interactions with browser controls
  if (e.target && e.target.closest && e.target.closest('#rikkei-browser-controls')) {
    return;
  }

  // Allow interactions with query panel
  if (e.target && e.target.closest && e.target.closest('#rikkei-query-panel')) {
    return;
  }

  // Only block specific events that could trigger unwanted actions
  const blockableEvents = [
    'click',
    'submit',
    'mousedown',
    'mouseup',
    'keydown',
    'keyup',
    'input',
    'change',
    'dragstart',
    'dragend',
    'dragover',
    'dragleave',
    'drop',
    'contextmenu',
    'dblclick'
  ];

  if (blockableEvents.includes(e.type)) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.returnValue = false;

    if (e.type === 'click') {
      const clickTarget = e.target;
      queueMicrotask(() => {
        if (clickTarget) {
          handleAssertClick({ target: clickTarget });
        }
      });
    }
  } else {
  }
}

/**
 * Handle assert click logic when in assert mode
 * Xử lý logic click assert khi đang ở chế độ assert
 */
function handleAssertClick(e) {
  processAssertClick(e);
}

function processAssertClick(e) {
  const assertType = window.currentAssertType || 'toBeVisible';
  try {
    const rawSelector = generateSelector(e.target, { minScore: 200 });
    const selector = validateAndImproveSelector(rawSelector, e.target);
    const elementType = e.target.tagName.toLowerCase();
    const elementPreview = previewNode(e.target);
    const elementText = extractElementText(e.target);
    const DOMelement = e.target.outerHTML;

    const types = ['toHaveText', 'toContainText', 'toHaveValue', 'toHaveAccessibleDescription', 'toHaveAccessibleName', 'toHaveCount', 'toHaveRole'];
    if (types.includes(assertType)) {
      let defaultValue = '';
      if (assertType === 'toHaveValue') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          defaultValue = e.target.value || '';
        } else {
          defaultValue = e.target.getAttribute('value') || e.target.textContent?.trim() || '';
        }
      } else {
        defaultValue = e.target.textContent?.trim() || e.target.innerText?.trim() || '';
      }
      const rect = e.target.getBoundingClientRect();
      showAssertInputModal(
        assertType,
        defaultValue,
        rect,
        (finalValue, connection, connection_id, query, apiRequest) => {
          console.log('[processAssertClick] onConfirm callback called:', {
            finalValue,
            hasConnection: !!connection,
            hasQuery: !!query,
            hasApiRequest: !!apiRequest,
            apiRequest: apiRequest
          });
          sendAssertAction(selector, assertType, finalValue, elementType, elementPreview, elementText, connection, connection_id, query, DOMelement, apiRequest);
        },
        () => {
        }
      );
    } else {
      console.log('[processAssertClick] No modal needed, sending assert action directly');
      sendAssertAction(selector, assertType, '', elementType, elementPreview, elementText, undefined, undefined, undefined, DOMelement, undefined);
    }
  } catch (error) {
  }
}

function sendAssertAction(selector, assertType, value, elementType, elementPreview, elementText, connection_id, connection, query, DOMelement, apiRequest) {
  console.log('[sendAssertAction] Called with:', {
    assertType,
    value,
    hasQuery: !!query,
    hasApiRequest: !!apiRequest,
    apiRequest: apiRequest
  });
  
  if (window.sendActionToMain) {
    const action = {
      action_type: 'assert',
      assert_type: assertType,
      elements: [{
        selectors: selector.map((selector) => ({ value: selector })),
      }],
      action_datas: [
        {
          value: {
            value: value,
          },
          statement: {
              statement_id: Math.random().toString(36),
              statement_text: query,
              connection_id: connection_id,
              database_connection: connection
            }
          ],
          // api_request: [
          //   {
          //     // api configs
          //   }
          // ]
        }
      ]
    }
    console.log('[sendAssertAction] Sending action to main:', action);
    window.sendActionToMain(action);
    console.log('[sendAssertAction] Action sent successfully');
  } else {
    console.warn('[sendAssertAction] window.sendActionToMain is not available');
  }

}

export function initBrowserControls() {
  // Load Font Awesome if not already loaded
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
  }

  setTimeout(() => {
    createHoverOverlay();
  }, 100);
}

export function initializeEventListeners() {
  // Enhanced input tracking
  document.addEventListener('input', handleTextInputEvent,true);
  // document.addEventListener('change', handleCheckboxRadioChangeEvent);
  document.addEventListener('change', handleSelectChangeEvent,true);
  document.addEventListener('click', handleClickEvent, true);
  document.addEventListener('dblclick', handleDoubleClickEvent,true);
  document.addEventListener('keydown', handleKeyDownEvent,true);
  document.addEventListener('change', handleUploadChangeEvent,true);
  document.addEventListener('dragstart', handleDragStartEvent,true);
  document.addEventListener('drop', handleDropEvent,true);
  document.addEventListener('contextmenu', handleRightClickEvent,true);
  // Scroll tracking (passive)
  window.addEventListener('scroll', handleScrollEvent, { passive: true });
  // Capture internal container scrolls as well
  document.addEventListener('scroll', handleScrollEvent, { passive: true, capture: true });
  // Window resize tracking (passive)
  window.addEventListener('resize', handleWindowResizeEvent, { passive: true });

  // Add capture phase event blocker for assert mode - blocks specific events only
  document.addEventListener('click', handleAssertCaptureBlocking, true);
  document.addEventListener('submit', handleAssertCaptureBlocking, true);
  document.addEventListener('mousedown', handleAssertCaptureBlocking, true);
  document.addEventListener('mouseup', handleAssertCaptureBlocking, true);
  document.addEventListener('input', handleAssertCaptureBlocking, true);
  document.addEventListener('change', handleAssertCaptureBlocking, true);
  document.addEventListener('keydown', handleAssertCaptureBlocking, true);
  document.addEventListener('keyup', handleAssertCaptureBlocking, true);
  document.addEventListener('dragstart', handleAssertCaptureBlocking, true);
  document.addEventListener('dragend', handleAssertCaptureBlocking, true);
  document.addEventListener('dragover', handleAssertCaptureBlocking, true);
  document.addEventListener('dragleave', handleAssertCaptureBlocking, true);
  document.addEventListener('drop', handleAssertCaptureBlocking, true);
  document.addEventListener('contextmenu', handleAssertCaptureBlocking, true);
  document.addEventListener('dblclick', handleAssertCaptureBlocking, true);

}

export function initializeHoverEffects() {
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest('#rikkei-browser-controls') || e.target.closest('#rikkei-hover-overlay')) {
      return;
    }
    showHoverEffect(e.target);
  });

  // Mouse out tracking
  document.addEventListener('mouseout', function (e) {
    if (e.relatedTarget && (e.relatedTarget.closest('#rikkei-browser-controls') || e.relatedTarget.closest('#rikkei-hover-overlay'))) {
      return;
    }
    hideHoverEffect();
  });

  // Handle scroll events to update hover overlay position
  document.addEventListener('scroll', function () {
    const currentHoveredElement = getCurrentHoveredElement();
    const hoverOverlay = getHoverOverlay();
    if (currentHoveredElement && hoverOverlay) {
      showHoverEffect(currentHoveredElement);
    }
  });

  // Handle window resize to update hover overlay
  window.addEventListener('resize', function () {
    const currentHoveredElement = getCurrentHoveredElement();
    const hoverOverlay = getHoverOverlay();
    if (currentHoveredElement && hoverOverlay) {
      showHoverEffect(currentHoveredElement);
    }
  });
}

export function initializeTracking() {
  initializeErrorHandlers();
  initializeNavigationPrevention();
  initializeElementFreezer();
  initBrowserControls();
  initializeEventListeners();
  initializeHoverEffects();

  // Expose functions to main process
  window.setAssertMode = function (enabled, assertType) {
    globalAssertMode = enabled;
    if (enabled) {
      window.currentAssertType = assertType;
    }
    // setAssertMode(enabled, assertType);
    setNavAssertMode(enabled, assertType);

    if (enabled) {
      freezeEntireScreen();
    } else {
      unfreezeEntireScreen();
      closeAssertInputModal();
    }
  };

  window.setPauseMode = function (enabled) {
    setPauseMode(enabled);
  };

  // Control hover effects
  window.enableHoverEffects = enableHoverEffects;
  window.disableHoverEffects = disableHoverEffects;

  // Expose reset function globally so it can be called from main process
  window.resetLastInputAction = function () {
    resetLastInputAction();
  };

  // Expose element freezer functions globally
  window.unfreezeEntireScreen = unfreezeEntireScreen;
  window.unfreezeAllElements = unfreezeAllElements;
  // Note: per new full-screen freeze design, no per-element unfreeze API exposed

  // Expose cleanup function for browser handlers
  // window.cleanupBrowserHandlers = function() {
  //   if (browserHandlersDisposer) {
  //     browserHandlersDisposer();
  //     browserHandlersDisposer = null;
  //   }
  // };

  // Expose function to control execution state for resize events
  window.setExecutingActionsState = setExecutingActionsState;
}

// Check if DOM is ready
export function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
}
