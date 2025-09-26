import { Action } from "../types/actions";
import { ActionType, AssertType } from "../types/actions";
function escapeSelector(selector: string): string {
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
function generateAssertCode(action: Action, index: number): string {
    console.log(`Generating assert code for action ${index}: ${action.action_type}`);
    const elements = action.elements || [];
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selector || []) {
            element_selector.push(escapeSelector(selector.value || ''));
        }
        selectors.push(element_selector);
    }
    const firstCandidates = selectors[0] || [];
    const candidatesLiteral = `[${firstCandidates.join(', ')}]`;
    switch (action.assert_type) {
        case AssertType.toBeChecked:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeChecked();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeUnchecked:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).not.toBeChecked();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeDisabled:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeDisabled();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeEditable:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeEditable();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeReadOnly:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeReadOnly();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeEmpty:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeEmpty();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeEnabled:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeEnabled();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeFocused:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeFocused();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeHidden:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeHidden();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toBeVisible:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toBeVisible();\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toContainText:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toContainText('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveAccessibleDescription:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveAccessibleDescription('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveAccessibleName:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveAccessibleName('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveCount:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveCount('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveRole:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveRole('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveText:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveText('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveValue:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveValue('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.toHaveValues:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await expect(page.locator(sel)).toHaveValues('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.pageHasATitle:
            return `    await expect(page).pageHasATitle('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        case AssertType.pageHasAURL:
            return `    await expect(page).pageHasAURL('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n` +
                `    console.log('${index}. ${action.description}');\n`;
        default:
            return "";
    }

}
function generateActionCode(action: Action, index: number): string {
    console.log(`Generating action code for action ${index}: ${action.action_type}`);
    const elements = action.elements || [];
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selector || []) {
            element_selector.push(escapeSelector(selector.value || ''));
        }
        selectors.push(element_selector);
    }

    const firstCandidates = selectors[0] || [];
    const candidatesLiteral = `[${firstCandidates.join(', ')}]`;

    switch (action.action_type) {
        case ActionType.navigate:
            return `    await page.goto('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.click:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    try {\n` +
                `      await page.click(sel);\n` +
                `    } catch (error) {\n` +
                `      await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel);\n` +
                `    }\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.input:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.fill(sel, '${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.select:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.selectOption(sel, '${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.checkbox:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.check(sel);\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.double_click:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.dblclick(sel);\n` +
                `    await page.waitForLoadState('networkidle');\n`;

        case ActionType.right_click:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.click(sel, { button: 'right' });\n` +
                `    await page.waitForLoadState('networkidle');\n`;

        case ActionType.change:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    // CHANGE is not a Playwright API; add custom handling here if needed\n` +
                `    await page.waitForLoadState('networkidle');\n`;

        case ActionType.keydown:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.locator(sel).press('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.keyup:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.locator(sel).press('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.keypress:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates, '${action.value || ''}');\n` +
                `    await page.locator(sel).press('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.assert:
            return generateAssertCode(action, index);
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
export function actionToCode(actions: Action[]): string {
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