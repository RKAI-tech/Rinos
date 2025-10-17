/**
 * Selector generation utilities following Playwright's approach
 * Các tiện ích tạo selector theo cách tiếp cận của Playwright
 */

import { 
  TEST_ID_ATTRIBUTES, 
  SEMANTIC_ATTRIBUTES, 
  FORM_ATTRIBUTES, 
  EPHEMERAL_CLASS_PATTERNS,
  SELECTOR_SCORES,
  MAX_CSS_PATH_DEPTH,
  MAX_CLASS_COMBINATION
} from '../core/constants.js';
import { escapeSelector, isMeaningfulValue } from '../utils/stringUtils.js';
import { getAccessibleName, getElementRole, retargetElement } from '../dom/domUtils.js';

/**
 * Generate CSS selectors for element following Playwright's sophisticated approach
 * Tạo danh sách CSS selector cho element theo cách tiếp cận phức tạp của Playwright
 * @param {Element} element - Element to generate selectors for
 * @param {Object} options - Options for selector generation
 * @param {number} options.maxSelectors - Maximum number of selectors to return (default: 5)
 * @param {number} options.minScore - Minimum score threshold for selectors (default: 300)
 * @param {number} options.parentDepth - Current recursion depth when walking to parents (default: 0)
 * @param {number} options.maxParentDepth - Max recursion depth when walking to parents (default: 3)
 * @returns {Array} Array of selector strings
 */
export function generateSelector(element, options = {}) {
  const { maxSelectors = 5, minScore = 100, parentDepth = 0, maxParentDepth = 3 } = options;
  
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return [];
  
  // Retarget element following Playwright's approach for better selector generation
  const originalElement = element;
  element = retargetElement(element, 'follow-label') || element;

  // If target is a label, try to retarget to its associated control
  try {
    if (element && element.tagName === 'LABEL') {
      const control = element.control || element.querySelector('input,select,textarea,button');
      if (control) {
        element = control;
      }
    }
  } catch {}

  const doc = element.ownerDocument || document;
  const tag = element.tagName.toLowerCase();
  
  // Scoring system for selectors (higher score = better selector)
  const selectorCandidates = [];
  
  // Helper function to build absolute XPath from root to element (always from root, no ID shortcuts)
  function buildAbsoluteXPath(el) {
    try {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
      const doc = el.ownerDocument || document;

      // Helper: convert string to a safe XPath literal
      const toXPathLiteral = (s) => {
        if (s.indexOf('"') === -1) return `"${s}"`;
        if (s.indexOf("'") === -1) return `'${s}'`;
        return 'concat(' + s.split('"').map((part, i) => (i > 0 ? ',""",' : '') + `'${part}'`).join('') + ')';
      };

      // Always build absolute path from root using tag and :nth-of-type-like indexing
      const segments = [];
      let node = el;
      while (node && node.nodeType === Node.ELEMENT_NODE && node !== doc.documentElement) {
        const tag = node.tagName.toLowerCase();
        const parent = node.parentElement;
        let index = 1;
        if (parent) {
          const sameTagSiblings = Array.from(parent.children).filter(n => n.tagName === node.tagName);
          if (sameTagSiblings.length > 1) {
            index = sameTagSiblings.indexOf(node) + 1;
          }
        }
        segments.unshift(index > 1 ? `${tag}[${index}]` : tag);
        node = parent;
      }
      // Always start from /html root
      const path = ['/html', ...segments].join('/');
      return path;
    } catch {
      return '';
    }
  }
  
  // Helper function to add selector candidates (generate all possible selectors)
  function addCandidate(selector, score, type) {
    try {
      const matches = doc.querySelectorAll(selector);
      // Add all valid selectors, let validation filter for uniqueness later
      if (matches.length > 0) {
        selectorCandidates.push({ 
          selector, 
          score, 
          type,
          elementCount: matches.length,
          isUnique: matches.length === 1 && matches[0] === element
        });
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }
  
  // Helper function to get semantic attributes
  function getSemanticAttributes(el) {
    const semanticAttrs = [];
    
    for (const attr of SEMANTIC_ATTRIBUTES) {
      const value = el.getAttribute(attr);
      if (isMeaningfulValue(value)) {
        semanticAttrs.push({ attr, value: value.trim() });
      }
    }
    
    return semanticAttrs;
  }
  
  // Helper function to get element text content
  function getElementText(el) {
    const text = el.textContent?.trim() || '';
    return text.replace(/\s+/g, ' ').trim();
  }
  
  // 0. SPECIAL: Label wrap/for linkage for form controls
  // Case A: input inside a label wrapper → labelClass input[type="..."]
  try {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
      const labelWrapper = element.closest('label');
      if (labelWrapper) {
        // Use label class if exists and not ephemeral
        if (labelWrapper.classList && labelWrapper.classList.length) {
          const classes = [...labelWrapper.classList].filter(c => c && !EPHEMERAL_CLASS_PATTERNS.some(p => c.startsWith(p) || (p === '__' && /^__.+__/.test(c))));
          if (classes.length) {
            const classSel = classes.map(c => `.${escapeSelector(c)}`).join('');
            const type = element.getAttribute('type');
            if (type) {
              addCandidate(`${classSel} input[type="${escapeSelector(type)}"]`, SELECTOR_SCORES.LABEL_WRAP, 'label-wrap');
            }
            addCandidate(`${classSel} input`, SELECTOR_SCORES.LABEL_WRAP - 10, 'label-wrap');
          }
        }
      }
      // Case B: label[for] linking to input#id
      const id = element.getAttribute('id');
      if (id) {
        const labelByFor = doc.querySelector(`label[for="${escapeSelector(id)}"]`);
        if (labelByFor) {
          addCandidate(`label[for="${escapeSelector(id)}"] + input#${escapeSelector(id)}`, SELECTOR_SCORES.LABEL_WRAP, 'label-for-adjacent');
          addCandidate(`input#${escapeSelector(id)}`, SELECTOR_SCORES.ID - 10, 'id-direct');
        }
      }
    }
  } catch {}
  
  // 1. Test ID attributes (highest priority - score 1000)
  for (const attr of TEST_ID_ATTRIBUTES) {
    if (element.hasAttribute(attr)) {
      const val = element.getAttribute(attr);
      if (val && val.trim()) {
        const escapedVal = escapeSelector(val);
        addCandidate(`[${attr}="${escapedVal}"]`, SELECTOR_SCORES.TEST_ID, 'test-id');
      }
    }
  }

  // 2. Unique ID (score 900)
  if (element.id && element.id.trim()) {
    const escapedId = escapeSelector(element.id);
    addCandidate(`#${escapedId}`, SELECTOR_SCORES.ID, 'id');
    
    // Also add ID-based XPath selector
    try {
      const doc = element.ownerDocument || document;
      const esc = (window.CSS && CSS.escape) ? CSS.escape(element.id) : element.id;
      const q = doc.querySelectorAll(`#${esc}`);
      if (q.length === 1 && q[0] === element) {
        // Helper: convert string to a safe XPath literal
        const toXPathLiteral = (s) => {
          if (s.indexOf('"') === -1) return `"${s}"`;
          if (s.indexOf("'") === -1) return `'${s}'`;
          return 'concat(' + s.split('"').map((part, i) => (i > 0 ? ',""",' : '') + `'${part}'`).join('') + ')';
        };
        const idXPath = `//*[@id=${toXPathLiteral(element.id)}]`;
        selectorCandidates.push({ selector: `xpath=${idXPath}`, score: SELECTOR_SCORES.ID - 10, type: 'id-xpath' });
      }
    } catch {}
  }

  // 3. Role + Accessible Name (score 850) - Playwright's preferred approach
  const role = getElementRole(element);
  if (role) {
    const name = getAccessibleName(element);
    if (name && name.length > 0 && name.length < 100) {
      const escapedName = escapeSelector(name);
      addCandidate(`${role}[name="${escapedName}"]`, SELECTOR_SCORES.ROLE_NAME, 'role-name');
    }
  }

  // 4. Semantic attributes (score 800)
  const semanticAttrs = getSemanticAttributes(element);
  for (const { attr, value } of semanticAttrs) {
    const escapedValue = escapeSelector(value);
    addCandidate(`[${attr}="${escapedValue}"]`, SELECTOR_SCORES.SEMANTIC_ATTR, 'semantic-attr');
  }

  // 4b. Direct name/placeholder attributes (explicit per requirement)
  try {
    const nameAttr = element.getAttribute && element.getAttribute('name');
    if (isMeaningfulValue(nameAttr)) {
      const escaped = escapeSelector(nameAttr.trim());
      addCandidate(`[name="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 5, 'name');
      addCandidate(`${tag}[name="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR, 'tag-name');
    }
    const placeholderAttr = element.getAttribute && element.getAttribute('placeholder');
    if (isMeaningfulValue(placeholderAttr)) {
      const escaped = escapeSelector(placeholderAttr.trim());
      addCandidate(`[placeholder="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 5, 'placeholder');
      addCandidate(`${tag}[placeholder="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR, 'tag-placeholder');
    }
  } catch {}

  // 4c. Additional accessibility and data attributes
  try {
    // aria-label attribute
    const ariaLabel = element.getAttribute && element.getAttribute('aria-label');
    if (isMeaningfulValue(ariaLabel)) {
      const escaped = escapeSelector(ariaLabel.trim());
      addCandidate(`[aria-label="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 10, 'aria-label');
      addCandidate(`${tag}[aria-label="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 5, 'tag-aria-label');
    }

    // title attribute
    const titleAttr = element.getAttribute && element.getAttribute('title');
    if (isMeaningfulValue(titleAttr)) {
      const escaped = escapeSelector(titleAttr.trim());
      addCandidate(`[title="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 15, 'title');
      addCandidate(`${tag}[title="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 10, 'tag-title');
    }

    // data-* attributes
    const dataAttrs = [];
    if (element.attributes) {
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-') && isMeaningfulValue(attr.value)) {
          dataAttrs.push({ name: attr.name, value: attr.value.trim() });
        }
      }
    }
    for (const { name, value } of dataAttrs) {
      const escaped = escapeSelector(value);
      addCandidate(`[${name}="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 20, 'data-attr');
      addCandidate(`${tag}[${name}="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 15, 'tag-data-attr');
    }

    // alt attribute for images
    const altAttr = element.getAttribute && element.getAttribute('alt');
    if (isMeaningfulValue(altAttr)) {
      const escaped = escapeSelector(altAttr.trim());
      addCandidate(`[alt="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 10, 'alt');
      addCandidate(`${tag}[alt="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 5, 'tag-alt');
    }

    // src attribute for images/scripts
    const srcAttr = element.getAttribute && element.getAttribute('src');
    if (isMeaningfulValue(srcAttr)) {
      const escaped = escapeSelector(srcAttr.trim());
      addCandidate(`[src="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 25, 'src');
      addCandidate(`${tag}[src="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 20, 'tag-src');
    }

    // href attribute for links
    const hrefAttr = element.getAttribute && element.getAttribute('href');
    if (isMeaningfulValue(hrefAttr)) {
      const escaped = escapeSelector(hrefAttr.trim());
      addCandidate(`[href="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 10, 'href');
      addCandidate(`${tag}[href="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 5, 'tag-href');
    }

    // value attribute for inputs
    const valueAttr = element.getAttribute && element.getAttribute('value');
    if (isMeaningfulValue(valueAttr)) {
      const escaped = escapeSelector(valueAttr.trim());
      addCandidate(`[value="${escaped}"]`, SELECTOR_SCORES.SEMANTIC_ATTR - 15, 'value');
      addCandidate(`${tag}[value="${escaped}"]`, SELECTOR_SCORES.TAG_ATTR - 10, 'tag-value');
    }
  } catch {}

  // 5. Text-based selector (use XPath for HTML compatibility)
  try {
    const elementText = getElementText(element);
    // Use reasonable-length, meaningful text snippets
    if (isMeaningfulValue(elementText) && elementText.length <= 100) {
      // Convert text to a safe XPath literal
      const toXPathLiteral = (s) => {
        if (s.indexOf('"') === -1) return `"${s}"`;
        if (s.indexOf("'") === -1) return `'${s}'`;
        return 'concat(' + s.split('"').map((part, i) => (i > 0 ? ',""",' : '') + `'${part}'`).join('') + ')';
      };
      const textLiteral = toXPathLiteral(elementText);
      // Exact text match using normalize-space
      selectorCandidates.push({ selector: `xpath=//*[normalize-space(.)=${textLiteral}]`, score: 810, type: 'text-xpath' });
      selectorCandidates.push({ selector: `xpath=//${tag}[normalize-space(.)=${textLiteral}]`, score: 805, type: 'text-xpath' });
      // Contains text variant (slightly lower score)
      selectorCandidates.push({ selector: `xpath=//*[contains(normalize-space(.), ${textLiteral})]`, score: 790, type: 'text-xpath-contains' });
      selectorCandidates.push({ selector: `xpath=//${tag}[contains(normalize-space(.), ${textLiteral})]`, score: 785, type: 'text-xpath-contains' });
    }
  } catch {}

  // 6. Unique class combinations (score 700)
  if (element.classList.length) {
    for (const className of element.classList) {
      const isEphemeral = EPHEMERAL_CLASS_PATTERNS.some(pattern => 
        className.startsWith(pattern) || (pattern === '__' && /^__.+__/.test(className))
      );
      if (className.trim() && !isEphemeral) {
        const escapedClass = escapeSelector(className);
        addCandidate(`.${escapedClass}`, SELECTOR_SCORES.SINGLE_CLASS, 'single-class');
      }
    }
    const classArray = [...element.classList].filter(c => {
      const ephemeral = EPHEMERAL_CLASS_PATTERNS.some(pattern => 
        c.startsWith(pattern) || (pattern === '__' && /^__.+__/.test(c))
      );
      return c.trim() && !ephemeral;
    });
    if (classArray.length > 1) {
      for (let i = 2; i <= Math.min(MAX_CLASS_COMBINATION, classArray.length); i++) {
        const classCombination = classArray.slice(0, i).map(c => `.${escapeSelector(c)}`).join('');
        addCandidate(classCombination, SELECTOR_SCORES.MULTI_CLASS - (i * 10), 'multi-class');
      }
    }
  }

  // 7. Tag + attributes combination (score 600)
  for (const attr of FORM_ATTRIBUTES) {
    const value = element.getAttribute(attr);
    if (isMeaningfulValue(value)) {
      const escapedValue = escapeSelector(value);
      addCandidate(`${tag}[${attr}="${escapedValue}"]`, SELECTOR_SCORES.TAG_ATTR, 'tag-attr');
    }
  }

  // 8. Position-based selector with parent context (score 500)
  const parent = element.parentElement;
  if (parent && parent !== doc.documentElement && parentDepth < maxParentDepth) {
    const parentSelectors = generateSelector(parent, { maxSelectors: 1, minScore: 400, parentDepth: parentDepth + 1, maxParentDepth });
    if (parentSelectors.length > 0) {
      const parentSelector = parentSelectors[0];
      const sameTagSiblings = [...parent.children].filter(e => e.tagName === element.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(element) + 1;
        addCandidate(`${parentSelector} > ${tag}:nth-of-type(${index})`, SELECTOR_SCORES.POSITION, 'position');
      } else {
        addCandidate(`${parentSelector} > ${tag}`, SELECTOR_SCORES.POSITION, 'parent-child');
      }
    }
  }

  // 9. CSS path with nth-of-type (score 400)
  const parts = [];
  let current = element;
  let depth = 0;
  
  while (current && current.nodeType === Node.ELEMENT_NODE && 
         current !== doc.documentElement && depth < MAX_CSS_PATH_DEPTH) {
    let part = current.tagName.toLowerCase();

    const parent = current.parentElement;
    if (parent) {
      const sameTagSiblings = [...parent.children].filter(e => e.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    
    const trial = parts.join(' > ');
    try {
      const matches = doc.querySelectorAll(trial);
      if (matches.length === 1 && matches[0] === element) {
        addCandidate(trial, SELECTOR_SCORES.CSS_PATH - (depth * 20), 'css-path');
        break;
      }
    } catch (e) {}
    
    current = current.parentElement;
    depth++;
  }

  // 10. Fallback: Simple tag with nth-of-type (score 300)
  const sameTagSiblings = parent ? [...parent.children].filter(e => e.tagName === element.tagName) : [];
  if (sameTagSiblings.length > 1) {
    const index = sameTagSiblings.indexOf(element) + 1;
    addCandidate(`${tag}:nth-of-type(${index})`, SELECTOR_SCORES.FALLBACK, 'fallback');
  } else {
    addCandidate(tag, SELECTOR_SCORES.FALLBACK, 'fallback');
  }

  // Add absolute XPath from root (always from /html, no shortcuts) with higher score to ensure it passes minScore filter
  const absoluteXPath = buildAbsoluteXPath(element);
  if (absoluteXPath) {
    selectorCandidates.push({ selector: `xpath=${absoluteXPath}`, score: 200, type: 'absolute-xpath' });
  }

  selectorCandidates.sort((a, b) => b.score - a.score);
  
  // Return all generated selectors, let validation filter for uniqueness
  const selectors = selectorCandidates.map(candidate => candidate.selector);

  if (selectors.length > 0) {
    return selectors;
  }

  // Fallback strategy: always return at least one selector
  // 1) If we have any candidate (even below minScore), return the best one
  if (selectorCandidates.length > 0) {
    return [selectorCandidates[0].selector];
  }

  // 2) Absolute nth-child path from document root as a last resort (may not be unique, but always resolvable)
  try {
    const absolutePath = (() => {
      const parts = [];
      let current = element;
      const doc = element.ownerDocument || document;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== doc.documentElement) {
        let part = current.tagName.toLowerCase();
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(e => e.tagName === current.tagName);
          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
        }
        parts.unshift(part);
        current = current.parentElement;
      }
      return parts.join(' > ') || element.tagName.toLowerCase();
    })();
    return [absolutePath];
  } catch {
    // 3) Final emergency fallback: the tag name
    return [element.tagName ? element.tagName.toLowerCase() : '*'];
  }
}

/**
 * Validate and improve selectors
 * Kiểm tra và cải thiện danh sách selector
 * @param {Array} selectors - Array of selector strings to validate
 * @param {Element} element - Target element
 * @param {Object} options - Validation options
 * @returns {Array} Array of improved selector strings
 */
export function validateAndImproveSelector(selectors, element, options = {}) {
  const { maxImprovements = 10 } = options;
  
  if (!Array.isArray(selectors) || selectors.length === 0) return [];
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return selectors;
  
  const doc = element.ownerDocument || document;
  const improvedSelectors = [];
  
  function validateSingleSelector(selector) {
    try {
      // Check if it's XPath (starts with xpath= or /)
      if (selector.startsWith('xpath=') || selector.startsWith('/')) {
        // Handle XPath selector
        const xpathExpr = selector.replace(/^xpath=/, '');
        const result = doc.evaluate(xpathExpr, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const count = result.snapshotLength;
        
        // Only accept if exactly 1 element and it's our target element
        if (count === 1 && result.snapshotItem(0) === element) {
          return { selector, isValid: true, elementCount: count, isUnique: true };
        }
        return { selector, isValid: false, elementCount: count, isUnique: false };
      } else {
        // Handle CSS selector
        const matches = doc.querySelectorAll(selector);
        const count = matches.length;
        
        // Only accept if exactly 1 element and it's our target element
        if (count === 1 && matches[0] === element) {
          return { selector, isValid: true, elementCount: count, isUnique: true };
        }
        return { selector, isValid: false, elementCount: count, isUnique: false };
      }
    } catch (e) {
      return { selector, isValid: false, elementCount: 0, isUnique: false, error: e.message };
    }
  }
  
  function generateImprovedSelectors(originalSelector) {
    const tag = element.tagName.toLowerCase();
    const improvements = [];
    
    // Helper function to check if selector is unique and targets our element
    function isUniqueSelector(selector) {
      try {
        const matches = doc.querySelectorAll(selector);
        return matches.length === 1 && matches[0] === element;
      } catch (e) {
        return false;
      }
    }
    
    if (element.type) {
      const typeSelector = `${tag}[type="${element.type}"]`;
      if (isUniqueSelector(typeSelector)) {
        improvements.push(typeSelector);
      }
    }
    if (element.name) {
      const nameSelector = `${tag}[name="${element.name}"]`;
      if (isUniqueSelector(nameSelector)) {
        improvements.push(nameSelector);
      }
    }
    if (element.placeholder) {
      const placeholderSelector = `${tag}[placeholder="${element.placeholder}"]`;
      if (isUniqueSelector(placeholderSelector)) {
        improvements.push(placeholderSelector);
      }
    }
    if (element.value && element.tagName.toLowerCase() === 'input') {
      const valueSelector = `${tag}[value="${element.value}"]`;
      if (isUniqueSelector(valueSelector)) {
        improvements.push(valueSelector);
      }
    }
    return improvements;
  }
  
  // Separate XPath selectors from CSS selectors for priority handling
  const xpathSelectors = [];
  const cssSelectors = [];
  
  for (const selector of selectors) {
    if (selector.startsWith('xpath=') || selector.startsWith('/')) {
      xpathSelectors.push(selector);
    } else {
      cssSelectors.push(selector);
    }
  }
  
  // Validate XPath selectors first (higher priority for uniqueness)
  for (const selector of xpathSelectors) {
    const validatedSelector = validateSingleSelector(selector);
    if (validatedSelector.isValid && validatedSelector.isUnique) {
      improvedSelectors.push(selector);
    }
  }
  
  // Validate CSS selectors
  for (const selector of cssSelectors) {
    const validatedSelector = validateSingleSelector(selector);
    if (validatedSelector.isValid && validatedSelector.isUnique) {
      improvedSelectors.push(selector);
    } else {
      // Try to generate improved selectors only for CSS selectors
      const improvements = generateImprovedSelectors(selector);
      for (const improvement of improvements.slice(0, maxImprovements)) {
        const validatedImprovement = validateSingleSelector(improvement);
        if (validatedImprovement.isValid && validatedImprovement.isUnique) {
          improvedSelectors.push(improvement);
        }
      }
    }
  }
  
  return improvedSelectors;
}

/**
 * Generate and validate selectors in one call
 * Tạo và kiểm tra selector trong một lần gọi
 */
export function generateAndValidateSelectors(element, options = {}) {
  const { 
    maxSelectors = 5, 
    minScore = 100, // Lower threshold to get more selectors initially
    validate = true,
    // If true, convert final selectors to XPath form (prefixed with 'xpath=')
    returnXPath = false
  } = options;
  
  const allSelectors = generateSelector(element, { maxSelectors: 50, minScore: 0 }); // Generate all selectors
  console.log('[generateAndValidateSelectors] All generated selectors:', allSelectors);
  
  let finalSelectors = (!validate) ? allSelectors : validateAndImproveSelector(allSelectors, element);
  
  // Apply minScore filter after validation (if validate is false, we need to filter by score)
  if (!validate) {
    // For now, just limit to maxSelectors since we don't have score info after generateSelector
    finalSelectors = finalSelectors.slice(0, maxSelectors);
  }
  
  try {
    const seen = new Set();
    finalSelectors = finalSelectors.filter(s => {
      if (!s || typeof s !== 'string') return false;
      if (seen.has(s)) return false;
      seen.add(s);
      return true;
    });
  } catch {}


  // If no selectors, return fallback
  if (!finalSelectors || finalSelectors.length === 0) {
    const fallback = ['*'];
    return returnXPath ? fallback.map(s => s.startsWith('xpath=') ? s : `xpath=${s}`) : fallback;
  }

  // XPath has already been added before validation, no need to add again

  // Limit to maxSelectors at the end, ensuring XPath (if any) is the last element
  if (finalSelectors.length > maxSelectors) {
    finalSelectors = finalSelectors.slice(0, maxSelectors);
  }
  // Helper: limited CSS → XPath converter for common patterns
  function cssToXPathLimited(sel) {
    try {
      if (!sel || typeof sel !== 'string') return sel;
      if (sel.startsWith('xpath=')) return sel; // already XPath
      // Split by descendant ' ' and child '>' combinators, preserving relation
      const tokens = [];
      let buf = '';
      let last = 'desc';
      for (let i = 0; i < sel.length; i++) {
        const ch = sel[i];
        if (ch === '>') {
          if (buf.trim()) tokens.push({ type: last, value: buf.trim() });
          buf = '';
          last = 'child';
        } else if (ch === ' ') {
          if (buf.trim()) {
            tokens.push({ type: last, value: buf.trim() });
            buf = '';
          }
          last = 'desc';
        } else {
          buf += ch;
        }
      }
      if (buf.trim()) tokens.push({ type: last, value: buf.trim() });

      const stepFromSimple = (simple) => {
        // Support: tag, #id, .class, tag.class1.class2, [attr="val"], :nth-of-type(n)
        let tag = '*';
        let rest = simple;
        const mTag = rest.match(/^([a-zA-Z][a-zA-Z0-9_-]*)/);
        if (mTag) {
          tag = mTag[1].toLowerCase();
          rest = rest.slice(mTag[0].length);
        }
        let xpath = `//${tag}`; // axis will be replaced by relation
        const predicates = [];
        // id
        const idMatch = rest.match(/#([a-zA-Z0-9_\-:]+)/);
        if (idMatch) {
          predicates.push(`@id='${idMatch[1]}'`);
          rest = rest.replace(idMatch[0], '');
        }
        // classes
        const classRegex = /\.([a-zA-Z0-9_\-:]+)/g;
        let c;
        while ((c = classRegex.exec(rest)) !== null) {
          const cls = c[1];
          predicates.push(`contains(concat(' ', normalize-space(@class), ' '), ' ${cls} ')`);
        }
        rest = rest.replace(/\.[a-zA-Z0-9_\-:]+/g, '');
        // attributes [attr="value"]
        const attrRegex = /\[([a-zA-Z0-9_\-:]+)=("([^"]*)"|'([^']*)')\]/g;
        let a;
        while ((a = attrRegex.exec(rest)) !== null) {
          const attr = a[1];
          const val = a[3] !== undefined ? a[3] : a[4] || '';
          predicates.push(`@${attr}='${val.replace(/'/g, "'\"\"'")}'`);
        }
        rest = rest.replace(/\[[^\]]+\]/g, '');
        // :nth-of-type(n)
        const nth = rest.match(/:nth-of-type\((\d+)\)/);
        if (nth) {
          predicates.push(`position()=${nth[1]}`);
          rest = rest.replace(nth[0], '');
        }
        if (predicates.length) xpath += '[' + predicates.join(' and ') + ']';
        return xpath;
      };

      // Build XPath using relations
      let xpath = '';
      tokens.forEach((t, idx) => {
        let step = stepFromSimple(t.value);
        // adjust axis: '//' for desc, '/' for child
        if (idx === 0) {
          step = step.replace(/^\/\//, t.type === 'child' ? '/' : '//');
        } else {
          step = step.replace(/^\/\//, t.type === 'child' ? '/' : '//');
        }
        xpath += step;
      });
      if (!xpath) xpath = '//*';
      return `xpath=${xpath}`;
    } catch {
      return sel;
    }
  }

  const output = returnXPath
    ? finalSelectors.map(s => (s.startsWith('xpath=') ? s : cssToXPathLimited(s)))
    : finalSelectors;
  return output;
}
