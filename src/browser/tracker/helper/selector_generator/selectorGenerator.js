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
  const candidates = generateCandidates(element);

  const uniqueSelectors = [];

  // Validate uniqueness
  for (const candidate of candidates) {
    if (isUnique(candidate, element)) {
      uniqueSelectors.push(candidateToCode(candidate));
    }
  }

  const chained = tryChaining(element);
  if (chained) uniqueSelectors.push(chained);

  uniqueSelectors.push(generateCssFallback(element));

  return uniqueSelectors.map(s => s.replace(/\\/g, '\\\\'));
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

function isUnique(candidate, targetElement) {
  let matches = [];

  if (candidate.query) {
    matches = queryShadowAll(candidate.query);
  }
  else if (candidate.queryRole) {
    const allElements = queryShadowAll('*');
    matches = allElements.filter(el => {
      if (getElementRole(el) !== candidate.role) return false;
      if (candidate.name) {
        return getAccessibleName(el) === candidate.name;
      }
      return true;
    });
  }
  else if (candidate.queryText) {
    const allElements = queryShadowAll('*');
    matches = allElements.filter(el => {
      return el.textContent.includes(candidate.text) && isVisible(el);
    });
    // Prefer exact match
    const exactMatches = matches.filter(el => el.textContent.trim() === candidate.text);
    if (exactMatches.length > 0) matches = exactMatches;
  }
  else if (candidate.queryLabel) {
    // Find all input/textarea/select
    const inputs = queryShadowAll('input, textarea, select');
    // Filter to find the one with an explicit label that matches
    matches = inputs.filter(el => getExplicitLabelText(el) === candidate.text);
  }
  else if (candidate.selector) {
    // Fallback CSS
    matches = queryShadowAll(candidate.selector);
  }

  return matches.length === 1 && matches[0] === targetElement;
}

function tryChaining(element) {
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
      const parentMatches = queryShadowAll(parentSelector);
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

function generateCssFallback(element) {
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
      const classSelector = tryClassSelector(current, stableClasses);
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
function tryClassSelector(element, stableClasses) {
  if (stableClasses.length === 0) return null;

  const tag = element.tagName.toLowerCase();
  
  // Strategy 1: Try all classes combined (most specific)
  const allClassesSelector = `${tag}.${stableClasses.map(c => escapeSelector(c)).join('.')}`;
  const allMatches = queryShadowAll(allClassesSelector);
  if (allMatches.length === 1 && allMatches[0] === element) {
    return allClassesSelector;
  }

  // Strategy 2: Try with fewer classes (find minimum unique combination)
  // Start with all classes and remove one by one until we find unique combination
  for (let i = stableClasses.length; i >= 1; i--) {
    const classCombination = stableClasses.slice(0, i);
    const selector = `${tag}.${classCombination.map(c => escapeSelector(c)).join('.')}`;
    const matches = queryShadowAll(selector);
    
    if (matches.length === 1 && matches[0] === element) {
      return selector;
    }
  }

  // Strategy 3: Try single most distinctive class
  // Prefer longer class names (likely more specific)
  const sortedClasses = [...stableClasses].sort((a, b) => b.length - a.length);
  for (const className of sortedClasses) {
    const selector = `${tag}.${escapeSelector(className)}`;
    const matches = queryShadowAll(selector);
    
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