/**
 * Element freezer for assert mode - prevents elements from disappearing
 * Đóng băng element khi assert để ngăn chúng biến mất
 */

let frozenElements = new Map();
let originalStyles = new Map();
let originalAnimations = new Map();
let assertedElements = new Set(); // Track elements that are currently being asserted
let screenFrozenState = false; // Track if entire screen is frozen

// Preserve originals for JS timers and RAF
let originalSetTimeout = null;
let originalClearTimeout = null;
let originalSetInterval = null;
let originalClearInterval = null;
let originalRequestAnimationFrame = null;
let originalCancelAnimationFrame = null;

// Queues for timers scheduled during freeze
let queuedTimeouts = [];
let queuedIntervals = [];

/**
 * Freeze an element to prevent it from disappearing
 * Đóng băng một element để ngăn nó biến mất
 */
export function freezeElement(element, reason = 'assert') {
  if (!element || frozenElements.has(element)) {
    return;
  }

  // console.log('Freezing element for assert:', element, 'Reason:', reason);

  // Store original styles
  const computedStyle = window.getComputedStyle(element);
  const originalStyle = {
    position: element.style.position,
    zIndex: element.style.zIndex,
    opacity: element.style.opacity,
    visibility: element.style.visibility,
    display: element.style.display
  };
  originalStyles.set(element, originalStyle);

  // Store original animations
  const originalAnimation = {
    animationName: computedStyle.animationName,
    animationDuration: computedStyle.animationDuration,
    animationDelay: computedStyle.animationDelay,
    animationIterationCount: computedStyle.animationIterationCount,
    animationDirection: computedStyle.animationDirection,
    animationFillMode: computedStyle.animationFillMode,
    animationPlayState: computedStyle.animationPlayState
  };
  originalAnimations.set(element, originalAnimation);

  // Apply freezing styles
  element.style.position = 'fixed';
  element.style.zIndex = '999998';
  element.style.opacity = '1';
  // Do not force visibility/display/animation/transition/transform

  // Add visual indicator that element is frozen
  element.style.border = '2px solid #ff6b6b';
  element.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';

  // Store element info
  frozenElements.set(element, {
    reason,
    frozenAt: Date.now(),
    originalRect: element.getBoundingClientRect()
  });

  // Add class for styling
  element.classList.add('rikkei-frozen-element');

  // console.log('Element frozen successfully:', element);
}

/**
 * Unfreeze an element
 * Bỏ đóng băng một element
 */
export function unfreezeElement(element) {
  if (!element || !frozenElements.has(element)) {
    return;
  }

  // console.log('Unfreezing element:', element);

  // Restore original styles
  const originalStyle = originalStyles.get(element);
  if (originalStyle) {
    element.style.position = originalStyle.position;
    element.style.zIndex = originalStyle.zIndex;
    element.style.opacity = originalStyle.opacity;
    element.style.visibility = originalStyle.visibility;
    element.style.display = originalStyle.display;
    // others unchanged
    element.style.border = '';
    element.style.boxShadow = '';
  }

  // Restore original animations
  const originalAnimation = originalAnimations.get(element);
  if (originalAnimation) {
    element.style.animationName = originalAnimation.animationName;
    element.style.animationDuration = originalAnimation.animationDuration;
    element.style.animationDelay = originalAnimation.animationDelay;
    element.style.animationIterationCount = originalAnimation.animationIterationCount;
    element.style.animationDirection = originalAnimation.animationDirection;
    element.style.animationFillMode = originalAnimation.animationFillMode;
    element.style.animationPlayState = originalAnimation.animationPlayState;
  }

  // Remove class
  element.classList.remove('rikkei-frozen-element');

  // Clean up
  frozenElements.delete(element);
  originalStyles.delete(element);
  originalAnimwindow.currentAssertType 
  
  ations.delete(element);

  // console.log('Element unfrozen successfully:', element);
}

/**
 * Freeze all elements of a specific type (toast, popup, modal)
 * Đóng băng tất cả element của một loại cụ thể
 */
// (Removed) freezeElementsByType and isElementVisible - no longer used

/**
 * Unfreeze all elements
 * Bỏ đóng băng tất cả element
 */
export function unfreezeAllElements() {
  // console.log('Unfreezing all elements...');
  
  const elementsToUnfreeze = Array.from(frozenElements.keys());
  elementsToUnfreeze.forEach(element => {
    unfreezeElement(element);
  });

  // console.log('[baoviet browser] assertElements:', assertedElements);

  // Clear asserted elements set
  assertedElements.clear();

  // console.log(`Unfrozen ${elementsToUnfreeze.length} elements`);
}

/**
 * Unfreeze all asserted elements (but keep other frozen elements)
 * Bỏ đóng băng tất cả element đang được assert (nhưng giữ các element đóng băng khác)
 */
// (Removed) unfreezeAllAssertedElements - no longer used

/**
 * Get frozen elements info
 * Lấy thông tin các element đã đóng băng
 */
// (Removed) getFrozenElementsInfo - not used outside

/**
 * Freeze element when it's selected for assert
 * Đóng băng element khi nó được chọn để assert
 */
export function freezeElementForAssert(element) {
  if (!element) return;
  
  // Add to asserted elements set
  assertedElements.add(element);
  
  // Check if element is likely to disappear (toast, popup, modal)
  const isLikelyToDisappear = isElementLikelyToDisappear(element);
  
  if (isLikelyToDisappear) {
    freezeElement(element, 'assert-selected');
    // console.log('Element frozen for assert as it may disappear:', element);
  }
}

/**
 * Unfreeze element when it's no longer being asserted
 * Bỏ đóng băng element khi không còn assert
 */
// (Removed) unfreezeElementFromAssert - flow simplified with full-screen freeze

/**
 * Check if element is currently being asserted
 * Kiểm tra element có đang được assert không
 */
// (Removed) isElementBeingAsserted - not used

/**
 * Get all elements currently being asserted
 * Lấy tất cả element đang được assert
 */
// (Removed) getAssertedElements - not used

/**
 * Check if element is likely to disappear
 * Kiểm tra element có khả năng biến mất không
 */
function isElementLikelyToDisappear(element) {
  if (!element) return false;
  
  const className = element.className.toLowerCase();
  const id = element.id.toLowerCase();
  const tagName = element.tagName.toLowerCase();
  
  // Check for common disappearing element patterns
  const disappearingPatterns = [
    'toast', 'notification', 'alert', 'message', 'popup', 'modal',
    'snackbar', 'banner', 'tooltip', 'dropdown', 'menu'
  ];
  
  return disappearingPatterns.some(pattern => 
    className.includes(pattern) || 
    id.includes(pattern) ||
    element.getAttribute('role') === pattern
  );
}

/**
 * Freeze entire screen for assert mode
 * Đóng băng toàn màn hình cho chế độ assert
 */
export function freezeEntireScreen() {
  if (screenFrozenState) return;
  
  // console.log('Freezing entire screen for assert mode');
  screenFrozenState = true;
  
  // 1) Pause CSS animations non-destructively using CSS (keep computed values)
  const style = document.createElement('style');
  style.id = 'rikkei-screen-freeze';
  style.textContent = `
    * { animation-play-state: paused !important; }
  `;
  document.head.appendChild(style);
  
  // 2) Hook JS timers and RAF so app timers are paused during freeze
  if (!originalSetTimeout) {
    originalSetTimeout = window.setTimeout;
    originalClearTimeout = window.clearTimeout;
    originalSetInterval = window.setInterval;
    originalClearInterval = window.clearInterval;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    
    window.setTimeout = function(cb, delay, ...args) {
      const id = originalSetTimeout(() => {
        if (screenFrozenState) {
          // queue to run after unfreeze
          queuedTimeouts.push(() => cb.apply(null, args));
        } else {
          cb.apply(null, args);
        }
      }, delay);
      return id;
    };
    window.setInterval = function(cb, delay, ...args) {
      const wrapped = () => { if (!screenFrozenState) cb.apply(null, args); };
      const id = originalSetInterval(wrapped, delay);
      queuedIntervals.push({ id, wrapped });
      return id;
    };
    window.requestAnimationFrame = function(cb) {
      return originalRequestAnimationFrame((ts) => { if (!screenFrozenState) cb(ts); });
    };
  }
  
  // Add class to body for status badge
  const badgeStyle = document.createElement('style');
  badgeStyle.id = 'rikkei-screen-freeze-badge';
  badgeStyle.textContent = `
    .rikkei-screen-frozen::before {
      content: "🔒 SCREEN FROZEN FOR ASSERT";
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff6b6b;
      color: white;
      padding: 8px 12px;
      font-size: 12px;
      border-radius: 4px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `;
  document.head.appendChild(badgeStyle);
  document.body.classList.add('rikkei-screen-frozen');
}

/**
 * Unfreeze entire screen
 * Bỏ đóng băng toàn màn hình
 */
export function unfreezeEntireScreen() {
  if (!screenFrozenState) return;
  
  // console.log('Unfreezing entire screen');
  screenFrozenState = false;
  
  // 1) Remove freeze styles (animations resume)
  const freezeStyle = document.getElementById('rikkei-screen-freeze');
  if (freezeStyle) freezeStyle.remove();
  const badgeStyle = document.getElementById('rikkei-screen-freeze-badge');
  if (badgeStyle) badgeStyle.remove();
  
  // Remove class from body
  document.body.classList.remove('rikkei-screen-frozen');
  
  // 2) Restore JS timers/RAF behavior and flush queued timeouts
  if (originalSetTimeout) {
    const timeoutsToRun = queuedTimeouts.slice();
    queuedTimeouts = [];
    timeoutsToRun.forEach(run => {
      try { run(); } catch (e) { console.warn('Queued timeout error:', e); }
    });
  }
  
  // Note: intervals were suppressed during freeze and continue now without change
  
  // 3) Unfreeze all individual elements to restore original inline styles
  unfreezeAllElements();
}

/**
 * Check if screen is frozen
 * Kiểm tra màn hình có đóng băng không
 */
export function isScreenFrozen() {
  return screenFrozenState;
}

/**
 * Initialize element freezer
 * Khởi tạo element freezer
 */
export function initializeElementFreezer() {
  // console.log('Element freezer initialized');
  
  // Add CSS for frozen elements
  const style = document.createElement('style');
  style.textContent = `
    .rikkei-frozen-element {
      position: fixed !important;
      z-index: 999998 !important;
      opacity: 1 !important;
      visibility: visible !important;
      animation: none !important;
      transition: none !important;
      transform: none !important;
      border: 2px solid #ff6b6b !important;
      box-shadow: 0 0 10px rgba(255, 107, 107, 0.5) !important;
    }
    
    .rikkei-frozen-element::before {
      content: "🔒 FROZEN FOR ASSERT";
      position: absolute;
      top: -20px;
      left: 0;
      background: #ff6b6b;
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 3px;
      z-index: 999999;
    }
  `;
  document.head.appendChild(style);
  
  // Set up periodic cleanup of disconnected elements
  setInterval(() => {
    cleanupDisconnectedElements();
  }, 5000); // Check every 5 seconds
}

/**
 * Clean up disconnected elements from asserted set
 * Dọn dẹp các element đã bị disconnect khỏi asserted set
 */
function cleanupDisconnectedElements() {
  const elementsToRemove = [];
  assertedElements.forEach(element => {
    if (!element || !element.isConnected) {
      elementsToRemove.push(element);
    }
  });
  
  elementsToRemove.forEach(element => {
    assertedElements.delete(element);
    if (frozenElements.has(element)) {
      unfreezeElement(element);
    }
  });
  
  if (elementsToRemove.length > 0) {
    // console.log(`Cleaned up ${elementsToRemove.length} disconnected elements`);
  }
}
