// Action code generation
// Ported from downloads/generate_action_code.txt

import { Action, ActionType } from '../../types/actions';
import { convertListSelectorsToLiteral } from './selectorFuncs';
import { generateConnectDbCode } from './dbConnectionCode';
import { generateAssertCode } from './assertCodeGenerator';
import { sanitizeJsString } from './base';
import { serializeApiRequest } from './apiRequestFuncs';
import { preProcessCookies } from './base';

export function generateActionCode(
  action: Action,
  index: number,
  followUpAction?: Action,
  filePathMapping?: Map<string, string>
): string {
  /**
   * Generate JS code for a single action.
   */
  const elements = action.elements;
  const selectors = elements ? convertListSelectorsToLiteral(elements) : [];
  const selector1st = selectors.length > 0 ? selectors[0] : null;
  const selector2nd = selectors.length > 1 ? selectors[1] : null;
  let pageIndex = 0;

  const actionType = action.action_type;
  let value: any = null;

  // Extract value from action_datas
  if (action.action_datas) {
    for (const actionData of action.action_datas) {
      if (actionData.value && typeof actionData.value === 'object' && 'value' in actionData.value) {
        if (actionData.value.value != null) {
          value = actionData.value.value;
          break;
        }
      }
    }

    // Extract page_index
    for (const actionData of action.action_datas) {
      if (actionData.value && typeof actionData.value === 'object' && 'page_index' in actionData.value) {
        if (actionData.value.page_index != null) {
          pageIndex = parseInt(String(actionData.value.page_index), 10);
          break;
        }
      }
    }
  }

  let connection = null;
  if (action.action_datas) {
    for (const actionData of action.action_datas) {
      if (actionData.statement) {
        connection = actionData.statement.connection;
        break;
      }
    }
  }

  let connectDbCode = '';
  let dbVar = 'db';
  if (connection) {
    const [code, varName] = generateConnectDbCode(connection);
    connectDbCode = code;
    dbVar = connection.db_type ? String(connection.db_type).toLowerCase() : 'db';
  }

  const currentPage = pageIndex === null || pageIndex === 0 ? '' : String(pageIndex);

  if (actionType === ActionType.navigate) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await page${currentPage}.goto('${value || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.click) {
    let followUpPageIndex: number | null = null;
    if (followUpAction && followUpAction.action_type === ActionType.page_create) {
      if (followUpAction.action_datas) {
        for (const actionData of followUpAction.action_datas) {
          if (actionData.value && typeof actionData.value === 'object' && 'opener_index' in actionData.value) {
            if (actionData.value.opener_index != null) {
              followUpPageIndex = pageIndex + 1;
              break;
            }
          }
        }
        if (followUpPageIndex) {
          for (const actionData of followUpAction.action_datas) {
            if (actionData.value && typeof actionData.value === 'object' && 'page_index' in actionData.value) {
              if (actionData.value.page_index != null) {
                followUpPageIndex = parseInt(String(actionData.value.page_index), 10);
                break;
              }
            }
          }
        }
      }
    }
    let code = '';
    code += `    await test.step('${index}. ${action.description || ''}', async () => {\n`;
    if (followUpPageIndex) {
      code += `      page${followUpPageIndex}Promise = page${currentPage}.waitForEvent('popup');\n`;
    }
    code += `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n`;
    code += `      await locator.click();\n`;
    code += `    })\n`;
    code += `    await bm.waitForAppIdle();\n`;
    return code;
  } else if (actionType === ActionType.input) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.fill('${value || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.select) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.selectOption('${value || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.checkbox) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.check();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.double_click) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.dblclick();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.right_click) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.click({ button: 'right' });\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.keydown || actionType === ActionType.keyup || actionType === ActionType.keypress) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.press('${value || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.assert) {
    return generateAssertCode(action, index);
  } else if (actionType === ActionType.upload) {
    const files: any[] = [];
    if (action.action_datas) {
      for (const data of action.action_datas) {
        if (data.file_upload) {
          files.push(data.file_upload);
        }
      }
    }
    // Use filePathMapping if available, otherwise fallback to original logic
    const paths = files.map(file => {
      if (filePathMapping) {
        // Try to find mapping by file_upload_id first, then file_path, then filename
        const mappingKey = file.file_upload_id || file.file_path || file.filename;
        if (mappingKey && filePathMapping.has(mappingKey)) {
          return filePathMapping.get(mappingKey)!;
        }
      }
      // Fallback to original logic
      return file.filename || file.file_path || '';
    }).filter(Boolean);
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.setInputFiles([${paths.map(p => `'${p}'`).join(', ')}]);\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.database_execution) {
    const actionData = action.action_datas && action.action_datas.length > 0 ? action.action_datas[0] : null;
    let query = '';
    let connectionForDb = null;
    if (actionData && actionData.statement) {
      // Handle both query and statement_text field names
      const statement = actionData.statement as any;
      query = statement.query || statement.statement_text || '';
      connectionForDb = statement.connection;
    }
    const [connectCode, dbVarName] = generateConnectDbCode(connectionForDb);
    const querySanitized = sanitizeJsString(query);
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      ${connectCode}` +
      `      var result = await ${dbVarName || 'db'}.query('${querySanitized}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.wait) {
    return (
      `    async function waitForTimeout(ms) {\n` +
      `        await new Promise(resolve => setTimeout(resolve, ms));\n` +
      `    }\n` +
      `    await waitForTimeout(${value || 0});\n`
    );
  } else if (actionType === ActionType.change) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.evaluate((el) => el.click());\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.drag_and_drop) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      second_locator = await resolveUniqueSelector(page${currentPage}, ${selector2nd || '[]'});\n` +
      `      await locator.dragTo(second_locator);\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.reload) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await page${currentPage}.reload();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.back) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await page${currentPage}.goBack();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.forward) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await page${currentPage}.goForward();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.scroll) {
    let x = 0;
    let y = 0;
    if (value) {
      const match = String(value).match(/X\s*:\s*(\d+)\s*,\s*Y\s*:\s*(\d+)/i);
      if (match) {
        x = parseInt(match[1], 10);
        y = parseInt(match[2], 10);
      }
    }
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selector1st || '[]'});\n` +
      `      await locator.evaluate((e) => { e.scrollTo(${x}, ${y}); });\n` +
      `    })\n` +
      `    await page${currentPage}.waitForLoadState('networkidle');\n`
    );
  } else if (actionType === ActionType.window_resize) {
    let width = 0;
    let height = 0;
    if (value) {
      const match = String(value).match(/Width\s*:\s*(\d+)\s*,\s*Height\s*:\s*(\d+)/i);
      if (match) {
        width = parseInt(match[1], 10);
        height = parseInt(match[2], 10);
      }
    }
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await page${currentPage}.setViewportSize({'width': ${width}, 'height': ${height}});\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.api_request) {
    let apiRequest = null;
    if (action.action_datas) {
      for (const ad of action.action_datas) {
        if (ad.api_request) {
          apiRequest = ad.api_request;
          break;
        }
      }
    }
    if (!apiRequest) {
      return '';
    }

    const apiPayload = serializeApiRequest(apiRequest);
    if (!apiPayload || Object.keys(apiPayload).length === 0) {
      return '';
    }

    const apiJson = JSON.stringify(apiPayload, null, 4);
    const apiJsonLines = apiJson.split('\n');
    const formattedLines: string[] = [];
    for (let lineIndex = 0; lineIndex < apiJsonLines.length; lineIndex++) {
      const prefix = lineIndex === 0 ? '      var apiData = ' : '      ';
      formattedLines.push(prefix + apiJsonLines[lineIndex]);
    }
    if (formattedLines.length > 0) {
      formattedLines[formattedLines.length - 1] = formattedLines[formattedLines.length - 1] + ';';
    }
    const apiDataLiteral = formattedLines.join('\n');
    const desc = sanitizeJsString(action.description || `API request ${index}`);

    return (
      `    await test.step('${index}. ${desc}', async () => {\n` +
      `${apiDataLiteral}\n` +
      `      await executeApiRequest(page${currentPage}, apiData);\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (actionType === ActionType.add_browser_storage) {
    let browserStorage = null;
    if (action.action_datas) {
      for (const actionData of action.action_datas) {
        if (actionData.browser_storage) {
          browserStorage = actionData.browser_storage;
          break;
        }
      }
    }
    if (!browserStorage) {
      return '';
    }
    
    const storageType = browserStorage.storage_type;
    let code = '';
    
    // Helper function to serialize browser storage value properly
    const serializeStorageValue = (value: any, defaultValue: string): string => {
      if (!value) {
        return defaultValue;
      }
      if (typeof value === 'string') {
        return value;
      }
      return JSON.stringify(value);
    };

    if (storageType === 'cookie') {
      const cookiesValue = serializeStorageValue(browserStorage.value, '[]');
      code = (
        `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
        `      cookies = ${cookiesValue};\n` +
        `      await context.addCookies(cookies);\n` +
        `      await page${currentPage}.reload();\n` +
        `    })\n` +
        `    await bm.waitForAppIdle();\n`
      );
    } else if (storageType === 'local_storage' || storageType === 'localStorage') {
      const localStorageValue = serializeStorageValue(browserStorage.value, '{}');
      code = (
        `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
        `      let localStorageData = ${localStorageValue};\n` +
        `      await page${currentPage}.evaluate((data) => {\n` +
        `        Object.entries(data).forEach(([key, value]) => localStorage.setItem(key, value));\n` +
        `      }, localStorageData);\n` +
        `      await page${currentPage}.reload();\n` +
        `    })\n` +
        `    await bm.waitForAppIdle();\n`
      );
    } else if (storageType === 'session_storage' || storageType === 'sessionStorage') {
      const sessionStorageValue = serializeStorageValue(browserStorage.value, '{}');
      code = (
        `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
        `      sessionStorage = ${sessionStorageValue};\n` +
        `      await page${currentPage}.evaluate((data) => {\n` +
        `        Object.entries(data).forEach(([key, value]) => sessionStorage.setItem(key, value));\n` +
        `      }, sessionStorage);\n` +
        `      await page${currentPage}.reload();\n` +
        `    })\n` +
        `    await bm.waitForAppIdle();\n`
      );
    }
    
    return preProcessCookies(code);
  } else if (actionType === ActionType.page_create) {
    let openerIndex: number | null = null;
    if (action.action_datas) {
      for (const actionData of action.action_datas) {
        if (actionData.value && typeof actionData.value === 'object' && 'opener_index' in actionData.value) {
          if (actionData.value.opener_index != null) {
            openerIndex = parseInt(String(actionData.value.opener_index), 10);
            break;
          }
        }
      }
    }
    
    if (openerIndex) {
      return (
        `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
        `      page${currentPage}=await page${currentPage}Promise;\n` +
        `      bm.trackRequests(page${currentPage});\n` +
        `    })\n` +
        `    await bm.waitForAppIdle();\n`
      );
    } else {
      let url: string | null = null;
      if (value) {
        url = String(value);
      }
      if (url && url.includes('http')) {
        return (
          `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
          `      page${currentPage}=await context.newPage();\n` +
          `      await page${currentPage}.goto('${url}');\n` +
          `      bm.trackRequests(page${currentPage});\n` +
          `    })\n` +
          `    await bm.waitForAppIdle();\n`
        );
      } else {
        return (
          `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
          `      page${currentPage}=await context.newPage();\n` +
          `      bm.trackRequests(page${currentPage});\n` +
          `    })\n` +
          `    await bm.waitForAppIdle();\n`
        );
      }
    }
  } else if (actionType === ActionType.page_close) {
    return (
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await page${currentPage}.close();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  }

  return '';
}
