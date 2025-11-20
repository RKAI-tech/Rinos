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


/**
 * Get accessible name following ARIA standards
 * Lấy tên accessible theo chuẩn ARIA
 */
export function getAccessibleName(element) {
  // Try aria-label first
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }
  
  // Try aria-labelledby
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElement = document.getElementById(ariaLabelledBy);
    if (labelElement) {
      const labelText = labelElement.textContent?.trim();
      if (labelText) {
        return labelText;
      }
    }
  }
  
  // Try title attribute
  const title = element.getAttribute('title');
  if (title && title.trim()) {
    return title.trim();
  }
  
  // Try alt attribute for images
  if (element.tagName === 'IMG') {
    const alt = element.getAttribute('alt');
    if (alt && alt.trim()) {
      return alt.trim();
    }
  }
  
  // Try placeholder for input fields
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      return placeholder.trim();
    }
  }
  
  // Try name attribute
  const name = element.getAttribute('name');
  if (name && name.trim()) {
    return name.trim();
  }
  
  // Try value attribute for buttons and inputs
  const value = element.getAttribute('value');
  if (value && value.trim()) {
    return value.trim();
  }
  
  return '';
}

/**
 * Get element role for accessibility
 * Lấy role của element cho accessibility
 */
export function getElementRole(element) {
  // Check explicit role attribute
  const role = element.getAttribute('role');
  if (role) return role;
  
  // Infer role from tag name
  const tag = element.tagName.toLowerCase();
  const roleMap = {
    'button': 'button',
    'input': element.type === 'button' || element.type === 'submit' || element.type === 'reset' ? 'button' : 'textbox',
    'a': 'link',
    'img': 'img',
    'nav': 'navigation',
    'main': 'main',
    'header': 'banner',
    'footer': 'contentinfo',
    'aside': 'complementary',
    'section': 'region',
    'article': 'article',
    'form': 'form',
    'table': 'table',
    'ul': 'list',
    'ol': 'list',
    'li': 'listitem',
    'h1': 'heading',
    'h2': 'heading',
    'h3': 'heading',
    'h4': 'heading',
    'h5': 'heading',
    'h6': 'heading'
  };
  
  return roleMap[tag] || null;
}

/**
 * Retarget element following Playwright's approach
 * Retarget element theo cách tiếp cận của Playwright
 */
export function retargetElement(el, behavior = 'none') {
  if (!el) return null;
  
  let element = el;
  
  if (behavior === 'none') return element;
  
  // If not an interactive element, find the closest interactive parent
  if (!element.matches('input, textarea, select') && !element.isContentEditable) {
    if (behavior === 'button-link') {
      element = element.closest('button, [role=button], a, [role=link]') || element;
    } else {
      element = element.closest('button, [role=button], [role=checkbox], [role=radio]') || element;
    }
  }
  
  // Follow label if needed
  if (behavior === 'follow-label') {
    if (!element.matches('a, input, textarea, button, select, [role=link], [role=button], [role=checkbox], [role=radio]') &&
        !element.isContentEditable) {
      const enclosingLabel = element.closest('label');
      if (enclosingLabel && enclosingLabel.control) {
        element = enclosingLabel.control;
      }
    }
  }
  
  return element;
}
