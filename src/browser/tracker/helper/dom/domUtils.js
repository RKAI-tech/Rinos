/**
 * DOM utility functions
 * Các hàm tiện ích để làm việc với DOM
 */

import { normalizeWhiteSpace, trimStringWithEllipsis, oneLine } from '../utils/stringUtils.js';

// Re-export string utilities for convenience
export { normalizeWhiteSpace, trimStringWithEllipsis, oneLine };

/**
 * Preview DOM node for debugging
 * Xem trước DOM node để debug
 */
export function previewNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return oneLine(`#text=${node.nodeValue || ''}`);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return oneLine(`<${node.nodeName.toLowerCase()} />`);
  }
  
  const element = node;
  const attrs = [];
  
  for (let i = 0; i < element.attributes.length; i++) {
    const { name, value } = element.attributes[i];
    if (name === 'style') continue;
    if (!value && ['checked', 'selected', 'disabled', 'readonly', 'multiple'].includes(name)) {
      attrs.push(` ${name}`);
    } else {
      attrs.push(` ${name}="${value}"`);
    }
  }
  
  attrs.sort((a, b) => a.length - b.length);
  const attrText = trimStringWithEllipsis(attrs.join(''), 500);
  
  const autoClosingTags = new Set(['AREA', 'BASE', 'BR', 'COL', 'COMMAND', 'EMBED', 'HR', 'IMG', 'INPUT', 'KEYGEN', 'LINK', 'MENUITEM', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR']);
  if (autoClosingTags.has(element.nodeName)) {
    return oneLine(`<${element.nodeName.toLowerCase()}${attrText}/>`);
  }

  const children = element.childNodes;
  let onlyText = false;
  if (children.length <= 5) {
    onlyText = true;
    for (let i = 0; i < children.length; i++) {
      onlyText = onlyText && children[i].nodeType === Node.TEXT_NODE;
    }
  }
  
  const text = onlyText ? (element.textContent || '') : (children.length ? '…' : '');
  return oneLine(`<${element.nodeName.toLowerCase()}${attrText}>${trimStringWithEllipsis(text, 50)}</${element.nodeName.toLowerCase()}>`);
}

/**
 * Extract meaningful text from element
 * Trích xuất text có ý nghĩa từ element
 */
export function extractElementText(element) {
  if (!element) return '';
  
  // Try to get accessible name first (most meaningful)
  const accessibleName = getAccessibleName(element);
  if (accessibleName) {
    return accessibleName.replace(/[\r\n]+/g, ' ').replace(/['"]/g, '');
  }
  
  // Try to get text content
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length > 1 && textContent.length < 100) {
    return textContent.replace(/[\r\n]+/g, ' ').replace(/['"]/g, '');
  }
  
  // Try to get inner text
  const innerText = element.innerText?.trim();
  if (innerText && innerText.length > 1 && innerText.length < 100) {
    return innerText.replace(/[\r\n]+/g, ' ').replace(/['"]/g, '');
  }
  
  return '';
}

// /**
//  * Get accessible name following ARIA standards
//  * Lấy tên accessible theo chuẩn ARIA
//  */
// export function getAccessibleName(element) {
//   // Try aria-label first
//   const ariaLabel = element.getAttribute('aria-label');
//   if (ariaLabel && ariaLabel.trim()) {
//     return ariaLabel.trim();
//   }
  
//   // Try aria-labelledby
//   const ariaLabelledBy = element.getAttribute('aria-labelledby');
//   if (ariaLabelledBy) {
//     const labelElement = document.getElementById(ariaLabelledBy);
//     if (labelElement) {
//       const labelText = labelElement.textContent?.trim();
//       if (labelText) {
//         return labelText;
//       }
//     }
//   }
  
//   // Try title attribute
//   const title = element.getAttribute('title');
//   if (title && title.trim()) {
//     return title.trim();
//   }
  
//   // Try alt attribute for images
//   if (element.tagName === 'IMG') {
//     const alt = element.getAttribute('alt');
//     if (alt && alt.trim()) {
//       return alt.trim();
//     }
//   }
  
//   // Try placeholder for input fields
//   if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
//     const placeholder = element.getAttribute('placeholder');
//     if (placeholder && placeholder.trim()) {
//       return placeholder.trim();
//     }
//   }
  
//   // Try name attribute
//   const name = element.getAttribute('name');
//   if (name && name.trim()) {
//     return name.trim();
//   }
  
//   // Try value attribute for buttons and inputs
//   const value = element.getAttribute('value');
//   if (value && value.trim()) {
//     return value.trim();
//   }
  
//   return '';
// }

// /**
//  * Get element role for accessibility
//  * Lấy role của element cho accessibility
//  */
// export function getElementRole(element) {
//   // Check explicit role attribute
//   const role = element.getAttribute('role');
//   if (role) return role;
  
//   // Infer role from tag name
//   const tag = element.tagName.toLowerCase();
//   const roleMap = {
//     'button': 'button',
//     'input': element.type === 'button' || element.type === 'submit' || element.type === 'reset' ? 'button' : 'textbox',
//     'a': 'link',
//     'img': 'img',
//     'nav': 'navigation',
//     'main': 'main',
//     'header': 'banner',
//     'footer': 'contentinfo',
//     'aside': 'complementary',
//     'section': 'region',
//     'article': 'article',
//     'form': 'form',
//     'table': 'table',
//     'ul': 'list',
//     'ol': 'list',
//     'li': 'listitem',
//     'h1': 'heading',
//     'h2': 'heading',
//     'h3': 'heading',
//     'h4': 'heading',
//     'h5': 'heading',
//     'h6': 'heading'
//   };
  
//   return roleMap[tag] || null;
// }

/**
 * Retarget element following Playwright's approach
 * Retarget element theo cách tiếp cận của Playwright
 */
// export function retargetElement(el, behavior = 'none') {
//   if (!el) return null;
  
//   let element = el;
  
//   if (behavior === 'none') return element;
  
//   // If not an interactive element, find the closest interactive parent
//   if (!element.matches('input, textarea, select') && !element.isContentEditable) {
//     if (behavior === 'button-link') {
//       element = element.closest('button, [role=button], a, [role=link]') || element;
//     } else {
//       element = element.closest('button, [role=button], [role=checkbox], [role=radio]') || element;
//     }
//   }
  
//   // Follow label if needed
//   if (behavior === 'follow-label') {
//     if (!element.matches('a, input, textarea, button, select, [role=link], [role=button], [role=checkbox], [role=radio]') &&
//         !element.isContentEditable) {
//       const enclosingLabel = element.closest('label');
//       if (enclosingLabel && enclosingLabel.control) {
//         element = enclosingLabel.control;
//       }
//     }
//   }
  
//   return element;
// }

// import { normalizeWhiteSpace, trimStringWithEllipsis, oneLine } from '../utils/stringUtils.js';

// export { normalizeWhiteSpace, trimStringWithEllipsis, oneLine };

/**
 * Tìm kiếm element xuyên qua Shadow DOM (Depth-first traversal)
 * Thay thế cho document.querySelectorAll
 */
export function queryShadowAll(selector, root = document) {
  const results = [];
  
  // 1. Tìm trong scope hiện tại
  try {
    const matches = root.querySelectorAll(selector);
    matches.forEach(m => results.push(m));
  } catch (e) {
    // Bỏ qua selector lỗi (ví dụ xpath trong css query)
  }

  // 2. Tìm các Shadow Roots và đệ quy
  // Sử dụng TreeWalker để duyệt hiệu quả hơn
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.shadowRoot) {
      results.push(...queryShadowAll(selector, node.shadowRoot));
    }
  }
  
  return results;
}

/**
 * Kiểm tra element có hiển thị hay không
 */
export function isVisible(element) {
  if (!element) return false;
  if (element.getAttribute && element.getAttribute('aria-hidden') === 'true') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).visibility !== 'hidden';
}

/**
 * Tính toán Accessible Name (Simplified Version of AccName Spec)
 * Dùng cho getByRole('...', { name: '...' })
 */
export function getAccessibleName(element) {
  if (!element) return '';

  // 1. aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/);
    return ids.map(id => {
      // Lưu ý: labelledby chỉ tham chiếu trong cùng document/root, không xuyên shadow dom chuẩn
      const refEl = element.getRootNode().getElementById(id);
      return refEl ? getAccessibleName(refEl) : '';
    }).join(' ').trim();
  }

  // 2. aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // 3. Native labels (input, textarea, select)
  const tagName = element.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName)) {
    // Label tag wrapper
    const labelParent = element.closest('label');
    if (labelParent) return getAccessibleName(labelParent);
    
    // Label for
    if (element.id) {
      const root = element.getRootNode();
      // Tìm label for trong cùng root
      const labelFor = root.querySelector ? root.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null;
      if (labelFor) return getAccessibleName(labelFor);
    }
    
    if (element.getAttribute('placeholder')) return element.getAttribute('placeholder');
    if (element.getAttribute('title')) return element.getAttribute('title');
    if (element.getAttribute('alt')) return element.getAttribute('alt');
    if (element.value) return element.value;
  }

  // 4. Recursive Text Content (Dành cho button, link, heading...)
  // Logic: Nối text của tất cả con cái lại
  let text = '';
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (isVisible(child)) {
        // Ảnh có alt
        if (child.tagName === 'IMG' && child.getAttribute('alt')) {
          text += child.getAttribute('alt');
        } else {
          text += getAccessibleName(child);
        }
      }
    }
  }
  
  return normalizeWhiteSpace(text);
}

/**
 * Xác định ARIA Role (Bao gồm Implicit Roles)
 */
export function getElementRole(element) {
  // 1. Explicit Role
  const explicitRole = element.getAttribute('role');
  if (explicitRole) return explicitRole;

  // 2. Implicit Role dựa trên Tag và Attribute
  const tag = element.tagName.toLowerCase();
  const type = element.getAttribute('type')?.toLowerCase();

  switch (tag) {
    case 'button': return 'button';
    case 'a': return element.hasAttribute('href') ? 'link' : null;
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    case 'img': return (element.getAttribute('alt') === '') ? 'presentation' : 'img';
    case 'input': {
      if (['button', 'image', 'reset', 'submit'].includes(type)) return 'button';
      if (['checkbox'].includes(type)) return 'checkbox';
      if (['radio'].includes(type)) return 'radio';
      if (['number'].includes(type)) return 'spinbutton';
      if (['search'].includes(type)) return 'searchbox';
      // Default inputs
      if (!type || ['text', 'email', 'tel', 'url'].includes(type)) return 'textbox';
      return null;
    }
    case 'textarea': return 'textbox';
    case 'select': return 'combobox'; // Hoặc listbox tùy size
    case 'li': return 'listitem';
    case 'ul': case 'ol': return 'list';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'article': return 'article';
    case 'aside': return 'complementary';
    case 'form': return 'form';
    case 'table': return 'table';
    case 'dialog': return 'dialog';
    default: return null;
  }
}

export function retargetElement(el) {
    if (!el) return null;
    // Đơn giản hóa logic retarget để tập trung vào interactive elements
    if (el.closest) {
        return el.closest('button, a, [role="button"], input, select, textarea') || el;
    }
    return el;
}