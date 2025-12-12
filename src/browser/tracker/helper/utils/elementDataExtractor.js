/**
 * Element Data Extractor
 * 
 * Trích xuất các đặc trưng của DOM element để lưu vào element_data
 * Giúp dễ dàng so sánh, phân tích và phát triển sau này
 */

/**
 * Lấy computed style của element
 */
function getComputedStyleSafe(element) {
  try {
    if (element && window.getComputedStyle) {
      return window.getComputedStyle(element);
    }
  } catch (e) {
    // CORS hoặc lỗi khác
  }
  return null;
}

/**
 * Lấy giá trị RGBA từ computed style
 */
function getRGBAValue(style, property) {
  try {
    if (!style) return null;
    const value = style.getPropertyValue(property);
    return value || null;
  } catch (e) {
    return null;
  }
}

/**
 * Tạo XPath cho element
 */
function getXPath(element) {
  try {
    if (!element || !element.ownerDocument) return null;
    
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    const parts = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      const tagName = current.nodeName.toLowerCase();
      parts.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }
    
    return parts.length > 0 ? `/${parts.join('/')}` : null;
  } catch (e) {
    return null;
  }
}

/**
 * Trích xuất tất cả data attributes
 */
function extractDataAttributes(element) {
  const dataAttrs = {};
  try {
    if (!element || !element.attributes) return dataAttrs;
    
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name.startsWith('data-')) {
        const key = attr.name.replace('data-', '');
        dataAttrs[key] = attr.value;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return dataAttrs;
}

/**
 * Lấy thông tin về parent element
 */
function getParentInfo(element) {
  try {
    const parent = element?.parentElement;
    if (!parent) return null;
    
    return {
      tag: parent.tagName?.toLowerCase() || null,
      id: parent.id || null,
      class: parent.className ? parent.className.trim().split(/\s+/).filter(Boolean) : null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Lấy thông tin về previous sibling
 */
function getPreviousSiblingInfo(element) {
  try {
    const prevSibling = element?.previousElementSibling;
    if (!prevSibling) return null;
    
    return {
      tag: prevSibling.tagName?.toLowerCase() || null,
      text: (prevSibling.textContent || '').trim().substring(0, 100) || null, // Limit text length
    };
  } catch (e) {
    return null;
  }
}

/**
 * Lấy vị trí trong danh sách con của parent
 */
function getChildIndex(element) {
  try {
    const parent = element?.parentElement;
    if (!parent) return null;
    
    const children = Array.from(parent.children);
    return children.indexOf(element) + 1; // 1-based index
  } catch (e) {
    return null;
  }
}

/**
 * Lấy bounding rectangle và viewport position
 */
function getPositionInfo(element) {
  try {
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    const style = getComputedStyleSafe(element);
    
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      aspectRatio: rect.width > 0 ? (rect.height / rect.width).toFixed(2) : null,
      viewportTop: Math.round(rect.top),
      viewportLeft: Math.round(rect.left),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Trích xuất tất cả thông tin element data
 * 
 * @param {HTMLElement} element - DOM element cần trích xuất
 * @returns {Object} Object chứa tất cả thông tin element
 */
export function extractElementData(element) {
  if (!element) {
    return {};
  }

  try {
    const style = getComputedStyleSafe(element);
    const positionInfo = getPositionInfo(element);
    const parentInfo = getParentInfo(element);
    const prevSiblingInfo = getPreviousSiblingInfo(element);
    
    // Tách class names thành array
    const classNames = element.className 
      ? element.className.trim().split(/\s+/).filter(Boolean)
      : null;

    // Đếm số lượng children
    const childCount = element.children ? element.children.length : 0;

    // Lấy href hoặc src
    const href = element.href || element.getAttribute('href') || null;
    const src = element.src || element.getAttribute('src') || null;
    const linkTarget = href || src;

    // Lấy URL của page hiện tại
    let pageUrl = null;
    try {
      if (element.ownerDocument && element.ownerDocument.defaultView) {
        pageUrl = element.ownerDocument.defaultView.location?.href || null;
      } else if (typeof window !== 'undefined' && window.location) {
        pageUrl = window.location.href || null;
      }
    } catch (e) {
      // CORS hoặc lỗi khác khi truy cập location
    }

    const elementData = {
      // 1. Tag name
      tagName: element.tagName?.toLowerCase() || null,
      
      // 2. ID
      id: element.id || null,
      
      // 3. Name (thường dùng trong form)
      name: element.name || element.getAttribute('name') || null,
      
      // 4. Class names (tách lẻ)
      className: classNames,
      
      // 5. Href/Src (đường dẫn đích cho các thẻ liên kết)
      href: href,
      src: src,
      linkTarget: linkTarget,
      
      // 6. Type (quan trọng với input)
      type: element.type || element.getAttribute('type') || null,
      
      // 7. Data attributes
      dataAttributes: extractDataAttributes(element),
      
      // 8. Inner text (văn bản hiển thị)
      innerText: element.innerText?.trim() || null,
      
      // 9. Text content (toàn bộ văn bản thô)
      textContent: element.textContent?.trim() || null,
      
      // 10. Value (giá trị hiện tại cho input fields)
      value: element.value || null,
      
      // 11. Placeholder (văn bản gợi ý)
      placeholder: element.placeholder || element.getAttribute('placeholder') || null,
      
      // 12. Title/Alt (văn bản chú thích hoặc thay thế)
      title: element.title || element.getAttribute('title') || null,
      alt: element.alt || element.getAttribute('alt') || null,
      
      // 13. XPath
      xpath: getXPath(element),
      
      // 14. Parent tag
      parentTag: parentInfo?.tag || null,
      
      // 15. Parent id/class
      parentId: parentInfo?.id || null,
      parentClass: parentInfo?.class || null,
      
      // 16. Previous sibling (thông tin phần tử đứng ngay trước)
      previousSibling: prevSiblingInfo,
      
      // 17. Số lượng phần tử con
      childCount: childCount,
      
      // 18. Vị trí thứ tự trong danh sách con của cha
      childIndex: getChildIndex(element),
      
      // 19. X/Y coordinates (từ positionInfo)
      x: positionInfo?.x || null,
      y: positionInfo?.y || null,
      
      // 20. Width/Height
      width: positionInfo?.width || null,
      height: positionInfo?.height || null,
      
      // 21. Tỷ lệ khung hình (width/height)
      aspectRatio: positionInfo?.aspectRatio || null,
      
      // 22. Vị trí so với viewport
      viewportTop: positionInfo?.viewportTop || null,
      viewportLeft: positionInfo?.viewportLeft || null,
      
      // 23. Background color (RGBA)
      backgroundColor: getRGBAValue(style, 'background-color'),
      
      // 24. Color (RGBA)
      color: getRGBAValue(style, 'color'),
      
      // 25. Font size (lấy từ computed style)
      fontSize: style?.getPropertyValue('font-size') || style?.fontSize || null,
      
      // 26. Font family (lấy từ computed style)
      fontFamily: style?.getPropertyValue('font-family') || style?.fontFamily || null,
      
      // 27. Font weight (lấy từ computed style)
      fontWeight: style?.getPropertyValue('font-weight') || style?.fontWeight || null,
      
      // 28. Visibility (trạng thái hiển thị)
      visibility: style?.visibility || null,
      
      // 29. Disabled hay không
      disabled: element.disabled !== undefined ? Boolean(element.disabled) : null,
      
      // 30. Display (kiểu hiển thị layout)
      display: style?.display || null,
      
      // 31. Z-index (thứ tự xếp chồng)
      zIndex: style?.zIndex || null,
      
      // 32. URL của page mà element thuộc về
      pageUrl: pageUrl,
    };

    // Loại bỏ các giá trị null để giảm kích thước dữ liệu
    const cleanedData = {};
    for (const [key, value] of Object.entries(elementData)) {
      if (value !== null && value !== undefined) {
        cleanedData[key] = value;
      }
    }

    return cleanedData;
  } catch (error) {
    // console.error('[ElementDataExtractor] Error extracting element data:', error);
    return {};
  }
}

