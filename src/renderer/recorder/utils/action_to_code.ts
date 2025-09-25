import {ActionGetResponse} from "../types/actions";
import { ActionType } from "../types/actions";
function escapeSelector(selector:string):string {
    let escaped = selector;
    
    // Escape backslashes first
    escaped = escaped.replace(/\\/g, '\\\\');
    
    // Escape single quotes
    escaped = escaped.replace(/'/g, "\\'");
    
    // Escape double quotes
    escaped = escaped.replace(/"/g, '\\"');
    
    // For complex selectors with special characters, wrap in quotes
    if (selector.includes(':') || (selector.includes('.') && /\d/.test(selector))) {
      return `"${escaped}"`;
    } else {
      return `'${escaped}'`;
    }
}
function generateActionCode(action: ActionGetResponse, index:number):string {
    console.log(`Generating action code for action ${index}: ${action.action_type}`);
    const elements = action.elements;
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selector) {
            element_selector.push(escapeSelector(selector));
        }
        selectors.push(element_selector);
    }

    const firstCandidates = selectors[0] || [];
    const candidatesLiteral = `[${firstCandidates.join(', ')}]`;

    switch (action.action_type) {
        case ActionType.NAVIGATE:
            return `    await page.goto('${action.value || ''}');\n` +
            `    await page.waitForLoadState('networkidle');\n` +
            `    console.log('${index}. ${action.description}');\n`; 
        case ActionType.CLICK:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    try {\n` +
                   `      await page.click(sel);\n` +
                   `    } catch (error) {\n` +
                   `      await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel);\n` +
                   `    }\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.INPUT:
            return  `    candidates = ${candidatesLiteral};\n` +
                    `    sel = await resolveUniqueSelector(page, candidates);\n` +
                    `    await page.fill(sel, '${action.value || ''}');\n` +
                    `    await page.waitForLoadState('networkidle');\n` +
                    `    console.log('${index}. ${action.description}');\n`;
        case ActionType.SELECT:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    await page.selectOption(sel, '${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.CHECKBOX:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    await page.check(sel);\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
            case ActionType.DOUBLE_CLICK:
        return `    candidates = ${candidatesLiteral};\n` +
               `    sel = await resolveUniqueSelector(page, candidates);\n` +
               `    await page.dblclick(sel);\n` +
               `    await page.waitForLoadState('networkidle');\n` +
               `    console.log('${index}. ${action.description}');\n`;

        case ActionType.RIGHT_CLICK:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    await page.click(sel, { button: 'right' });\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;

        case ActionType.CHANGE:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    // CHANGE is not a Playwright API; add custom handling here if needed\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;

        case ActionType.KEYDOWN:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    await page.locator(sel).press('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.KEYUP:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    await page.locator(sel).press('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.KEYPRESS:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates);\n` +
                   `    await page.locator(sel).press('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        default:
            return "";
    }
}

export function getResolveUniqueSelectorFunctionString(): string {
    return `async function resolveUniqueSelector(page, selectors) {
  if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('resolveUniqueSelector: invalid inputs');
  }

  // 1) Prefer selectors that match exactly one element
  for (const raw of selectors) {
    const s = String(raw).trim();
    if (!s) continue;
    try {
      const count = await page.locator(s).count();
      if (count === 1) {
        return s;
      }
    } catch (_) {
      // ignore invalid selector and try the next one
    }
  }
  throw new Error('resolveUniqueSelector: no matching selector found');
}`;
}
export function actionToCode(actions: ActionGetResponse[]):string {
    let code = "";
    // Playwright Test format (using built-in test runner fixtures)
    code += `import { test, expect } from '@playwright/test';\n`;
    code += `\n`;
    // Helper to resolve a unique selector at runtime
    code += getResolveUniqueSelectorFunctionString();
    code += `\n`;
    // Test block
    code += `test('Generated Test', async ({ page }) => {\n`;
    code += `  let candidates; let sel;\n`;
    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        // Use the current position (1-based) to ensure numbering matches UI after local deletes/reorders
        code += generateActionCode(action, i + 1);
    }
    code += `});\n`;
    return code;
}