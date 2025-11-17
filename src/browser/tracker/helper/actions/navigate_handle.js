import { getPauseMode, sendAction } from './baseAction.js';

let last_time_click = null;
let clickedLinkHref = null;
let lastURL = window.location.href;
let isNavigating = false;

function handleClickForTimeTracking(e) {
  if (getPauseMode && getPauseMode()) return;
  last_time_click = Date.now();

  const link = e.target.closest('a');
  if (link && link.href) {
    clickedLinkHref = link.href;
    setTimeout(() => (clickedLinkHref = null), 1000);
  }
}

// Detect server redirect using Navigation Timing
// Chỉ detect server redirect, không detect JS redirect vì có thể là user action
function isServerRedirect() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (!nav) return false;
    // Chỉ loại bỏ server redirect (redirectCount > 0)
    return nav.redirectCount > 0;
  } catch {
    return false;
  }
}

function handleNavigateFunc(event) {
  if (getPauseMode && getPauseMode()) {
    console.log('[NavigateHandle] Skipping - pause mode enabled');
    return;
  }
  
  // Reset isNavigating flag sau một khoảng thời gian để tránh block navigation tiếp theo
  if (isNavigating) {
    console.log('[NavigateHandle] Skipping - already navigating');
    return;
  }

  const currentURL = window.location.href;
  const eventType = event?.type || 'unknown';

  console.log('[NavigateHandle] Event:', eventType, 'CurrentURL:', currentURL, 'LastURL:', lastURL);

  // Beforeunload → URL vẫn cũ
  if (eventType === "beforeunload") {
    // Người dùng click link
    if (clickedLinkHref && last_time_click && Date.now() - last_time_click < 1000) {
      console.log('[NavigateHandle] User clicked link, sending navigate:', clickedLinkHref);
      isNavigating = true;
      lastURL = clickedLinkHref;
      
      // Reset flag sau 2 giây
      setTimeout(() => {
        isNavigating = false;
      }, 2000);

      sendAction({
        action_type: "navigate",
        elements: [],
        action_datas: [
          { value: { url: clickedLinkHref } },
          { value: { page_index: window.__PAGE_INDEX__ || 0 } },
        ],
      });
      return;
    }
    // Nếu không có click vào link, có thể là user nhập URL trực tiếp hoặc reload
    // Trong trường hợp này, đợi unload/pagehide để xử lý
    console.log('[NavigateHandle] beforeunload without link click, waiting for unload/pagehide');
    return;
  }

  // unload / pagehide → URL đã đổi
  if (currentURL === lastURL) {
    console.log('[NavigateHandle] URL unchanged, skipping');
    return;
  }

  // Loại bỏ server redirect
  if (isServerRedirect()) {
    console.log('[NavigateHandle] Server redirect detected, skipping');
    return;
  }

  // Đánh dấu đang navigate và gửi action
  console.log('[NavigateHandle] Sending navigate action:', currentURL);
  isNavigating = true;
  lastURL = currentURL;
  
  // Reset flag sau 2 giây
  setTimeout(() => {
    isNavigating = false;
  }, 2000);

  sendAction({
    action_type: "navigate",
    elements: [],
    action_datas: [
      { value: { value: currentURL } },
      { value: { page_index: window.__PAGE_INDEX__ || 0 } },
    ],
  });
}

export function initializeNavigateHandle() {
  if (getPauseMode && getPauseMode()) {
    console.log('[NavigateHandle] Initialization skipped - pause mode enabled');
    return;
  }

  console.log('[NavigateHandle] Initializing navigation listeners');
  
  document.addEventListener("click", handleClickForTimeTracking, true);

  window.addEventListener("beforeunload", handleNavigateFunc, true);
  window.addEventListener("unload", handleNavigateFunc, true);
  window.addEventListener("pagehide", handleNavigateFunc, true);
  
  console.log('[NavigateHandle] Navigation listeners registered');
}
