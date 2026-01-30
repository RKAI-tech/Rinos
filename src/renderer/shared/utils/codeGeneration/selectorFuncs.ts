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
  return "import { resolveUniqueSelector } from './helpers.js';\n";
}

export function getForceActionFunctionString(): string {
  return "import { forceAction } from './helpers.js';\n";
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
