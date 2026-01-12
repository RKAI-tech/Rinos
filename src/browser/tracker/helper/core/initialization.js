import { createHoverOverlay, enableHoverEffects, disableHoverEffects, showHoverEffect, hideHoverEffect, getCurrentHoveredElement, getHoverOverlay } from '../dom/hoverOverlay.js';
import { initializeErrorHandlers } from './errorHandler.js';
import { initializeNavigationPrevention, setAssertMode as setNavAssertMode } from './navigationPrevention.js';
import { handleClickEvent } from './eventHandlers.js';
import { setPauseMode, buildElement } from '../actions/baseAction.js';
import { handleDoubleClickEvent, handleRightClickEvent } from '../actions/click_handle.js';
import { generateAndValidateSelectors } from '../selector_generator/selectorGenerator.js';
import { extractElementText } from '../dom/domUtils.js';
import { handleTextInputEvent } from '../actions/text_input_handle.js';
import { initializeElementFreezer, freezeEntireScreen, unfreezeEntireScreen, unfreezeAllElements } from '../dom/elementFreezer.js';
// import { handleCheckboxRadioChangeEvent } from '../actions/change_handle.js';
import { handleKeyDownEvent } from '../actions/keyboard_handle.js';
import { handleSelectChangeEvent } from '../actions/select_handle.js';
import { handleDragStartEvent, handleDragEndEvent, handleDropEvent } from '../actions/drag_and_drop.js';
import { handleUploadChangeEvent } from '../actions/upload_handle.js';
import { handleScrollEvent } from '../actions/scroll_handle.js';
import { handleWindowResizeEvent, setExecutingActionsState } from '../actions/window_resize.js';
// import { generateAndValidateSelectors } from '../selector_generator/selectorGenerator.js';
let globalAssertMode = false;
let browserControls = null;
let browserHandlersDisposer = null;

function handleAssertCaptureBlocking(e) {
  if (!globalAssertMode) {
    return;
  }

  const target = e.target;
  if (!target) {
    return;
  }

  // Check trực tiếp tagName và parent để tránh vấn đề với closest
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
  const isContentEditable = target.isContentEditable || target.getAttribute('contenteditable') === 'true';
  
  // Check activeElement (element đang được focus) để đảm bảo input trong panel được phép
  const activeElement = document.activeElement;
  const activeIsInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
  
  // Nếu activeElement là input/textarea trong query panel, cho phép tất cả events
  if (activeIsInput && activeElement.closest && activeElement.closest('#rikkei-query-panel')) {
    return;
  }
  
  // Nếu activeElement là input/textarea trong API request panel, cho phép tất cả events
  if (activeIsInput && activeElement.closest && activeElement.closest('#rikkei-api-request-panel')) {
    return;
  }
  

  // Allow interactions with browser controls
  if (target.closest && target.closest('#rikkei-browser-controls')) {
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
      const assertType = window.currentAssertType || 'toBeVisible';
      
      // For assert types with value, send action to recorder (similar to click action)
      // Recorder will handle the modal and value input
        queueMicrotask(() => {
          if (clickTarget && window.sendActionToMain) {
            try {
              const selector = generateAndValidateSelectors(clickTarget, { minScore: 0, validate: true });
              const elementText = extractElementText(clickTarget);
              const DOMelement = clickTarget.outerHTML;
              const targetElement = clickTarget;
              
              const element = buildElement(targetElement, selector, 1);
              
              const action = {
                action_type: 'assert',
                assert_type: assertType,
                elements: [element],
                action_datas: [{
                  value: {
                    htmlDOM: DOMelement,
                    elementText: elementText,
                    page_index: window.__PAGE_INDEX__ || 0,
                    page_url: window.location.href || '',
                    page_title: document.title || '',
                  }
                }]
              };
              window.sendActionToMain(action);
            } catch (error) {
              /* console.error('Error sending assert action:', error); */
            }
          }
        });
      }
    }
 
}



export function initBrowserControls() {
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
  document.addEventListener('input', handleTextInputEvent, true);
  // document.addEventListener('change', handleCheckboxRadioChangeEvent);
  document.addEventListener('change', handleSelectChangeEvent, true);
  document.addEventListener('mouseup', handleClickEvent, true); // hotfix: D2 issues
  document.addEventListener('click', handleClickEvent, true);
  document.addEventListener('dblclick', handleDoubleClickEvent, true);
  document.addEventListener('keydown', handleKeyDownEvent, true);
  document.addEventListener('change', handleUploadChangeEvent, true);
  document.addEventListener('dragstart', handleDragStartEvent, true);
  document.addEventListener('drop', handleDropEvent, true);
  document.addEventListener('contextmenu', handleRightClickEvent, true);
  window.addEventListener('scroll', handleScrollEvent, { passive: true });
  document.addEventListener('scroll', handleScrollEvent, { passive: true, capture: true });
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
  // initializeNavigateHandle();

  // initializeTabActivateListener();

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
