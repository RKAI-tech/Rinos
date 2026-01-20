// Selector functions for code generation
// Ported from downloads/selector_funcs.txt

import { ActionType, Element } from '../../types/actions';
import { escape } from './base';

export function checkNeedResolveUniqueSelector(actions: any[]): boolean {
  if (!Array.isArray(actions)) {
    return false;
  }
  for (const action of actions) {
    const elements = action.elements;
    if (elements && elements.length > 0) {
      return true;
    }
  }
  return false;
}

export function checkNeedForceAction(actions: any[]): boolean {
  if (!Array.isArray(actions)) {
    return false;
  }
  const supported = new Set([
    ActionType.click,
    ActionType.double_click,
    ActionType.input,
    ActionType.select
  ]);
  for (const action of actions) {
    if (supported.has(action.action_type)) {
      return true;
    }
  }
  return false;
}

export function getResolveUniqueSelectorFunctionString(): string {
  /**
   * Returns the JS function string for resolveUniqueSelector.
   */
//   return `async function resolveUniqueSelector(page, selectors) {
//   if (!page || !Array.isArray(selectors) || selectors.length === 0) {
//     throw new Error('Page or selectors is invalid.');
//   }

//   const locators = selectors.map(s => eval(\`page.\${ s } \`));
//   const counts = new Array(locators.length).fill(0);

//   // Poll count() và cache kết quả
//   await Promise.allSettled(
//     locators.map((l, i) =>
//       expect
//         .poll(async () => {
//           const c = await l.count();
//           counts[i] = c;
//           return c;
//         }, { timeout: 3000 })
//         .toBeGreaterThan(0)
//         .catch(() => {})
//     )
//   );

//   let minIndex = -1;
//   let minCount = Infinity;

//   for (let i = 0; i < counts.length; i++) {
//     const c = counts[i];

//     if (c === 1) {
//       return locators[i];
//     }

//     if (c > 0 && c < minCount) {
//       minCount = c;
//       minIndex = i;
//     }
//   }

//   if (minIndex !== -1) {
//     return locators[minIndex].first();
//   }

//   throw new Error('Invalid selectors. Please check the selectors and try again.');
// }`;

  return `async function resolveUniqueSelector(page, selectors) {
  if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('Page or selectors is invalid.');
  }
  const toLocator = (s) => { 
    try {
      return eval(\`page.\${s}\`);
    } catch (e) { return null; }
  };
  const locators = selectors.map(toLocator).filter(l => !!l);
  await Promise.allSettled(
    locators.map(l => l.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {}))
  );
  let minIndex = -1; let minCount = Infinity;
  for (let i = 0; i < locators.length; i++) {
    const count = await locators[i].count();
    if (count === 1) { return locators[i]; }
    if (count > 0 && count < minCount) {
      minCount = count;
      minIndex = i;
    }
  }
  if (minIndex !== -1) { return locators[minIndex].first(); }
  throw new Error(\`Invalid selectors. Please check the selectors and try again.\`);
}`;
}

export function getForceActionFunctionString(): string {
  return `async function forceAction(page, selectors, action, payload) {
  const serializeError = (err) => {
    try { return String(err); } catch { return 'unknown error'; }
  };

  const tryOne = async (selector) => {
    return page.evaluate(({ sel, type, payload }) => {
      function queryShadowAll(root, selector) {
        const out = [];
        const stack = [root];
        while (stack.length) {
          const node = stack.pop();
          if (!node) continue;
          if (node.querySelectorAll) {
            out.push(...Array.from(node.querySelectorAll(selector)));
          }
          if (node.shadowRoot) stack.push(node.shadowRoot);
          if (node.children) stack.push(...Array.from(node.children));
        }
        return out;
      }

      const textMatch = (el, target) => {
        if (!target) return false;
        const text = (el.textContent || '').trim();
        if (text === target) return true;
        return text.includes(target);
      };

      const getAccessibleName = (el) => {
        const aria = el.getAttribute && el.getAttribute('aria-label');
        if (aria) return aria;
        const label = el.getAttribute && el.getAttribute('aria-labelledby');
        if (label) {
          const ids = label.split(' ');
          const parts = [];
          ids.forEach((id) => {
            const ref = document.getElementById(id);
            if (ref && ref.textContent) parts.push(ref.textContent.trim());
          });
          if (parts.length) return parts.join(' ').trim();
        }
        if (el.alt) return el.alt;
        if (el.title) return el.title;
        return (el.innerText || '').trim();
      };

      function resolveElement(sel) {
        sel = sel.trim();
        const chainMatch = sel.match(/^locator\\('(.+)'\\)\\.locator\\('(.+)'\\)$/);
        if (chainMatch) {
          const parentSel = chainMatch[1];
          const childSel = chainMatch[2];
          const parents = queryShadowAll(document, parentSel);
          if (parents.length === 1) {
            const child = queryShadowAll(parents[0], childSel);
            return child.length === 1 ? child[0] : child[0] || null;
          }
          return null;
        }

        const locatorMatch = sel.match(/^locator\\('(.+)'\\)$/);
        if (locatorMatch) {
          const css = locatorMatch[1];
          return queryShadowAll(document, css)[0] || null;
        }

        const testIdMatch = sel.match(/^getByTestId\\('(.+)'\\)$/);
        if (testIdMatch) {
          const v = testIdMatch[1];
          return queryShadowAll(document, \`[data-testid="\${v}"]\`)[0] || null;
        }

        const roleMatch = sel.match(/^getByRole\\('(.+)'\\s*,?\\s*(\\{.*\\})?\\)$/);
        if (roleMatch) {
          const role = roleMatch[1];
          let name = '';
          try {
            const obj = roleMatch[2] ? JSON.parse(roleMatch[2].replace(/'/g, '"')) : null;
            name = obj?.name || '';
          } catch { }
          const candidates = queryShadowAll(document, \`[role="\${role}"]\`);
          if (!name) return candidates[0] || null;
          const exact = candidates.find(el => getAccessibleName(el) === name);
          if (exact) return exact;
          return candidates.find(el => (getAccessibleName(el) || '').includes(name)) || null;
        }

        const textMatchSel = sel.match(/^getByText\\('(.+)'\\)$/);
        if (textMatchSel) {
          const t = textMatchSel[1];
          const candidates = queryShadowAll(document, '*').filter(el => textMatch(el, t));
          return candidates.find(el => (el.textContent || '').trim() === t) || candidates[0] || null;
        }

        const labelMatch = sel.match(/^getByLabel\\('(.+)'\\)$/);
        if (labelMatch) {
          const t = labelMatch[1];
          const labels = queryShadowAll(document, 'label').filter(el => textMatch(el, t));
          for (const lb of labels) {
            const forId = lb.getAttribute('for');
            if (forId) {
              const target = document.getElementById(forId);
              if (target) return target;
            }
            const control = lb.querySelector('input,textarea,select,button');
            if (control) return control;
          }
          return null;
        }

        const placeholderMatch = sel.match(/^getByPlaceholder\\('(.+)'\\)$/);
        if (placeholderMatch) {
          const t = placeholderMatch[1];
          const candidates = queryShadowAll(document, 'input,textarea,select');
          return candidates.find(el => el.getAttribute && el.getAttribute('placeholder') === t) || null;
        }

        const altMatch = sel.match(/^getByAltText\\('(.+)'\\)$/);
        if (altMatch) {
          const t = altMatch[1];
          return queryShadowAll(document, \`[alt="\${t}"]\`)[0] || null;
        }
        const titleMatch = sel.match(/^getByTitle\\('(.+)'\\)$/);
        if (titleMatch) {
          const t = titleMatch[1];
          return queryShadowAll(document, \`[title="\${t}"]\`)[0] || null;
        }

        return null;
      }

      const el = resolveElement(sel);
      if (!el) return { ok: false, reason: 'not_found' };

      const scrollIntoViewIfNeeded = (node) => {
        try { node.scrollIntoView({ block: 'center', inline: 'center' }); } catch { }
      };

      scrollIntoViewIfNeeded(el);

      const dispatchMouse = (node, eventName) => {
        const evt = new MouseEvent(eventName, { bubbles: true, cancelable: true, view: window, buttons: 1 });
        node.dispatchEvent(evt);
      };

      switch (type) {
        case 'click':
          dispatchMouse(el, 'pointerdown');
          dispatchMouse(el, 'mousedown');
          dispatchMouse(el, 'mouseup');
          dispatchMouse(el, 'click');
          return { ok: true };
        case 'dblclick':
          dispatchMouse(el, 'pointerdown');
          dispatchMouse(el, 'mousedown');
          dispatchMouse(el, 'mouseup');
          dispatchMouse(el, 'click');
          dispatchMouse(el, 'mousedown');
          dispatchMouse(el, 'mouseup');
          dispatchMouse(el, 'click');
          dispatchMouse(el, 'dblclick');
          return { ok: true };
        case 'input':
          if (!('value' in el)) return { ok: false, reason: 'not_input' };
          el.value = payload || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true };
        case 'select':
          if (el.tagName !== 'SELECT') return { ok: false, reason: 'not_select' };
          const selectEl = el;
          const opts = Array.from(selectEl.options);
          let target = opts.find(o => o.value === payload) || opts.find(o => o.text === payload);
          if (!target && opts.length && payload === undefined) target = opts[0];
          if (!target) return { ok: false, reason: 'option_not_found' };
          selectEl.value = target.value;
          target.selected = true;
          selectEl.dispatchEvent(new Event('input', { bubbles: true }));
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          return { ok: true };
        default:
          return { ok: false, reason: 'unsupported' };
      }
    }, { sel: selector, type: action, payload }).catch(err => ({ ok: false, reason: serializeError(err) }));
  };

  for (const sel of selectors) {
    const result = await tryOne(sel);
    if (result && result.ok) {
      return;
    }
  }
  throw new Error('This action is failed. Please check the selector or contact support.');
}`;
}

export function convertListSelectorsToLiteral(elements: Element[] | null | undefined): string[] {
  /**
   * Generate JS array literal for selectors from a list of elements.
   */
  const candidatesLiteral: string[] = [];

  if (elements && elements.length > 0) {
    for (const element of elements) {
      const elementSelectors = element.selectors || [];
      const selectors: string[] = [];

      for (const selector of elementSelectors) {
        const value = selector.value;
        if (value !== null && value !== undefined) {
          selectors.push(escape(value));
        }
      }

      candidatesLiteral.push('[' + selectors.join(', ') + ']');
    }
  } else {
    candidatesLiteral.push('[]');
  }

  return candidatesLiteral;
}
