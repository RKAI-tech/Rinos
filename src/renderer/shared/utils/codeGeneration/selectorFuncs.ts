// Selector functions for code generation
// Ported from downloads/selector_funcs.txt

import { Element } from '../../types/actions';
import { escape } from './base';

export function checkNeedResolveUniqueSelector(actions: any[]): boolean {
  for (const action of actions) {
    const elements = action.elements;
    if (elements && elements.length > 0) {
      return true;
    }
  }
  return false;
}

export function getResolveUniqueSelectorFunctionString(): string {
  /**
   * Returns the JS function string for resolveUniqueSelector.
   */
  return `async function resolveUniqueSelector(page, selectors) {
  if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('Page or selectors is invalid.');
  }
  const toLocator = (s) => { return eval(\`page.\${s}\`); };
  const locators = selectors.map(toLocator);
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
  throw new Error(\`Invalid selectors.\`);
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
