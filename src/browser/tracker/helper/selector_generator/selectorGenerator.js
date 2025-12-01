import { TEST_ID_ATTRIBUTES } from '../core/constants.js';
import { escapeSelector } from '../utils/stringUtils.js';
import { 
  getAccessibleName, 
  getExplicitLabelText,
  getElementRole, 
  queryShadowAll, 
  isVisible 
} from '../dom/domUtils.js';

export function generateAndValidateSelectors(element, options = {}) {
  const candidates = generateCandidates(element);

  // Validate uniqueness
  for (const candidate of candidates) {
    if (isUnique(candidate, element)) {
      return [candidateToCode(candidate)];
    }
  }

  const chained = tryChaining(element);
  if (chained) return [chained];

  return [generateCssFallback(element)];
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

  // 3. Get By Label
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

  // 4. Get By Role (Role + Accessible Name)
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
       const validClass = [...parent.classList].find(c => !c.startsWith('ng-') && !c.includes('active') && !c.includes('focus'));
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
    
    if (current.id) {
      selector += `#${escapeSelector(current.id)}`;
      path.unshift(selector);
      break; 
    } 
    
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