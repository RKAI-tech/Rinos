import { Action, ConnectionType, ApiRequestData } from "../types/actions";
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

/**
 * Prepares a string to be safely embedded inside a single-quoted JS string literal.
 * - Removes newlines (\r, \n) by replacing with a single space
 * - Escapes backslashes and both single and double quote types
 */
export function sanitizeJsString(raw: string | null | undefined): string {
    if (raw == null) {
        return "";
    }
    // Convert to string, remove all carriage returns/newlines, replace with a single space
    let noNewlines = String(raw).replace(/[\r\n]+/g, " ");
    // Escape backslashes, single quotes, and double quotes
    let escaped = noNewlines
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
    return escaped;
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
    const secondCandidates = selectors[1] || [];
    const secondCandidatesLiteral = `[${secondCandidates.join(', ')}]`;
    const dbVar = action.connection?.db_type?.toLowerCase();
    var connect_db_code="";
    if (action.connection) {
        connect_db_code = generateConnectDBCode(action);
    }
    console.log('generateActionCode', action);
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
                `    await page.locator(sel).click();\n` +
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
        case ActionType.drag_and_drop:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    var second_candidates = ${secondCandidatesLiteral};\n` +
                `    var second_sel = await resolveUniqueSelector(page, second_candidates);\n` +
                `    await page.dragAndDrop(sel, second_sel);\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.assert:
            return generateAssertCode(action, index);
        case ActionType.upload:
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.setInputFiles(sel, '${action.value || ''}');\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.database_execution:
            let query = sanitizeJsString(action.elements?.[0]?.query || '');
            return connect_db_code +    
            `    const result = await ${dbVar}.query('${query}');\n` +
                `    console.log(result);\n` +
                `    await ${dbVar}.end();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.wait:
            return `    await page.waitForTimeout(${action.value || '1000'});\n`;
        case ActionType.reload:
            return `    await page.reload();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.back:
            return `    await page.goBack();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.forward:
            return `    await page.goForward();\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.scroll:
            //Format y X:3, Y:4
            let x = 0;
            let y = 0;
            let match_scroll = action.value?.match(/X\s*:\s*(\d+)\s*,\s*Y\s*:\s*(\d+)/i);
            if (match_scroll) {
                x = Number(match_scroll[1]);
                y = Number(match_scroll[2]);
            } 
            return `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    await page.locator(sel).evaluate(e=>{ e.scrollTo(${x || '0'}, ${y || '0'}); });\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.window_resize:
            let width = 0;
            let height = 0;
            let match_window_resize = action.value?.match(/Width\s*:\s*(\d+)\s*,\s*Height\s*:\s*(\d+)/i);
            if (match_window_resize) {
                width = Number(match_window_resize[1]);
                height = Number(match_window_resize[2]);
            } 
            return `    await page.setViewportSize({ width: ${width || '1920'}, height: ${height || '1080'} });\n` +
                `    await page.waitForLoadState('networkidle');\n`;
        case ActionType.api_request:
            if (action.api_request) {
                return generateApiRequestCode(action.api_request);
            }
            return `    // API Request action without data\n`;
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

  // Normalize all selectors into locators
  const toLocator = (s) => {
    const selector = String(s).trim();
    if (selector.startsWith('xpath=')) {
      // Already a valid XPath
      return page.locator(selector);
    }
    if (selector.startsWith('/') || selector.startsWith('(')) {
      // Absolute or relative XPath -> prefix with "xpath="
      return page.locator(\`xpath=\${selector}\`);
    }
    // Otherwise, treat as CSS or text selector
    return page.locator(selector);
  };

  const locators = selectors.map(toLocator);

  // Wait for selectors to be attached (exist in DOM)
  await Promise.allSettled(
    locators.map(l => l.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {}))
  );

  // Find the first valid, unique selector
  for (let i = 0; i < locators.length; i++) {
    const locator = locators[i];
    const selector = selectors[i];
    const count = await locator.count();

    if (count === 1 && await locator.first().isVisible()) {
      // If it's an XPath without prefix, add "xpath="
      if (selector.startsWith('/') || selector.startsWith('(')) {
        return \`xpath=\${selector}\`;
      }
      // Otherwise, return as-is
      return selector;
    }
  }

  throw new Error(\`No matching selector found among: \${selectors.join(', ')}\`);
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

/**
 * Create API Request action
 */
export function createApiRequestAction(
    testcaseId: string,
    apiData: ApiRequestData,
    description?: string
): Action {
    return {
        testcase_id: testcaseId,
        action_type: ActionType.api_request,
        description: description || `API Request: ${apiData.method} ${apiData.url}`,
        api_request: apiData,
        timestamp: Date.now()
    };
}

/**
 * Generate Playwright code for API request action
 */
export function generateApiRequestCode(apiData: ApiRequestData): string {
    let code = `  // API Request: ${apiData.method} ${apiData.url}\n`;
    
    // Build URL with params
    let url = apiData.url;
    if (apiData.params && apiData.params.length > 0) {
        const validParams = apiData.params.filter(p => p.key.trim() && p.value.trim());
        if (validParams.length > 0) {
            const urlParams = new URLSearchParams();
            validParams.forEach(param => {
                urlParams.append(param.key.trim(), param.value.trim());
            });
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}${urlParams.toString()}`;
        }
    }
    
    // Prepare headers and (optionally) read from storage if needed
    const hasHeaders = apiData.headers && apiData.headers.some(h => h.key.trim() && h.value.trim());
    const hasAuth = apiData.auth && apiData.auth.type !== 'none';
    const hasBody = apiData.body && apiData.body.type !== 'none';

    if (hasHeaders) {
      code += `  const headers: any = {\n`;
      apiData.headers.forEach(header => {
        if (header.key.trim() && header.value.trim()) {
          code += `    '${header.key.trim()}': '${header.value.trim()}',\n`;
        }
      });
      code += `  };\n`;
    } else {
      code += `  const headers: any = {};\n`;
    }

    if (hasAuth) {
      if (apiData.auth.type === 'bearer') {
        // Prefer explicit token; otherwise read from configured storage
        if (apiData.auth.token && apiData.auth.token.trim()) {
          code += `  headers['Authorization'] = 'Bearer ${apiData.auth.token.trim()}';\n`;
        } else if (apiData.tokenStorage?.enabled && apiData.tokenStorage.key && apiData.tokenStorage.type) {
          if (apiData.tokenStorage.type === 'localStorage') {
            code += `  const __bearer = await page.evaluate((k) => localStorage.getItem(k) || '', '${apiData.tokenStorage.key}');\n`;
          } else if (apiData.tokenStorage.type === 'sessionStorage') {
            code += `  const __bearer = await page.evaluate((k) => sessionStorage.getItem(k) || '', '${apiData.tokenStorage.key}');\n`;
          } else if (apiData.tokenStorage.type === 'cookie') {
            code += `  const __bearer = await page.evaluate((name) => { const m = document.cookie.split('; ').find(r => r.startsWith(name + '=')); return m ? decodeURIComponent(m.split('=')[1]) : ''; }, '${apiData.tokenStorage.key}');\n`;
          }
          code += `  if (__bearer) headers['Authorization'] = 'Bearer ' + __bearer;\n`;
        }
      } else if (apiData.auth.type === 'basic') {
        // Prefer explicit username/password; otherwise read from configured storage
        const hasExplicit = !!(apiData.auth.username && apiData.auth.password);
        if (hasExplicit) {
          code += `  headers['Authorization'] = 'Basic ' + Buffer.from('${apiData.auth.username}:${apiData.auth.password}').toString('base64');\n`;
        } else if (apiData.basicAuthStorage?.enabled && apiData.basicAuthStorage.type && apiData.basicAuthStorage.usernameKey && apiData.basicAuthStorage.passwordKey) {
          if (apiData.basicAuthStorage.type === 'localStorage') {
            code += `  const __basic = await page.evaluate((uk, pk) => ({ u: localStorage.getItem(uk) || '', p: localStorage.getItem(pk) || '' }), '${apiData.basicAuthStorage.usernameKey}', '${apiData.basicAuthStorage.passwordKey}');\n`;
          } else if (apiData.basicAuthStorage.type === 'sessionStorage') {
            code += `  const __basic = await page.evaluate((uk, pk) => ({ u: sessionStorage.getItem(uk) || '', p: sessionStorage.getItem(pk) || '' }), '${apiData.basicAuthStorage.usernameKey}', '${apiData.basicAuthStorage.passwordKey}');\n`;
          } else if (apiData.basicAuthStorage.type === 'cookie') {
            code += `  const __basic = await page.evaluate((uk, pk) => { const getC = (n) => { const m = document.cookie.split('; ').find(r => r.startsWith(n + '=')); return m ? decodeURIComponent(m.split('=')[1]) : ''; }; return { u: getC(uk), p: getC(pk) }; }, '${apiData.basicAuthStorage.usernameKey}', '${apiData.basicAuthStorage.passwordKey}');\n`;
          }
          code += `  if (__basic?.u && __basic?.p) headers['Authorization'] = 'Basic ' + Buffer.from(__basic.u + ':' + __basic.p).toString('base64');\n`;
        }
      }
    }

    // Prepare request options
    const hasAnyOptions = hasHeaders || hasAuth || hasBody;
    code += `  const response = await page.request.${apiData.method.toLowerCase()}('${url}'`;
    if (hasAnyOptions) {
      code += `, {\n`;
      code += `    headers,\n`;
      if (hasBody) {
        if (apiData.body.type === 'json') {
          code += `    data: ${apiData.body.content},\n`;
        } else if (apiData.body.type === 'form' && apiData.body.formData) {
          const formData = apiData.body.formData
            .filter(p => p.key.trim() && p.value.trim())
            .map(p => `'${p.key.trim()}': '${p.value.trim()}'`)
            .join(', ');
          code += `    data: { ${formData} },\n`;
        }
      }
      code += `  }`;
    }
    code += `);\n`;
    code += `  console.log('Response status:', response.status());\n`;
    code += `  console.log('Response data:', await response.json());\n`;
    
    // Add token storage code if enabled (store token from response)
    if (apiData.tokenStorage?.enabled) {
      code += `\n  // Store token for future use\n`;
      
      if (apiData.tokenStorage.type === 'localStorage') {
        code += `  const token = await response.json().then(data => data.token || data.access_token || data.accessToken);\n`;
        code += `  if (token) {\n`;
        code += `    localStorage.setItem('${apiData.tokenStorage.key || 'auth_token'}', token);\n`;
        code += `    console.log('Token stored in localStorage with key: ${apiData.tokenStorage.key || 'auth_token'}');\n`;
        code += `  }\n`;
      } else if (apiData.tokenStorage.type === 'sessionStorage') {
        code += `  const token = await response.json().then(data => data.token || data.access_token || data.accessToken);\n`;
        code += `  if (token) {\n`;
        code += `    sessionStorage.setItem('${apiData.tokenStorage.key || 'auth_token'}', token);\n`;
        code += `    console.log('Token stored in sessionStorage with key: ${apiData.tokenStorage.key || 'auth_token'}');\n`;
        code += `  }\n`;
      } else if (apiData.tokenStorage.type === 'cookie') {
        code += `  const token = await response.json().then(data => data.token || data.access_token || data.accessToken);\n`;
        code += `  if (token) {\n`;
        code += `    document.cookie = '${apiData.tokenStorage.key || 'auth_token'}=' + token + '; path=/; max-age=3600';\n`;
        code += `    console.log('Token stored as cookie: ${apiData.tokenStorage.key || 'auth_token'}');\n`;
        code += `  }\n`;
      }
    }

    // Add Basic Auth storage code if enabled (store from provided auth)
    if (apiData.basicAuthStorage?.enabled) {
      code += `\n  // Store Basic Auth credentials for future use\n`;
      
      if (apiData.basicAuthStorage.type === 'localStorage') {
        code += `  localStorage.setItem('${apiData.basicAuthStorage.usernameKey || 'basic_username'}', '${apiData.auth?.username || ''}');\n`;
        code += `  localStorage.setItem('${apiData.basicAuthStorage.passwordKey || 'basic_password'}', '${apiData.auth?.password || ''}');\n`;
        code += `  console.log('Basic Auth credentials stored in localStorage');\n`;
      } else if (apiData.basicAuthStorage.type === 'sessionStorage') {
        code += `  sessionStorage.setItem('${apiData.basicAuthStorage.usernameKey || 'basic_username'}', '${apiData.auth?.username || ''}');\n`;
        code += `  sessionStorage.setItem('${apiData.basicAuthStorage.passwordKey || 'basic_password'}', '${apiData.auth?.password || ''}');\n`;
        code += `  console.log('Basic Auth credentials stored in sessionStorage');\n`;
      } else if (apiData.basicAuthStorage.type === 'cookie') {
        code += `  document.cookie = '${apiData.basicAuthStorage.usernameKey || 'basic_username'}=${apiData.auth?.username || ''}; path=/; max-age=3600';\n`;
        code += `  document.cookie = '${apiData.basicAuthStorage.passwordKey || 'basic_password'}=${apiData.auth?.password || ''}; path=/; max-age=3600';\n`;
        code += `  console.log('Basic Auth credentials stored as cookies');\n`;
      }
    }
    
    code += `\n`;
    
    return code;
}