import { createHoverOverlay, enableHoverEffects, disableHoverEffects, showHoverEffect, hideHoverEffect, getCurrentHoveredElement, getHoverOverlay } from './hoverOverlay.js';
import { initializeErrorHandlers } from './errorHandler.js';
import { initializeNavigationPrevention, setAssertMode as setNavAssertMode } from './navigationPrevention.js';
import {handleClickEvent} from './eventHandlers.js';
// import { setAssertMode } from './asserts/index.js';
import { setPauseMode } from './actions/baseAction.js';
import { handleDoubleClickEvent, handleRightClickEvent, handleShiftClickEvent } from './actions/click_handle.js';
import { generateSelector, validateAndImproveSelector } from './selectorGenerator.js';
import { previewNode, extractElementText } from './domUtils.js';
import { showAssertInputModal } from './components/modals/assertInputModal.js';
import { handleTextInputEvent } from './actions/text_input_handle.js';
import { initializeElementFreezer, freezeEntireScreen, unfreezeEntireScreen, unfreezeAllElements } from './elementFreezer.js';
import { handleCheckboxRadioChangeEvent } from './actions/change_handle.js';
import { handleKeyDownEvent} from './actions/keyboard_handle.js';
import { handleSelectChangeEvent } from './actions/select_handle.js';
import { handleDragStartEvent, handleDragEndEvent, handleDropEvent } from './actions/drag_and_drop.js';
import { handleUploadChangeEvent } from './actions/upload_handle.js';
// Global assert mode state for capture phase blocking
let globalAssertMode = false;
let browserControls = null;

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
        (finalValue, connection, connection_id, query) => {
          sendAssertAction(selector, assertType, finalValue, elementType, elementPreview, elementText, connection, connection_id, query, DOMelement);
        }, 
        () => {
        }
      );
    } else {
      sendAssertAction(selector, assertType, '', elementType, elementPreview, elementText, undefined, undefined, undefined, DOMelement);
    }
  } catch (error) {
  }
}

function sendAssertAction(selector, assertType, value, elementType, elementPreview, elementText, connection_id, connection, query, DOMelement) {
  if (window.sendActionToMain) {
    const action = {
      type: 'assert',
      selector: selector,
      assertType: assertType,
      value: value,
      element: elementType,
      elementPreview: elementPreview,
      elementText: elementText,
      connection: connection,
      connection_id: connection_id,
      query: query,
      timestamp: Date.now(),
      url: window.location.href,
      title: document.title,
      DOMelement: DOMelement,
    };
    window.sendActionToMain(action);
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
  document.addEventListener('input', handleTextInputEvent);
  document.addEventListener('change', handleCheckboxRadioChangeEvent);
  document.addEventListener('change', handleSelectChangeEvent);
  document.addEventListener('click', handleClickEvent, true);
  document.addEventListener('dblclick', handleDoubleClickEvent);
  document.addEventListener('keydown', handleKeyDownEvent);
  document.addEventListener('change', handleUploadChangeEvent);
  document.addEventListener('dragstart', handleDragStartEvent);
  document.addEventListener('drop', handleDropEvent);
  document.addEventListener('contextmenu', handleRightClickEvent);
  
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
  document.addEventListener('mouseover', function(e) {
    if (e.target.closest('#rikkei-browser-controls') || e.target.closest('#rikkei-hover-overlay')) {
      return;
    }
    showHoverEffect(e.target);
  });
  
  // Mouse out tracking
  document.addEventListener('mouseout', function(e) {
    if (e.relatedTarget && (e.relatedTarget.closest('#rikkei-browser-controls') || e.relatedTarget.closest('#rikkei-hover-overlay'))) {
      return;
    }
    hideHoverEffect();
  });
  
  // Handle scroll events to update hover overlay position
  document.addEventListener('scroll', function() {
    const currentHoveredElement = getCurrentHoveredElement();
    const hoverOverlay = getHoverOverlay();
    if (currentHoveredElement && hoverOverlay) {
      showHoverEffect(currentHoveredElement);
    }
  });
  
  // Handle window resize to update hover overlay
  window.addEventListener('resize', function() {
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

  window.setAssertMode = function(enabled, assertType) {
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

  window.setPauseMode = function(enabled) {
    setPauseMode(enabled);
  };
  
  // Control hover effects
  window.enableHoverEffects = enableHoverEffects;
  window.disableHoverEffects = disableHoverEffects;
  
  // Expose reset function globally so it can be called from main process
  window.resetLastInputAction = function() {
    resetLastInputAction();
  };
  
  // Expose element freezer functions globally
  window.unfreezeEntireScreen = unfreezeEntireScreen;
  window.unfreezeAllElements = unfreezeAllElements;
  // Note: per new full-screen freeze design, no per-element unfreeze API exposed
}

// Check if DOM is ready
export function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
}
