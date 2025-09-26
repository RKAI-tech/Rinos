import {ActionGetResponse, AssertTypes} from "../types/actions";
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
function generateAssertCode(action: ActionGetResponse, index:number):string {
    console.log(`Generating assert code for action ${index}: ${action.action_type}`);
    const elements = action.elements;
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selector || []) {
            element_selector.push(escapeSelector(selector));
        }
        selectors.push(element_selector);
    }
    const firstCandidates = selectors[0] || [];
    const candidatesLiteral = `[${firstCandidates.join(', ')}]`;
    switch (action.assert_type) {
        case AssertTypes.toBeAttached:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeAttached();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeDetached:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).not.toBeAttached();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeChecked:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeChecked();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeUnchecked:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).not.toBeChecked();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeDisabled:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeDisabled();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeEditable:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeEditable();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeReadOnly:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeReadOnly();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeEmpty:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeEmpty();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeEnabled:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeEnabled();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeFocused:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeFocused();\n` +
                    `    await page.waitForLoadState('networkidle');\n` +
                    `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeHidden:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeHidden();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeInViewport:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeInViewport();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toBeVisible:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toBeVisible();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toContainText:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toContainText('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toContainClass:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toContainClass('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveAccessibleDescription:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveAccessibleDescription('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveAccessibleName:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveAccessibleName('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveAttribute:
            //TODO: add attribute value
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveAttribute('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveClass:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveClass('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveCount:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveCount('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveCSS:
            //TODO: add css value
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveCSS('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveId:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveId('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveJSProperty:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveJSProperty('${action.value || '' }',true);\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveRole:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveRole('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveScreenshot:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveScreenshot('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveText:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveText('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveValue:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveValue('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toHaveValues:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toHaveValues('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.toMatchAriaSnapshot:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await expect(page.locator(sel)).toMatchAriaSnapshot('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.pageHasAScreenshot:
            return  `    await expect(page).pageHasAScreenshot('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.pageHasATitle:
            return `    await expect(page).pageHasATitle('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.pageHasAURL:
            return `    await expect(page).pageHasAURL('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.apiResponseOk:
            return `    await expect(response).toBeOK();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case AssertTypes.apiResonseNotOk:
            return `    await expect(response).not.toBeOK();\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
      }
    return `    await expect(page.locator('${action.value || ''}')).toBeVisible();\n` +
           `    await page.waitForLoadState('networkidle');\n` +
           `    console.log('${index}. ${action.description}');\n`;
}
function generateActionCode(action: ActionGetResponse, index:number):string {
    console.log(`Generating action code for action ${index}: ${action.action_type}`);
    const elements = action.elements;
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selector || []) {
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
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    try {\n` +
                   `      await page.click(sel);\n` +
                   `    } catch (error) {\n` +
                   `      await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel);\n` +
                   `    }\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.INPUT:
            return  `    candidates = ${candidatesLiteral};\n` +
                    `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                    `    await page.fill(sel, '${action.value || ''}');\n` +
                    `    await page.waitForLoadState('networkidle');\n` +
                    `    console.log('${index}. ${action.description}');\n`;
        case ActionType.SELECT:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await page.selectOption(sel, '${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.CHECKBOX:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await page.check(sel);\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
            case ActionType.DOUBLE_CLICK:
        return `    candidates = ${candidatesLiteral};\n` +
               `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
               `    await page.dblclick(sel);\n` +
               `    await page.waitForLoadState('networkidle');\n` +
               `    console.log('${index}. ${action.description}');\n`;

        case ActionType.RIGHT_CLICK:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await page.click(sel, { button: 'right' });\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;

        case ActionType.CHANGE:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    // CHANGE is not a Playwright API; add custom handling here if needed\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;

        case ActionType.KEYDOWN:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await page.locator(sel).press('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.KEYUP:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await page.locator(sel).press('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        case ActionType.KEYPRESS:
            return `    candidates = ${candidatesLiteral};\n` +
                   `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                   `    await page.locator(sel).press('${action.value || ''}');\n` +
                   `    await page.waitForLoadState('networkidle');\n` +
                   `    console.log('${index}. ${action.description}');\n`;
        default:
            return "";
    }
}

export function getResolveUniqueSelectorFunctionString(): string {
    return `// Add function\nasync function resolveUniqueSelector(page, selectors, fallbackValue) {
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
  
  // 2) If no selector matches, return fallback value if provided
  if (fallbackValue !== undefined && fallbackValue !== null) {
    return String(fallbackValue);
  }
  
  throw new Error('resolveUniqueSelector: no matching selector found in  '+selectors);
}`;
}
export function actionToCode(actions: ActionGetResponse[]):string {
    let code = "";
    // Playwright Test format (using built-in test runner fixtures)
    code += `import { test, expect } from '@playwright/test';\n`;
   
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