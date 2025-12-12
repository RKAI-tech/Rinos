import { TEST_ID_ATTRIBUTES } from '../core/constants.js';
import { escapeSelector } from '../utils/stringUtils.js';
import {
  getAccessibleName,
  getExplicitLabelText,
  getElementRole,
  queryShadowAll,
  isVisible
} from '../dom/domUtils.js';

// Constants for freezer-related classes (used when screen is frozen in assert mode)
const FREEZER_CLASS = 'rikkei-frozen-element';
const FREEZER_PREFIX = 'rikkei-'; // For future-proofing other rikkei-* classes

/**
 * Get element classes excluding freezer-related classes
 * Lấy classes của element loại bỏ các class liên quan đến freezer
 * This ensures selectors are generated based on original DOM structure,
 * not affected by the freeze mechanism during assert mode
 */
function getClassesWithoutFreezer(element) {
  if (!element.classList || element.classList.length === 0) {
    return [];
  }
  return [...element.classList].filter(c => 
    c !== FREEZER_CLASS && !c.startsWith(FREEZER_PREFIX)
  );
}

export function generateAndValidateSelectors(element, options = {}) {
  const iframeChain = getFrameChain(element);

  // Không ở trong iframe: giữ logic cũ nhưng truyền context root
  if (iframeChain.length === 0) {
    return generateSelectorsForElement(element, options.root || element.ownerDocument || document);
  }

  // Sinh selector cho từng iframe tổ tiên (outer -> inner) và validate unique theo document cha
  const frameSelectorsList = iframeChain.map(frameEl => {
    const parentDoc = frameEl.ownerDocument || document;
    const selectors = generateIframeSelectors(frameEl, parentDoc);
    return filterUniqueSelectors(selectors, frameEl, parentDoc);
  });

  // Sinh selector cho element trong context của iframe sâu nhất
  const elementSelectors = generateSelectorsForElement(
    element,
    element.ownerDocument || document
  );

  const combinedSelectors = [];
  const combineFrames = (idx, prefix) => {
    if (idx === frameSelectorsList.length) {
      for (const elSelector of elementSelectors) {
        const finalSelector = prefix ? `${prefix}.${elSelector}` : elSelector;
        combinedSelectors.push(finalSelector);
      }
      return;
    }
    for (const frameSel of frameSelectorsList[idx]) {
      const nextPrefix = prefix
        ? `${prefix}.frameLocator('${frameSel}')`
        : `frameLocator('${frameSel}')`;
      combineFrames(idx + 1, nextPrefix);
    }
  };

  combineFrames(0, '');

  // Loại trùng và escape backslash
  return [...new Set(combinedSelectors)].map(s => s.replace(/\\/g, '\\\\'));
}

function generateSelectorsForElement(element, root = document) {
  const candidates = generateCandidates(element);

  const uniqueSelectors = [];

  // Validate uniqueness trong phạm vi root
  for (const candidate of candidates) {
    if (isUnique(candidate, element, root)) {
      uniqueSelectors.push(candidateToCode(candidate));
    }
  }

  const chained = tryChaining(element, root);
  if (chained) uniqueSelectors.push(chained);

  uniqueSelectors.push(generateCssFallback(element, root));

  return uniqueSelectors.map(s => s.replace(/\\/g, '\\\\'));
}

// Lấy danh sách iframe tổ tiên từ outer -> inner
function getFrameChain(element) {
  const chain = [];
  let currentDoc = element?.ownerDocument;
  while (currentDoc?.defaultView && currentDoc.defaultView.frameElement) {
    const frameEl = currentDoc.defaultView.frameElement;
    chain.push(frameEl);
    currentDoc = frameEl.ownerDocument;
  }
  return chain.reverse();
}

// Sinh CSS selector cho iframe để dùng với frameLocator()
function generateIframeSelectors(iframeEl, root = document) {
  const selectors = [];
  const tag = iframeEl.tagName ? iframeEl.tagName.toLowerCase() : 'iframe';

  const addSelector = sel => {
    if (sel && !selectors.includes(sel)) selectors.push(sel);
  };

  for (const attr of TEST_ID_ATTRIBUTES) {
    const val = iframeEl.getAttribute && iframeEl.getAttribute(attr);
    if (val) addSelector(`[${attr}="${escapeSelector(val)}"]`);
  }

  const id = iframeEl.getAttribute && iframeEl.getAttribute('id');
  if (id) addSelector(`${tag}#${escapeSelector(id)}`);

  const nameAttr = iframeEl.getAttribute && iframeEl.getAttribute('name');
  if (nameAttr) addSelector(`${tag}[name="${escapeSelector(nameAttr)}"]`);

  const titleAttr = iframeEl.getAttribute && iframeEl.getAttribute('title');
  if (titleAttr) addSelector(`${tag}[title="${escapeSelector(titleAttr)}"]`);

  const cssFallback = generateCssFallback(iframeEl, root, { returnCssOnly: true });
  if (cssFallback) addSelector(cssFallback);

  return selectors;
}

// Giữ lại những selector CSS unique cho element trong phạm vi root
function filterUniqueSelectors(selectors, element, root = document) {
  const unique = [];
  for (const sel of selectors) {
    if (isUnique({ selector: sel }, element, root)) {
      unique.push(sel);
    }
  }
  // Nếu tất cả đều không unique, trả về selector gốc để vẫn có kết quả
  return unique.length > 0 ? unique : selectors;
}

function generateCandidates(element) {
  const candidates = [];
  const tag = element.tagName.toLowerCase();

  // 1. Get By Test ID 
  for (const attr of TEST_ID_ATTRIBUTES) {
    if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr);
      if (value) {
        candidates.push({
          type: 'testid',
          attr: attr,
          value: value,
          query: `[${attr}="${escapeSelector(value)}"]`
        });
      }
    }
  }

  // 2. Get By Placeholder
  if (['input', 'textarea'].includes(tag)) {
    const placeholder = element.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) {
      candidates.push({
        type: 'placeholder',
        text: placeholder.trim(),
        query: `${tag}[placeholder="${escapeSelector(placeholder.trim())}"]`
      });
    }
  }

  // 3. Get By Role (Role + Accessible Name)
  const role = getElementRole(element);
  const name = getAccessibleName(element);

  if (role) {
    if (name || ['button', 'checkbox', 'radio', 'link'].includes(role)) {
      candidates.push({
        type: 'role',
        role: role,
        name: name,
        queryRole: true
      });
    }
  }
  
  // 4. Get By Label
  if (['input', 'textarea', 'select'].includes(tag)) {
    const explicitLabel = getExplicitLabelText(element);
    if (explicitLabel) {
      candidates.push({
        type: 'label',
        text: explicitLabel,
        queryLabel: true
      });
    }
  }

  // 5. Get By Text
  if (!['input', 'select', 'textarea'].includes(tag) && isVisible(element)) {
    const ownText = element.textContent.trim();
    if (ownText && ownText.length < 50) {
      candidates.push({
        type: 'text',
        text: ownText,
        queryText: true
      });
    }
  }

  // 6. Attributes khác (Alt, Title)
  const alt = element.getAttribute('alt');
  const title = element.getAttribute('title');
  if (alt) candidates.push({ type: 'alt', text: alt, query: `[alt="${escapeSelector(alt)}"]` });
  if (title) candidates.push({ type: 'title', text: title, query: `[title="${escapeSelector(title)}"]` });

  // 7. Input Name / Type / Value 
  if (tag === 'input' && element.name) {
    candidates.push({ type: 'css', selector: `input[name="${escapeSelector(element.name)}"]`, query: `input[name="${escapeSelector(element.name)}"]` });
  }

  return candidates;
}

function isUnique(candidate, targetElement, root = document) {
  let matches = [];

  if (candidate.query) {
    matches = queryShadowAll(candidate.query, root);
  }
  else if (candidate.queryRole) {
    const allElements = queryShadowAll('*', root);
    matches = allElements.filter(el => {
      if (getElementRole(el) !== candidate.role) return false;
      if (candidate.name) {
        return getAccessibleName(el) === candidate.name;
      }
      return true;
    });
  }
  else if (candidate.queryText) {
    const allElements = queryShadowAll('*', root);
    matches = allElements.filter(el => {
      return el.textContent.includes(candidate.text) && isVisible(el);
    });
    // Prefer exact match
    const exactMatches = matches.filter(el => el.textContent.trim() === candidate.text);
    if (exactMatches.length > 0) matches = exactMatches;
  }
  else if (candidate.queryLabel) {
    // Find all input/textarea/select
    const inputs = queryShadowAll('input, textarea, select', root);
    // Filter to find the one with an explicit label that matches
    matches = inputs.filter(el => getExplicitLabelText(el) === candidate.text);
  }
  else if (candidate.selector) {
    // Fallback CSS
    matches = queryShadowAll(candidate.selector, root);
  }

  return matches.length === 1 && matches[0] === targetElement;
}

function tryChaining(element, root = document) {
  let parent = element.parentElement;
  let depth = 0;

  while (parent && depth < 3) {
    let parentSelector = null;
    if (parent.id) parentSelector = `#${escapeSelector(parent.id)}`;
    else if (parent.classList.length) {
      // Exclude freezer classes and other dynamic classes when finding parent selector
      const classesWithoutFreezer = getClassesWithoutFreezer(parent);
      const validClass = classesWithoutFreezer.find(c => 
        !c.startsWith('ng-') && 
        !c.includes('active') && 
        !c.includes('focus')
      );
      if (validClass) parentSelector = `.${escapeSelector(validClass)}`;
    }

    if (parentSelector) {
      const parentMatches = queryShadowAll(parentSelector, root);
      if (parentMatches.length === 1) {
        const tag = element.tagName.toLowerCase();
        // Improve chaining: add attributes to make it more unique
        let childSelector = tag;
        if (element.getAttribute('name')) childSelector += `[name="${escapeSelector(element.getAttribute('name'))}"]`;
        else if (element.getAttribute('type')) childSelector += `[type="${escapeSelector(element.getAttribute('type'))}"]`;

        // Check unique child in parent
        const childInParent = parent.querySelectorAll(childSelector);
        if (childInParent.length === 1 && childInParent[0] === element) {
          return `locator('${parentSelector}').locator('${childSelector}')`;
        }
      }
    }
    parent = parent.parentElement;
    depth++;
  }
  return null;
}

function generateCssFallback(element, root = document, options = {}) {
  const path = [];
  let current = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.tagName.toLowerCase();

    // Priority 1: Use ID if available
    if (current.id) {
      selector += `#${escapeSelector(current.id)}`;
      path.unshift(selector);
      break;
    }

    // Priority 2: Try to use CSS classes (more stable than nth-of-type)
    const stableClasses = getStableClasses(current);
    if (stableClasses.length > 0) {
      // Try different combinations of classes to find a unique selector
      const classSelector = tryClassSelector(current, stableClasses, root);
      if (classSelector) {
        path.unshift(classSelector);
        current = current.parentElement;
        continue;
      }
    }

    // Priority 3: Fallback to nth-of-type if no stable classes or classes not unique
    const parent = current.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter(e => e.tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  const css = path.join(' > ');
  if (options.returnCssOnly) return css;
  return `locator('${css}')`;
}

/**
 * Get stable CSS classes from element (exclude dynamic classes and freezer classes)
 * Lấy các CSS class ổn định từ element (loại bỏ các class động và class liên quan đến freezer)
 */
function getStableClasses(element) {
  // First, exclude freezer-related classes
  const classesWithoutFreezer = getClassesWithoutFreezer(element);
  if (classesWithoutFreezer.length === 0) {
    return [];
  }

  // Then, exclude dynamic/state classes that change frequently
  return classesWithoutFreezer.filter(className => {
    return !className.startsWith('ng-') && 
           !className.includes('active') && 
           !className.includes('focus') &&
           !className.includes('hover') &&
           !className.includes('selected') &&
           !className.includes('disabled') &&
           !className.includes('open') &&
           !className.includes('close') &&
           className.length > 0;
  });
}

/**
 * Try to create a unique selector using CSS classes
 * Returns the selector string if unique, null otherwise
 */
function tryClassSelector(element, stableClasses, root = document) {
  if (stableClasses.length === 0) return null;

  const tag = element.tagName.toLowerCase();
  
  // Strategy 1: Try all classes combined (most specific)
  const allClassesSelector = `${tag}.${stableClasses.map(c => escapeSelector(c)).join('.')}`;
  const allMatches = queryShadowAll(allClassesSelector, root);
  if (allMatches.length === 1 && allMatches[0] === element) {
    return allClassesSelector;
  }

  // Strategy 2: Try with fewer classes (find minimum unique combination)
  // Start with all classes and remove one by one until we find unique combination
  for (let i = stableClasses.length; i >= 1; i--) {
    const classCombination = stableClasses.slice(0, i);
    const selector = `${tag}.${classCombination.map(c => escapeSelector(c)).join('.')}`;
    const matches = queryShadowAll(selector, root);
    
    if (matches.length === 1 && matches[0] === element) {
      return selector;
    }
  }

  // Strategy 3: Try single most distinctive class
  // Prefer longer class names (likely more specific)
  const sortedClasses = [...stableClasses].sort((a, b) => b.length - a.length);
  for (const className of sortedClasses) {
    const selector = `${tag}.${escapeSelector(className)}`;
    const matches = queryShadowAll(selector, root);
    
    // Check if this selector uniquely identifies the element in its parent context
    const parent = element.parentElement;
    if (parent) {
      const parentMatches = parent.querySelectorAll(selector);
      if (parentMatches.length === 1 && parentMatches[0] === element) {
        return selector;
      }
    }
  }

  return null;
}

function candidateToCode(candidate) {
  switch (candidate.type) {
    case 'testid':
      if (candidate.attr === 'data-testid') return `getByTestId('${candidate.value}')`;
      return `locator('[${candidate.attr}="${candidate.value}"]')`;
    case 'role':
      const roleName = candidate.name ? `, { name: '${candidate.name.replace(/'/g, "\\'")}' }` : '';
      return `getByRole('${candidate.role}'${roleName})`;
    case 'text': return `getByText('${candidate.text.replace(/'/g, "\\'")}')`;
    case 'label': return `getByLabel('${candidate.text.replace(/'/g, "\\'")}')`;
    case 'placeholder': return `getByPlaceholder('${candidate.text.replace(/'/g, "\\'")}')`;
    case 'alt': return `getByAltText('${candidate.text.replace(/'/g, "\\'")}')`;
    case 'title': return `getByTitle('${candidate.text.replace(/'/g, "\\'")}')`;
    case 'css': return `locator('${candidate.selector}')`;
    default: return `locator('unknown')`;
  }
}