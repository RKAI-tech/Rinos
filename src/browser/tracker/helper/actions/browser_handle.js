import { 
  getPauseMode,
  shouldIgnoreTarget,
  sendAction
} from './baseAction.js';

export function attachBrowserHandlers() {
  try {
    let currentUrl = window.location.href;
    let originalUrl = window.location.href; // Lưu URL ban đầu
    let lastDomGestureTs = 0;
    let lastAutoRedirectTs = 0;
    const DOM_GESTURE_DELTA = 2000; // ms
    const AUTO_REDIRECT_DELTA = 3000; // ms - thời gian để detect auto redirect

    /**
     * Đánh dấu user gesture để phân biệt với DOM-initiated navigation
     */
    const markUserGesture = () => {
      lastDomGestureTs = Date.now();
    };

    /**
     * Kiểm tra xem navigation có phải do DOM interaction gây ra không
     */
    const isDomInitiatedNavigation = () => {
      const now = Date.now();
      const timeSinceLastGesture = now - lastDomGestureTs;
      return timeSinceLastGesture < DOM_GESTURE_DELTA;
    };

    /**
     * Kiểm tra xem có phải auto redirect không
     */
    const isAutoRedirect = () => {
      const now = Date.now();
      const timeSinceLastRedirect = now - lastAutoRedirectTs;
      return timeSinceLastRedirect < AUTO_REDIRECT_DELTA;
    };

    /**
     * Đánh dấu auto redirect
     */
    const markAutoRedirect = () => {
      lastAutoRedirectTs = Date.now();
    };

    const handleUrlChange = (eventType = 'unknown') => {
      if (getPauseMode && getPauseMode()) return;
      
      const newUrl = window.location.href;
      
      // Chỉ gửi nếu URL thực sự thay đổi
      if (newUrl !== currentUrl) {
        // Bỏ qua nếu navigation do DOM interaction gây ra
        if (isDomInitiatedNavigation()) {
          currentUrl = newUrl;
          return;
        }
        
        // Bỏ qua nếu là auto redirect
        if (isAutoRedirect()) {
          currentUrl = newUrl;
          return;
        }
        
        try {
          const timestamp = Date.now();
          let actionType = 'navigate';
          
          // Phân biệt action type dựa vào event type
          if (eventType === 'beforeunload') {
            actionType = 'reload';
          } else if (eventType === 'popstate') {
            actionType = 'back_forward';
          } else if (eventType === 'hashchange') {
            actionType = 'navigate';
          } else if (eventType === 'pushState' || eventType === 'replaceState') {
            actionType = 'navigate';
          }
          
          sendAction(actionType, { 
            timeStamp: timestamp, 
            url: newUrl,
            value: newUrl
          });
          
          markAutoRedirect();
          currentUrl = newUrl;
        } catch (error) {
          console.error('[BrowserHandle] Error in handleUrlChange:', error);
        }
      }
    };
    
    // Bắt URL thay đổi qua beforeunload
    window.addEventListener('beforeunload', () => handleUrlChange('beforeunload'), true);
    
    // Bắt URL thay đổi qua popstate (back/forward)
    window.addEventListener('popstate', () => handleUrlChange('popstate'), true);
    
    // Bắt URL thay đổi qua hashchange
    window.addEventListener('hashchange', () => handleUrlChange('hashchange'), true);
    
    // Patch history API để bắt SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(() => handleUrlChange('pushState'), 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => handleUrlChange('replaceState'), 0);
    };

    // Bắt user gestures để phân biệt với DOM-initiated navigation
    const gestureEvents = ['click', 'pointerdown', 'keydown', 'submit'];
    const gestureHandlers = [];
    
    gestureEvents.forEach(eventType => {
      const handler = (e) => {
        // Chỉ đánh dấu gesture cho Enter key và các interaction quan trọng
        if (eventType === 'keydown' && e.key !== 'Enter') return;
        if (eventType === 'submit' && e.target.tagName !== 'FORM') return;
        
        markUserGesture();
      };
      
      document.addEventListener(eventType, handler, true);
      gestureHandlers.push({ eventType, handler });
    });

    // Bắt các loại auto redirect
    const detectAutoRedirects = () => {
      // 1. Detect meta refresh redirects
      const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
      if (metaRefresh) {
        const content = metaRefresh.getAttribute('content');
        if (content && content.includes('url=')) {
          markAutoRedirect();
        }
      }

      // 2. Detect JavaScript redirects (window.location, location.href, etc.)
      const originalLocationAssign = window.location.assign;
      const originalLocationReplace = window.location.replace;
      const originalLocationHref = Object.getOwnPropertyDescriptor(window.location, 'href');

      window.location.assign = function(url) {
        markAutoRedirect();
        return originalLocationAssign.call(this, url);
      };

      window.location.replace = function(url) {
        markAutoRedirect();
        return originalLocationReplace.call(this, url);
      };

      // Override location.href setter
      Object.defineProperty(window.location, 'href', {
        set: function(url) {
          markAutoRedirect();
          if (originalLocationHref && originalLocationHref.set) {
            originalLocationHref.set.call(this, url);
          }
        },
        get: originalLocationHref ? originalLocationHref.get : function() { return this.toString(); }
      });

      // 3. Detect setTimeout/setInterval redirects
      const originalSetTimeout = window.setTimeout;
      const originalSetInterval = window.setInterval;

      window.setTimeout = function(callback, delay, ...args) {
        if (typeof callback === 'string' && (callback.includes('location') || callback.includes('window'))) {
          markAutoRedirect();
        }
        return originalSetTimeout.call(this, callback, delay, ...args);
      };

      window.setInterval = function(callback, delay, ...args) {
        if (typeof callback === 'string' && (callback.includes('location') || callback.includes('window'))) {
          markAutoRedirect();
        }
        return originalSetInterval.call(this, callback, delay, ...args);
      };

      // Return cleanup function
      return () => {
        window.location.assign = originalLocationAssign;
        window.location.replace = originalLocationReplace;
        if (originalLocationHref) {
          Object.defineProperty(window.location, 'href', originalLocationHref);
        }
        window.setTimeout = originalSetTimeout;
        window.setInterval = originalSetInterval;
      };
    };

    const redirectCleanup = detectAutoRedirects();


    return () => {
      window.removeEventListener('beforeunload', () => handleUrlChange('beforeunload'), true);
      window.removeEventListener('popstate', () => handleUrlChange('popstate'), true);
      window.removeEventListener('hashchange', () => handleUrlChange('hashchange'), true);
      
      // Remove gesture event listeners
      gestureHandlers.forEach(({ eventType, handler }) => {
        document.removeEventListener(eventType, handler, true);
      });
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      
      // Restore original redirect detection methods
      if (redirectCleanup) {
        redirectCleanup();
      }
    };
  } catch (error) {
    console.error('[BrowserHandle] Error in attachBrowserHandlers:', error);
  }
}
