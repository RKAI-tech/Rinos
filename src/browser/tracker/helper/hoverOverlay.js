/**
 * Hover overlay functionality for element highlighting
 * Chức năng hover overlay để highlight element
 */

let hoverOverlay = null;
let currentHoveredElement = null;

/**
 * Create hover overlay for element highlighting
 * Tạo hover overlay để highlight element
 */
export function createHoverOverlay() {
  // Remove existing overlay if any
  if (hoverOverlay) {
    document.body.removeChild(hoverOverlay);
  }
  
  // Create overlay element
  hoverOverlay = document.createElement('div');
  hoverOverlay.id = 'rikkei-hover-overlay';
  hoverOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    transition: all 0.15s ease;
  `;
  
  // Add to page
  document.body.appendChild(hoverOverlay);
  
  return hoverOverlay;
}

/**
 * Show hover effect for element
 * Hiển thị hiệu ứng hover cho element
 */
export function showHoverEffect(element) {
  if (!hoverOverlay || !element) return;
  
  currentHoveredElement = element;
  
  // Get element position and size
  const rect = element.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  
  // Create highlight box
  const highlightBox = document.createElement('div');
  highlightBox.style.cssText = `
    position: absolute;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 4px;
    pointer-events: none;
    z-index: 10000;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
    animation: rikkei-hover-pulse 1.5s ease-in-out infinite;
  `;
  
  // Add pulse animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes rikkei-hover-pulse {
      0%, 100% { 
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
        transform: scale(1);
      }
      50% { 
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.6);
        transform: scale(1.02);
      }
    }
  `;
  
  if (!document.querySelector('#rikkei-hover-animations')) {
    style.id = 'rikkei-hover-animations';
    document.head.appendChild(style);
  }
  
  // Clear previous highlights
  hoverOverlay.innerHTML = '';
  hoverOverlay.appendChild(highlightBox);
  
  // Add element info tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute;
    top: ${rect.top - 40}px;
    left: ${rect.left}px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    pointer-events: none;
    z-index: 10001;
    white-space: nowrap;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  
  // Get element info
  const tagName = element.tagName.toLowerCase();
  const elementId = element.id ? `#${element.id}` : '';
  let elementClass = '';
  if (typeof element.className === 'string' && element.className.trim() !== '') {
    elementClass = `.${element.className.split(' ')[0]}`;
  }
  const elementText = element.textContent?.trim().substring(0, 30) || '';
  
  tooltip.textContent = `${tagName}${elementId}${elementClass} ${elementText}`;
  hoverOverlay.appendChild(tooltip);
}

/**
 * Hide hover effect
 * Ẩn hiệu ứng hover
 */
export function hideHoverEffect() {
  if (!hoverOverlay || !currentHoveredElement) return;
  
  currentHoveredElement = null;
  hoverOverlay.innerHTML = '';
}

/**
 * Enable hover effects
 * Bật hiệu ứng hover
 */
export function enableHoverEffects() {
  if (hoverOverlay) {
    hoverOverlay.style.display = 'block';
    // console.log('Hover effects enabled');
  }
}

/**
 * Disable hover effects
 * Tắt hiệu ứng hover
 */
export function disableHoverEffects() {
  if (hoverOverlay) {
    hoverOverlay.style.display = 'none';
    hideHoverEffect();
    // console.log('Hover effects disabled');
  }
}

/**
 * Get current hovered element
 * Lấy element đang được hover
 */
export function getCurrentHoveredElement() {
  return currentHoveredElement;
}

/**
 * Get hover overlay element
 * Lấy element hover overlay
 */
export function getHoverOverlay() {
  return hoverOverlay;
}
