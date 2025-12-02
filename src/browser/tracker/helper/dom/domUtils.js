/**
 * DOM utility functions
 * Utility functions for working with DOM
 */

import { normalizeWhiteSpace, trimStringWithEllipsis, oneLine } from '../utils/stringUtils.js';

// Re-export string utilities for convenience
export { normalizeWhiteSpace, trimStringWithEllipsis, oneLine };

/**
 * Preview DOM node for debugging
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
 */
export function extractElementText(el) {
  if (!el) return "";

  // 1. Accessible name (highest priority)
  const name = getAccessibleName(el);
  if (name?.trim()) {
    return cleanText(name);
  }

  // 2. aria-label (Explicit label)
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel?.trim()) {
    return cleanText(ariaLabel);
  }

  // 3. input / textarea value (value attribute)
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value?.trim()) return cleanText(el.value);
    if (el.placeholder?.trim()) return cleanText(el.placeholder);
  }

  // 4. img alt text (alt attribute)
  if (el instanceof HTMLImageElement) {
    if (el.alt?.trim()) return cleanText(el.alt);
  }

  // 5. textContent (already trimmed)
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

export function queryShadowAll(selector, root = document) {
  const results = [];
  try {
    const matches = root.querySelectorAll(selector);
    matches.forEach(m => results.push(m));
  } catch (e) { }
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
 * NEW: Only get text from Explicit Label (Label tag, aria-label)
 * Used for strategy: getByLabel
 */
export function getExplicitLabelText(element) {
  if (!element) return null;

  // 1. aria-label (Explicit label)
  if (element.hasAttribute('aria-label')) {
    return element.getAttribute('aria-label').trim();
  }

  // 2. aria-labelledby (Linked label)
  if (element.hasAttribute('aria-labelledby')) {
    const id = element.getAttribute('aria-labelledby');
    const labelEl = document.getElementById(id); // Note: scope ID
    if (labelEl) return labelEl.textContent.trim();
  }

  // 3. Native Label (Only for form controls like input, textarea, select)
  const tagName = element.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName)) {
    // 3a. Label wrapping (Wrapping label)
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Only get the text of the label, remove the text of the input if it exists
      const clone = parentLabel.cloneNode(true);
      const inputInClone = clone.querySelector(tagName);
      if (inputInClone) inputInClone.remove();
      return normalizeWhiteSpace(clone.textContent);
    }

    // 3b. Label for (Linked label)
    if (element.id) {
      const root = element.getRootNode();
      // Find in the same root (document or shadow root)
      const labelFor = root.querySelector ? root.querySelector(`label[for="${CSS.escape(element.id)}"]`) : null;
      if (labelFor) return normalizeWhiteSpace(labelFor.textContent);
    }
  }

  return null; // No fallback to placeholder or title
}

/**
 * Accessible Name (For getByRole)
 */
export function getAccessibleName(element) {
  // Prioritize Explicit Label first
  const explicit = getExplicitLabelText(element);
  if (explicit) return explicit;

  // Fallback according to the priority of ARIA
  // 1. Placeholder (only for input)
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();
  }

  // 2. Title
  const title = element.getAttribute('title');
  if (title && title.trim()) return title.trim();

  // 3. Alt (for img/input image)
  const alt = element.getAttribute('alt');
  if (alt && alt.trim()) return alt.trim();

  // 4. Value (for button input)
  if (element.tagName === 'INPUT' && ['submit', 'reset', 'button'].includes(element.type)) {
    return element.value;
  }

  // 5. Text Content (Recursive)
  // ... (Keep the recursive text logic if you have it, or use the simple one below)
  if (!['INPUT', 'SELECT', 'TEXTAREA', 'IMG'].includes(element.tagName)) {
    return normalizeWhiteSpace(element.textContent);
  }

  return '';
}

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