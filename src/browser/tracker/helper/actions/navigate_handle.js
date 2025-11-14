import { 
  getPauseMode,
  sendAction
} from './baseAction.js';

export function handleBrowserAddressBarNavigate(url) {
  if (getPauseMode && getPauseMode()) {
    return;
  }

  if (!url || typeof url !== 'string') {
    return;
  }

  sendAction({
    action_type: 'navigate',
    elements: [], 
    action_datas: [
      {
        value: {
          value: url,
        },
      },
      {
        value: {
          page_index: window.__PAGE_INDEX__ || 0,
        },
      }
    ],
  });
}

export function initializeAddressBarNavigationListener() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Expose function để có thể gọi từ bên ngoài
  window.handleBrowserAddressBarNavigate = handleBrowserAddressBarNavigate;

  // Theo dõi URL để bắt sự kiện navigate (giống window_resize.js)
  let lastUrl = window.location.href;
  let navigationRafId = null;
  let pendingUrl = null;
  let isInitialized = false;
  let enterKeyPressed = false; // Flag để đánh dấu user đã nhấn Enter
  let enterKeyTimeout = null;
  const ENTER_KEY_TIMEOUT = 2000; // Timeout 2 giây sau khi Enter để phân biệt với auto redirect

  // Hàm dispatch navigation (giống dispatchResize trong window_resize.js)
  function dispatchNavigation(url) {
    if (getPauseMode && getPauseMode()) {
      return;
    }
    
    if (!url || url === 'about:blank') {
      return;
    }
    
    // Chỉ gửi nếu có Enter key được nhấn trước đó (user navigation)
    if (enterKeyPressed) {
      handleBrowserAddressBarNavigate(url);
      enterKeyPressed = false; // Reset flag
    }
    // Nếu không có Enter key → đó là auto redirect, bỏ qua
  }

  // Hàm kiểm tra và xử lý URL thay đổi (giống handleWindowResizeEvent)
  function checkUrlChange() {
    const currentUrl = window.location.href;
    
    // Bỏ qua lần đầu tiên (initial URL khi script inject)
    if (!isInitialized) {
      lastUrl = currentUrl;
      isInitialized = true;
      return;
    }
    
    // Chỉ xử lý nếu URL thực sự thay đổi
    if (currentUrl !== lastUrl && currentUrl !== 'about:blank') {
      lastUrl = currentUrl;
      pendingUrl = currentUrl;
      
      // Sử dụng requestAnimationFrame để debounce (giống window_resize)
      if (navigationRafId != null) return;
      navigationRafId = window.requestAnimationFrame(() => {
        navigationRafId = null;
        const url = pendingUrl;
        pendingUrl = null;
        if (url) {
          dispatchNavigation(url);
        }
      });
    }
  }

  // Lắng nghe phím Enter để đánh dấu user navigation
  document.addEventListener('keydown', (event) => {
    // Chỉ xử lý khi nhấn Enter
    if (event.key === 'Enter' || event.keyCode === 13) {
      // Đánh dấu rằng user đã nhấn Enter (có thể là navigation)
      enterKeyPressed = true;
      
      // Clear timeout cũ nếu có
      if (enterKeyTimeout) {
        clearTimeout(enterKeyTimeout);
      }
      
      // Reset flag sau timeout để phân biệt với auto redirect
      // Nếu URL không thay đổi trong 2 giây, reset flag
      enterKeyTimeout = setTimeout(() => {
        enterKeyPressed = false;
      }, ENTER_KEY_TIMEOUT);
    }
  }, true);

  // Kiểm tra URL định kỳ bằng requestAnimationFrame (giống window_resize)
  // Nhưng chỉ kiểm tra mỗi vài frame để tối ưu performance
  let frameCount = 0;
  const CHECK_INTERVAL = 5; // Kiểm tra mỗi 5 frames (~83ms với 60fps)
  
  function startUrlCheck() {
    if (navigationRafId != null) return;
    
    navigationRafId = window.requestAnimationFrame(() => {
      navigationRafId = null;
      frameCount++;
      
      // Chỉ kiểm tra mỗi CHECK_INTERVAL frames để tối ưu
      if (frameCount >= CHECK_INTERVAL) {
        frameCount = 0;
        checkUrlChange();
      }
      
      // Tiếp tục kiểm tra nếu page còn visible
      if (!document.hidden) {
        startUrlCheck();
      }
    });
  }

  // Bắt đầu kiểm tra URL
  startUrlCheck();

  // Dừng kiểm tra khi page hidden, tiếp tục khi visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (navigationRafId != null) {
        window.cancelAnimationFrame(navigationRafId);
        navigationRafId = null;
      }
    } else {
      startUrlCheck();
    }
  }, true);

  // Cleanup khi page unload
  window.addEventListener('beforeunload', () => {
    if (navigationRafId != null) {
      try { window.cancelAnimationFrame(navigationRafId); } catch {}
      navigationRafId = null;
    }
    if (enterKeyTimeout) {
      clearTimeout(enterKeyTimeout);
      enterKeyTimeout = null;
    }
    pendingUrl = null;
    enterKeyPressed = false;
  }, true);
}

