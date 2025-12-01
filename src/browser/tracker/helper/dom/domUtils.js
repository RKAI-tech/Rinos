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
export function extractElementText(el) {
  if (!el) return "";

  // 1. Accessible name (ưu tiên cao nhất)
  const name = getAccessibleName(el);
  if (name?.trim()) {
    return cleanText(name);
  }

  // 2. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) {
    return cleanText(ariaLabel);
  }

  // 3. input / textarea value
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value?.trim()) return cleanText(el.value);
    if (el.placeholder?.trim()) return cleanText(el.placeholder);
  }

  // 4. img alt text
  if (el instanceof HTMLImageElement) {
    if (el.alt?.trim()) return cleanText(el.alt);
  }

  // 5. textContent (đã trim)
  const textContent = el.textContent?.trim();
  if (textContent) return cleanText(textContent);

  // 6. title attribute (tooltip)
  const title = el.getAttribute("title");
  if (title?.trim()) return cleanText(title);

  return "";
}

function cleanText(text) {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/['"]/g, "")
    .trim();
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

// ... (Giữ nguyên các hàm queryShadowAll và isVisible) ...
export function queryShadowAll(selector, root = document) {
  const results = [];
  try {
    const matches = root.querySelectorAll(selector);
    matches.forEach(m => results.push(m));
  } catch (e) {}
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.shadowRoot) {
      results.push(...queryShadowAll(selector, node.shadowRoot));
    }
  }
  return results;
}

export function isVisible(element) {
  if (!element) return false;
  if (element.getAttribute && element.getAttribute('aria-hidden') === 'true') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && window.getComputedStyle(element).visibility !== 'hidden';
}

/**
 * MỚI: Chỉ lấy text từ Label tường minh (Label tag, aria-label)
 * Dùng cho strategy: getByLabel
 */
export function getExplicitLabelText(element) {
  if (!element) return null;

  // 1. aria-label
  if (element.hasAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }

  // 2. aria-labelledby
  if (element.hasAttribute('aria-labelledby')) {
    const id = element.getAttribute('aria-labelledby');
    const labelEl = document.getElementById(id); // Lưu ý: scope ID
    if (labelEl) return labelEl.textContent.trim();
  }

  // 3. Native Label (Only for form controls)
  const tagName = element.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName)) {
    // 3a. Label bao bọc (Wrapping label)
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Chỉ lấy text của label, loại bỏ text của chính input nếu có
      const clone = parentLabel.cloneNode(true);
      const inputInClone = clone.querySelector(tagName);
      if (inputInClone) inputInClone.remove(); 
      return normalizeWhiteSpace(clone.textContent);
    }

    // 3b. Label for (Linked label)
    if (element.id) {
      const root = element.getRootNode();
      // Tìm trong cùng root (document hoặc shadow root)
      const labelFor = root.querySelector ? root.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null;
      if (labelFor) return normalizeWhiteSpace(labelFor.textContent);
    }
  }

  return null; // Không fallback sang placeholder hay title
}

/**
 * Accessible Name (Dùng cho getByRole)
 * Vẫn giữ logic fallback để tính toán tên cho Role
 */
export function getAccessibleName(element) {
  // Ưu tiên Explicit Label trước
  const explicit = getExplicitLabelText(element);
  if (explicit) return explicit;

  // Fallback theo thứ tự ưu tiên của ARIA
  // 1. Placeholder (chỉ cho input)
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();
  }

  // 2. Title
  const title = element.getAttribute('title');
  if (title && title.trim()) return title.trim();

  // 3. Alt (cho img/input image)
  const alt = element.getAttribute('alt');
  if (alt && alt.trim()) return alt.trim();

  // 4. Value (cho button input)
  if (element.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(element.type)) {
     return element.value;
  }

  // 5. Text Content (Recursive)
  // ... (Giữ nguyên logic recursive text cũ của bạn nếu có, hoặc dùng bản đơn giản dưới)
  if (!['INPUT', 'SELECT', 'TEXTAREA', 'IMG'].includes(element.tagName)) {
      return normalizeWhiteSpace(element.textContent);
  }

  return '';
}

// ... (Giữ nguyên getElementRole và retargetElement) ...
export function getElementRole(element) {
  const explicitRole = element.getAttribute('role');
  if (explicitRole) return explicitRole;
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
      if (!type || ['text', 'email', 'tel', 'url', 'password', 'search'].includes(type)) return 'textbox';
      return null;
    }
    case 'textarea': return 'textbox';
    case 'select': return 'combobox';
    default: return null;
  }
}

export function retargetElement(el) {
    if (!el) return null;
    if (el.closest) {
        return el.closest('button, a, [role="button"], input, select, textarea') || el;
    }
    return el;
}