/**
 * Navigation prevention utilities for assert mode
 * Các tiện ích ngăn chặn navigation trong chế độ assert
 */

let isAssertMode = false;

// Store original functions for restoration
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
const originalFetch = window.fetch;
const originalOpen = window.open;
const originalSubmit = HTMLFormElement.prototype.submit;
const originalSetTimeout = window.setTimeout;
const originalSetInterval = window.setInterval;
const originalAddEventListener = EventTarget.prototype.addEventListener;

// Store original navigation functions for restoration
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;
const originalGo = history.go;
const originalBack = history.back;
const originalForward = history.forward;
const originalLocationAssign = window.location.assign;
const originalLocationReplace = window.location.replace;
const originalLocationReload = window.location.reload;

/**
 * Set assert mode and override navigation functions
 * Thiết lập chế độ assert và override các hàm navigation
 */
export function setAssertMode(enabled, assertType) {
  isAssertMode = enabled;
  
  if (enabled) {
    // Override functions when enabling assert mode
    history.pushState = function() {
      // console.log('Assert mode: Prevented history.pushState');
      return;
    };
    history.replaceState = function() {
      // console.log('Assert mode: Prevented history.replaceState');
      return;
    };
    history.go = function() {
      // console.log('Assert mode: Prevented history.go');
      return;
    };
    history.back = function() {
      // console.log('Assert mode: Prevented history.back');
      return;
    };
    history.forward = function() {
      // console.log('Assert mode: Prevented history.forward');
      return;
    };
    window.location.assign = function() {
      // console.log('Assert mode: Prevented window.location.assign');
      return;
    };
    window.location.replace = function() {
      // console.log('Assert mode: Prevented window.location.replace');
      return;
    };
    window.location.reload = function() {
      // console.log('Assert mode: Prevented window.location.reload');
      return;
    };
    
    // Override AJAX functions
    XMLHttpRequest.prototype.open = function(...args) {
      // Call original open to set the request state to OPENED
      // This allows setRequestHeader to work properly
      originalXHROpen.apply(this, args);
      // But we'll prevent the actual send later
    };
    XMLHttpRequest.prototype.send = function() {
      // console.log('Assert mode: Prevented XMLHttpRequest.send');
      return;
    };
    window.fetch = function() {
      // console.log('Assert mode: Prevented fetch request');
      return Promise.reject(new Error('Assert mode: fetch requests are disabled'));
    };
    
    // Override any potential navigation functions
    if (window.open) {
      const originalOpen = window.open;
      window.open = function() {
        // console.log('Assert mode: Prevented window.open');
        return null;
      };
    }
    
    // Override any form submission that might cause navigation
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
      // console.log('Assert mode: Prevented form submission');
      return;
    };
    
    // Override any functions that might trigger loading animations
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    
    window.setTimeout = function(func, delay, ...args) {
      // Prevent any navigation or loading-related timeouts
      if (typeof func === 'string' && (func.includes('loading') || func.includes('navigate') || func.includes('redirect'))) {
        // console.log('Assert mode: Prevented navigation timeout');
        return;
      }
      return originalSetTimeout(func, delay, ...args);
    };
    
    window.setInterval = function(func, delay, ...args) {
      // Prevent any interval-based loading animations
      if (typeof func === 'string' && (func.includes('loading') || func.includes('navigate') || func.includes('redirect'))) {
        // console.log('Assert mode: Prevented navigation interval');
        return;
      }
      return originalSetInterval(func, delay, ...args);
    };
    
    // Override addEventListener to prevent navigation-related event listeners
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // Prevent navigation-related event listeners
      if (type === 'click' && typeof listener === 'function') {
        const listenerStr = listener.toString();
        if (listenerStr.includes('navigate') || listenerStr.includes('redirect') || listenerStr.includes('location')) {
          // console.log('Assert mode: Prevented navigation event listener');
          return;
        }
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  } else {
    // Restore original functions when disabling assert mode
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
    history.go = originalGo;
    history.back = originalBack;
    history.forward = originalForward;
    window.location.assign = originalLocationAssign;
    window.location.replace = originalLocationReplace;
    window.location.reload = originalLocationReload;
    
    // Restore original AJAX functions
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    window.fetch = originalFetch;
    
    // Restore original navigation functions
    if (window.open && originalOpen) {
      window.open = originalOpen;
    }
    
    // Restore original form submission
    if (originalSubmit) {
      HTMLFormElement.prototype.submit = originalSubmit;
    }
    
    // Restore original timeout and interval functions
    if (originalSetTimeout) {
      window.setTimeout = originalSetTimeout;
    }
    if (originalSetInterval) {
      window.setInterval = originalSetInterval;
    }
    
    // Restore original addEventListener
    if (originalAddEventListener) {
      EventTarget.prototype.addEventListener = originalAddEventListener;
    }
  }
  
  // console.log('Assert mode set to:', enabled, 'Type:', assertType);
}

/**
 * Prevent navigation events
 * Ngăn chặn các sự kiện navigation
 */
export function preventNavigation(e) {
  if (isAssertMode) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    // console.log('Assert mode: Prevented navigation event:', e.type);
    return false;
  }
}

/**
 * Prevent form submissions in assert mode only (but allow inside modal)
 * Ngăn chặn form submission trong chế độ assert (nhưng cho phép trong modal)
 */
export function preventFormSubmission(e) {
  if (isAssertMode) {
    const inAssertModal = e.target && typeof e.target.closest === 'function' && e.target.closest('#rikkei-assert-input-modal');
    if (inAssertModal) return;
    e.preventDefault();
    e.stopPropagation();
    // console.log('Prevented form submission - assert mode is active');
    return;
  }
}

/**
 * Prevent key events in assert mode only (but allow inside modal)
 * Ngăn chặn key events trong chế độ assert (nhưng cho phép trong modal)
 */
export function preventKeyEvents(e) {
  if (isAssertMode) {
    const inAssertModal = e.target && typeof e.target.closest === 'function' && e.target.closest('#rikkei-assert-input-modal');
    if (inAssertModal) return;
    e.preventDefault();
    e.stopPropagation();
    // console.log('Prevented keydown - assert mode is active');
    return;
  }
}

/**
 * Initialize navigation prevention event listeners
 * Khởi tạo các event listener ngăn chặn navigation
 */
export function initializeNavigationPrevention() {
  // Prevent form submissions in assert mode only (but allow inside modal)
  document.addEventListener('submit', preventFormSubmission, true);

  // Prevent key events in assert mode only (but allow inside modal)
  document.addEventListener('keydown', preventKeyEvents, true);
  document.addEventListener('keyup', preventKeyEvents, true);
  
  // Enhanced assert mode: Prevent navigation events
  document.addEventListener('beforeunload', preventNavigation, true);
  document.addEventListener('unload', preventNavigation, true);
}
