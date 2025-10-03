/**
 * Error handling utilities for tracking script
 * Các tiện ích xử lý lỗi cho tracking script
 */

/**
 * Initialize global error handlers
 * Khởi tạo các global error handler
 */
export function initializeErrorHandlers() {
  // Global error handler to prevent undefined variable errors
  window.addEventListener('error', function(e) {
    // Only log errors that are not related to undefined variables in our script
    if (e.message && e.message.includes('dragEvent is not defined')) {
      // console.warn('Prevented dragEvent reference error - this may be from browser extensions or third-party code');
      e.preventDefault();
      return false;
    }
    // Allow other errors to be logged normally
    return true;
  });
  
  // Also handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    if (e.reason && e.reason.message && e.reason.message.includes('dragEvent')) {
      // console.warn('Prevented dragEvent promise rejection error');
      e.preventDefault();
      return false;
    }
    return true;
  });
}
