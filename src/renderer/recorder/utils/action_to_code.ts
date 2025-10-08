import { Action, ConnectionType } from "../types/actions";
import { ActionType, AssertType, Element } from "../types/actions";
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

export function generateConnectDBCode(action: Action): string {
    const connection = action.connection;
    const dbVar = connection?.db_type?.toLowerCase();
    const dbType = connection?.db_type;

    const dbConfig = `{
        host: '${connection?.host}',
        port: '${connection?.port}',
        database: '${connection?.db_name}',
        user: '${connection?.username}',
        password: '${connection?.password}',
    }`;

    switch (dbType) {
        case ConnectionType.postgres:
            return `    const ${dbVar} = new PgClient(${dbConfig});\n`
            + `    await ${dbVar}.connect();\n`;
        case ConnectionType.mysql:
            return `    const ${dbVar} = await mysql.createConnection(${dbConfig});\n`
            + `    ${dbVar}.query = async (q) => { const [rows] = await ${dbVar}.execute(q); return { rows }; };\n`
            + `    ${dbVar}.end = async () => { await ${dbVar}.close(); };\n`;
        case ConnectionType.mssql:
            return `    const ${dbVar} = await sql.connect(${dbConfig});\n`
            + `    ${dbVar}.query = async (q) => { const result = await ${dbVar}.request().query(q); return { rows: result.recordset }; };\n`
            + `    ${dbVar}.end = async () => { await ${dbVar}.close(); };\n`;
        default:
            // console.error(`Unsupported database type: ${dbType}`);
            return "";
    }
}

export function processSelector(elements: Element[]): string {
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selectors || []) {
            element_selector.push(escapeSelector(selector.value || ''));
        }
        selectors.push(element_selector);
    }
    const firstCandidates = selectors[0] || [];
    const candidatesLiteral = `[${firstCandidates.join(', ')}]`;
    return candidatesLiteral;
}

export function generateAssertCode(action: Action, index: number): string {
    // console.log(`Generating assert code for action ${index}: ${action.action_type}`);
    // console.log('[generateAssertCode]', action.assert_type);
    // console.log('[generateAssertCode]', action.connection);
    const elements = action.elements || [];
    const candidatesLiteral = processSelector(elements);
    switch (action.assert_type) {
        case AssertType.toBeChecked:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeChecked();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeUnchecked:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).not.toBeChecked();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeDisabled:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeDisabled();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeEditable:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeEditable();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeReadOnly:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeReadOnly();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeEmpty:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeEmpty();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeEnabled:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeEnabled();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeFocused:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeFocused();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeHidden:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeHidden();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toBeVisible:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toBeVisible();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toContainText:
            // console.log('[generateAssertCode]', action);
            if (action.connection) {
                const dbVar = action.connection?.db_type?.toLowerCase();
                return `${generateConnectDBCode(action)}\n` +
                    `    const result = await ${dbVar}.query('${action.elements?.[0]?.query || ''}');\n` +
                    `    const resultText = result.rows[0]?.${action.value || ''};\n` +
                    `    candidates = ${candidatesLiteral};\n` +
                    `    sel = await resolveUniqueSelector(page, candidates);\n` +
                    `    await expect(page.locator(sel)).toContainText(resultText);\n` +
                    `    await ${dbVar}.end();\n` +
                    `    await page.waitForLoadState('networkidle');\n`;
            }
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toContainText('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveAccessibleDescription:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveAccessibleDescription('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveAccessibleName:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveAccessibleName('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveCount:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveCount('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveRole:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveRole('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveText:
            // console.log('[generateAssertCode]', action);
            if (action.connection) {
                const dbVar = action.connection?.db_type?.toLowerCase();
                return `${generateConnectDBCode(action)}\n` +
                    `    const result = await ${dbVar}.query('${action.elements?.[0]?.query || ''}');\n` +
                    `    const resultText = result.rows[0]?.${action.value || ''};\n` +
                    `    candidates = ${candidatesLiteral};\n` +
                    `    sel = await resolveUniqueSelector(page, candidates);\n` +
                    `    await expect(page.locator(sel)).toHaveText(resultText);\n` +
                    `    await ${dbVar}.end();\n` +
                    `    await page.waitForLoadState('networkidle');\n`;
            }
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveText('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveValue:
            // console.log('[generateAssertCode]', action);
            if (action.connection) {
                const dbVar = action.connection?.db_type?.toLowerCase();
                return `${generateConnectDBCode(action)}\n` +
                    `    const result = await ${dbVar}.query('${action.elements?.[0]?.query || ''}');\n` +
                    `    const resultText = result.rows[0]?.${action.value || ''};\n` +
                    `    candidates = ${candidatesLiteral};\n` +
                    `    sel = await resolveUniqueSelector(page, candidates);\n` +
                    `    await expect(page.locator(sel)).toHaveValue(resultText);\n` +
                    `    await ${dbVar}.end();\n` +
                    `    await page.waitForLoadState('networkidle');\n`;
            }
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveValue('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.toHaveValues:
            // console.log('[generateAssertCode]', action);
            if (action.connection) {
                const dbVar = action.connection?.db_type?.toLowerCase();
                return `${generateConnectDBCode(action)}\n` +
                    `    const result = await ${dbVar}.query('${action.elements?.[0]?.query || ''}');\n` +
                    `    const resultText = result.rows[0]?.${action.value || ''};\n` +
                    `    candidates = ${candidatesLiteral};\n` +
                    `    sel = await resolveUniqueSelector(page, candidates);\n` +
                    `    await expect(page.locator(sel)).toHaveValues(resultText);\n` +
                    `    await ${dbVar}.end();\n` +
                    `    await page.waitForLoadState('networkidle');\n`;
            }
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await expect(page.locator(sel)).toHaveValues('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.pageHasATitle:
            return `    await expect(page).toHaveTitle('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.pageHasAURL:
            return `    await expect(page).toHaveURL('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case AssertType.ai:
            let playwrightCode = '\n' + (action.playwright_code || '// Action number ' + index + ' is not generated.');
            // TODO: Add 2 spaces before each line
            // playwrightCode = playwrightCode.replace(/\n/g, '\n  ');
            // console.log('[generateAssertCode]', playwrightCode);
            return `${playwrightCode}\n`;
        default:
            return "";
    }

}
export function generateActionCode(action: Action, index: number): string {
    // console.log(`Generating action code for action ${index}: ${action.action_type}`);
    const elements = action.elements || [];
    const selectors: string[][] = [];
    for (const element of elements) {
        const element_selector: string[] = [];
        for (const selector of element.selectors || []) {
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
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    try {\n` +
                `      await page.click(sel);\n` +
                `    } catch (error) {\n` +
                `      await page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); }, sel);\n` +
                `    }\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.input:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.fill(sel, '${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.select:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.selectOption(sel, '${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.checkbox:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.check(sel);\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.double_click:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.dblclick(sel);\n` +
                `    await page.waitForLoadState('networkidle');\n`;

        case ActionType.right_click:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.click(sel, { button: 'right' });\n` +
                `    await page.waitForLoadState('networkidle');\n`;

        case ActionType.change:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    // CHANGE is not a Playwright API; add custom handling here if needed\n` +
                `    await page.waitForLoadState('networkidle');\n`;

        case ActionType.keydown:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.locator(sel).press('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.keyup:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.locator(sel).press('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.keypress:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.locator(sel).press('${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.assert:
            return generateAssertCode(action, index);
        case ActionType.upload:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.setInputFiles(sel, '${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        default:
            return "";
    }
}

export function getResolveUniqueSelectorFunctionString(): string {
    return `
async function resolveUniqueSelector(page, selectors) {
    if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
        throw new Error('resolveUniqueSelector: invalid inputs');
    }
    const locators = selectors.map(s => page.locator(String(s).trim()));
    await Promise.allSettled(
        locators.map(l => l.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {}))
    );
    for (let i = 0; i < locators.length; i++) {
        const count = await locators[i].count();
        if (count === 1) {
            return selectors[i];
        }
    }
    throw new Error('No matching selector found in ' + selectors + '. Please try again.');
}
`.trim();
}

export function getImportDB(actions: Action[]): string {
    const importDB = new Set(
        actions
        .filter(action => action.action_type === ActionType.assert)
        .map(action => action.connection?.db_type?.toLowerCase())
        .filter(Boolean)
    );

    let importDBCode = "";
    if (importDB.has('postgres')) {
        importDBCode += `import { Client as PgClient } from 'pg';\n`;
    }
    if (importDB.has('mysql')) {
        importDBCode += `import { mysql } from 'mysql2/promise';\n`;
    }
    if (importDB.has('mssql')) {
        importDBCode += `import { sql } from 'mssql';\n`;
    }
    return importDBCode;
}

export function actionToCode(actions: Action[]): string {
    let code = "";
    // Playwright Test format (using built-in test runner fixtures)
    code += `import { test, expect } from '@playwright/test';\n`;
    code += getImportDB(actions);
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