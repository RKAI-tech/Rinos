import { createHoverOverlay, enableHoverEffects, disableHoverEffects, showHoverEffect, hideHoverEffect, getCurrentHoveredElement, getHoverOverlay } from './hoverOverlay.js';
import { initializeErrorHandlers } from './errorHandler.js';
import { initializeNavigationPrevention, setAssertMode as setNavAssertMode } from './navigationPrevention.js';
import {handleClickEvent} from './eventHandlers.js';
import { setAssertMode } from './asserts/index.js';
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

import { handleUploadChangeEvent } from './actions/upload_handle.js';
// Global assert mode state for capture phase blocking
let globalAssertMode = false;

let browserControls = null;

// Note: Global event blocker removed - using targeted blocking in individual handlers

/**
 * Capture phase event blocker for assert mode - blocks ALL events
 * Chặn TẤT CẢ sự kiện ở capture phase khi đang assert
 */
function handleAssertCaptureBlocking(e) {
  if (!globalAssertMode) {
    // console.log('Not in assert mode, allowing event:', e.type);
    return;
  }
  
  // console.log('In assert mode, checking event:', e.type, 'on', e.target);
  
  // Allow interactions with assert modal
  if (e.target && e.target.closest && e.target.closest('#rikkei-assert-input-modal')) {
    // console.log('Allowing event on assert modal');
    return;
  }
  
  // Allow interactions with browser controls
  if (e.target && e.target.closest && e.target.closest('#rikkei-browser-controls')) {
    // console.log('Allowing event on browser controls');
    return;
  }

  // Allow interactions with query panel
  if (e.target && e.target.closest && e.target.closest('#rikkei-query-panel')) {
    // console.log('Allowing event on query panel');
    return;
  }
  
  // Only block specific events that could trigger unwanted actions
  const blockableEvents = ['click', 'submit', 'mousedown', 'mouseup', 'keydown', 'keyup', 'input', 'change', 'dragstart', 'dragend', 'dragover', 'dragleave', 'drop', 'contextmenu', 'dblclick'];
  
  if (blockableEvents.includes(e.type)) {
    // Block the event
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.returnValue = false;
    
    // console.log('ASSERT MODE: Blocked event -', e.type, 'on', e.target);
    
    // For click events, we'll handle assert logic here instead of in the normal handler
    if (e.type === 'click') {
      // Use a stable reference to target to avoid stale event object after async
      const clickTarget = e.target;
      queueMicrotask(() => {
        if (clickTarget) {
          handleAssertClick({ target: clickTarget });
        }
      });
    }
  } else {
    // console.log('Event not blockable:', e.type);
  }
}

/**
 * Handle assert click logic when in assert mode
 * Xử lý logic click assert khi đang ở chế độ assert
 */
function handleAssertClick(e) {
  // console.log('Handling assert click for element:', e.target);
  processAssertClick(e);
}

function processAssertClick(e) {
  // console.log('Processing assert click for element:', e.target);
  
  // Get assert type from global state\
  // console.log('[baoviet browser] currentAssertType:', window.currentAssertType);
  const assertType = window.currentAssertType || 'toBeVisible';
  try {
    // Generate selector for the clicked element
    const rawSelector = generateSelector(e.target);
    const selector = validateAndImproveSelector(rawSelector, e.target);
    const elementType = e.target.tagName.toLowerCase();
    const elementPreview = previewNode(e.target);
    const elementText = extractElementText(e.target);
    const DOMelement = e.target.outerHTML;
    
    // console.log('Generated selector:', selector);
    
    // Handle different assert types
    if (assertType === 'toHaveText' || assertType === 'toContainText' || assertType === 'toHaveValue') {
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
      // console.log('Showing assert modal for type:', assertType, 'default value:', defaultValue);
      
      showAssertInputModal(
        assertType, 
        defaultValue, 
        rect, 
        (finalValue, connection, connection_id, query) => {
          console.log('finalValue', finalValue);
          console.log('connection', connection);
          console.log('connection_id', connection_id);
          console.log('query', query);
          sendAssertAction(selector, assertType, finalValue, elementType, elementPreview, elementText, connection, connection_id, query, DOMelement);
        }, 
        () => {
          // console.log('Assert modal canceled');
        }
      );
    } else {
      // Send immediate assert action for other types
      // console.log('Sending immediate assert action for type:', assertType);
      sendAssertAction(selector, assertType, '', elementType, elementPreview, elementText, undefined, undefined, undefined, DOMelement);
    }
  } catch (error) {
    console.error('Error processing assert click:', error);
  }
}

/**
 * Send assert action to main process
 * Gửi action assert đến main process
 */
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
    console.log('Assert action details:', action);
    window.sendActionToMain(action);
    // console.log('Assert action sent:', action);
  }
}

/**
 * Initialize browser controls and hover overlay
 * Khởi tạo browser controls và hover overlay
 */
export function initBrowserControls() {
  // Load Font Awesome if not already loaded
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);
  }
  
  // Create hover overlay after a short delay; controls moved to recorder window UI
  setTimeout(() => {
    createHoverOverlay();
  }, 100);
}

/**
 * Initialize all event listeners
 * Khởi tạo tất cả event listeners
 */
export function initializeEventListeners() {
  // Enhanced input tracking
  document.addEventListener('input', handleTextInputEvent);
  
  // // Track select element changes
  document.addEventListener('change', handleCheckboxRadioChangeEvent);
  document.addEventListener('change', handleSelectChangeEvent);
  
  // Enhanced click tracking with assert mode support
  document.addEventListener('click', handleClickEvent);
  
  // Double click tracking
  document.addEventListener('dblclick', handleDoubleClickEvent);
  document.addEventListener('keydown', handleKeyDownEvent);
  
  // Upload tracking (change trên input[type=file])
  document.addEventListener('change', handleUploadChangeEvent);
  
  // Drag and drop tracking
  // document.addEventListener('dragstart', handleDragStartEvent);
  // document.addEventListener('dragend', handleDragEndEvent);
  // document.addEventListener('drop', handleDropEvent);
  // document.addEventListener('dragover', handleDragOverEvent);
  // document.addEventListener('dragleave', handleDragLeaveEvent);
  
  //right click
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

/**
 * Initialize hover effects
 * Khởi tạo hiệu ứng hover
 */
export function initializeHoverEffects() {
  // Mouse hover tracking for element highlighting
  document.addEventListener('mouseover', function(e) {
    // Ignore hover on browser controls
    if (e.target.closest('#rikkei-browser-controls') || e.target.closest('#rikkei-hover-overlay')) {
      return;
    }
    
    // Show hover effect for the element
    showHoverEffect(e.target);
  });
  
  document.addEventListener('mouseout', function(e) {
    // Ignore if moving to browser controls or overlay
    if (e.relatedTarget && (e.relatedTarget.closest('#rikkei-browser-controls') || e.relatedTarget.closest('#rikkei-hover-overlay'))) {
      return;
    }
    
    // Hide hover effect
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

/**
 * Initialize all tracking functionality
 * Khởi tạo tất cả chức năng tracking
 */
export function initializeTracking() {
  // console.log('Playwright-style tracking script loaded and initialized');
  
  // Initialize error handlers
  initializeErrorHandlers();
  
  // Initialize navigation prevention
  initializeNavigationPrevention();
  
  // Initialize element freezer
  initializeElementFreezer();
  
  // Initialize browser controls
  initBrowserControls();
  
  // Initialize event listeners
  initializeEventListeners();
  
  // Initialize hover effects
  initializeHoverEffects();
  
  // Expose functions to main process
  window.setAssertMode = function(enabled, assertType) {
    globalAssertMode = enabled;
    if (enabled) {
      window.currentAssertType = assertType;
    }
    setAssertMode(enabled, assertType);
    setNavAssertMode(enabled, assertType);
    
    if (enabled) {
      // console.log('Assert mode enabled, freezing entire screen, type:', assertType);
      freezeEntireScreen();
    } else {
      // console.log('Assert mode disabled, unfreezing entire screen');
      unfreezeEntireScreen();
    }
    
    // console.log('Assert mode set to:', enabled, 'Type:', assertType);
    // console.log('Global assert mode:', globalAssertMode);
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

/**
 * Initialize when DOM is ready
 * Khởi tạo khi DOM đã sẵn sàng
 */
export function initializeWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTracking);
  } else {
    initializeTracking();
  }
}
