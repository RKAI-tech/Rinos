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
  const { maxSelectors = 5, minScore = 300, parentDepth = 0, maxParentDepth = 3 } = options;
  
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
  
  // Helper function to check uniqueness and add to candidates
  function addCandidate(selector, score, type) {
    try {
      const matches = doc.querySelectorAll(selector);
      if (matches.length === 1 && matches[0] === element) {
        selectorCandidates.push({ selector, score, type });
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

  // 5. Text-based selector (Playwright engine supports :has-text("..."))
  try {
    const elementText = getElementText(element);
    // Use reasonable-length, meaningful text snippets
    if (isMeaningfulValue(elementText) && elementText.length <= 100) {
      const safeText = elementText.replace(/"/g, '\\"');
      // Push without DOM validation because :has-text is not a native CSS selector
      selectorCandidates.push({ selector: `:has-text("${safeText}")`, score: 810, type: 'text' });
      selectorCandidates.push({ selector: `${tag}:has-text("${safeText}")`, score: 805, type: 'text' });
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

  selectorCandidates.sort((a, b) => b.score - a.score);
  const filteredCandidates = selectorCandidates
    .filter(candidate => candidate.score >= minScore)
    .slice(0, maxSelectors);
  const selectors = filteredCandidates.map(candidate => candidate.selector);

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
  const { maxImprovements = 3 } = options;
  
  if (!Array.isArray(selectors) || selectors.length === 0) return [];
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return selectors;
  
  const doc = element.ownerDocument || document;
  const improvedSelectors = [];
  
  function validateSingleSelector(selector) {
    try {
      const matches = doc.querySelectorAll(selector);
      if (matches.length === 1 && matches[0] === element) {
        return { selector, isValid: true, elementCount: matches.length };
      }
      if (matches.length > 1) {
        return { selector, isValid: true, elementCount: matches.length };
      }
      return { selector, isValid: false, elementCount: 0 };
    } catch (e) {
      return { selector, isValid: false, elementCount: 0, error: e.message };
    }
  }
  
  function generateImprovedSelectors(originalSelector) {
    const tag = element.tagName.toLowerCase();
    const improvements = [];
    if (element.type) {
      const typeSelector = `${tag}[type="${element.type}"]`;
      try {
        const typeMatches = doc.querySelectorAll(typeSelector);
        if (typeMatches.length === 1 && typeMatches[0] === element) {
          improvements.push(typeSelector);
        }
      } catch (e) {}
    }
    if (element.name) {
      const nameSelector = `${tag}[name="${element.name}"]`;
      try {
        const nameMatches = doc.querySelectorAll(nameSelector);
        if (nameMatches.length === 1 && nameMatches[0] === element) {
          improvements.push(nameSelector);
        }
      } catch (e) {}
    }
    if (element.placeholder) {
      const placeholderSelector = `${tag}[placeholder="${element.placeholder}"]`;
      try {
        const placeholderMatches = doc.querySelectorAll(placeholderSelector);
        if (placeholderMatches.length === 1 && placeholderMatches[0] === element) {
          improvements.push(placeholderSelector);
        }
      } catch (e) {}
    }
    if (element.value && element.tagName.toLowerCase() === 'input') {
      const valueSelector = `${tag}[value="${element.value}"]`;
      try {
        const valueMatches = doc.querySelectorAll(valueSelector);
        if (valueMatches.length === 1 && valueMatches[0] === element) {
          improvements.push(valueSelector);
        }
      } catch (e) {}
    }
    return improvements;
  }
  
  for (const selector of selectors) {
    const validatedSelector = validateSingleSelector(selector);
    if (validatedSelector.isValid) {
      improvedSelectors.push(selector);
    } else {
      const improvements = generateImprovedSelectors(selector);
      improvedSelectors.push(...improvements.slice(0, maxImprovements));
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
    minScore = 300,
    validate = true
  } = options;
  const selectors = generateSelector(element, { maxSelectors, minScore });
  if (!validate || selectors.length === 0) {
    return selectors;
  }
  return validateAndImproveSelector(selectors, element);
}
