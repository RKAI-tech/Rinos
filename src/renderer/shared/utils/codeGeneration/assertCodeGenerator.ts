// Assert code generation
// Ported from downloads/generate_assert_code.txt

import { Action, AssertType } from '../../types/actions';
import { convertListSelectorsToLiteral } from './selectorFuncs';
import { generateConnectDbCode } from './dbConnectionCode';
import { sanitizeJsString, escape } from './base';
import { serializeApiRequest } from './apiRequestFuncs';
import { generateExcelExportCode } from './excelExport';
import { generateApiExportCode } from './apiExport';

export function getListAiFunctions(actions: Action[]): string {
  let codeReturn = '\n';
  if (!Array.isArray(actions)) {
    return codeReturn;
  }
  for (const action of actions) {
    if (action.assert_type === AssertType.ai) {
      if (action.action_datas && Array.isArray(action.action_datas)) {
        for (const actionData of action.action_datas) {
          if (actionData.value && typeof actionData.value === 'object' && 'function_code' in actionData.value) {
            const functionCode = actionData.value.function_code;
            if (functionCode) {
              codeReturn += `${functionCode};\n`;
            }
          }
        }
      }
    }
  }
  return codeReturn;
}

export function generateAssertCode(action: Action, index: number): string {
  /**
   * Generate JS code for an assert action.
   */
  const elements = action.elements;
  const selectors = elements ? convertListSelectorsToLiteral(elements) : [];
  const assertType = action.assert_type;
  const values: any[] = [];

  if (action.action_datas && Array.isArray(action.action_datas)) {
    for (const actionData of action.action_datas) {
      if (actionData.value && typeof actionData.value === 'object' && 'value' in actionData.value) {
        const value = actionData.value.value;
        if (value) {
          values.push(value);
        }
      }
    }
  }

  const connections: any[] = [];
  const queries: string[] = [];
  const apiRequests: any[] = [];
  const apiRequestsPages: number[] = [];

  if (action.action_datas && Array.isArray(action.action_datas)) {
    for (const actionData of action.action_datas) {
      if (actionData.statement) {
        connections.push(actionData.statement.connection);
        // Handle both query and statement_text field names
        const statement = actionData.statement as any;
        queries.push(statement.query || statement.statement_text || '');
      }
      if (actionData.api_request) {
        apiRequests.push(actionData.api_request);
        if (actionData.value && typeof actionData.value === 'object' && 'page_index' in actionData.value) {
          if (actionData.value.page_index != null) {
            apiRequestsPages.push(parseInt(String(actionData.value.page_index), 10));
          } else {
            apiRequestsPages.push(0);
          }
        } else {
          apiRequestsPages.push(0);
        }
      }
    }
  }

  const functionCode: { function_name: string; function_code: string } = {
    function_name: '',
    function_code: '',
  };

  if (action.action_datas && Array.isArray(action.action_datas)) {
    for (const actionData of action.action_datas) {
      if (actionData.value && typeof actionData.value === 'object') {
        if ('function_name' in actionData.value) {
          functionCode.function_name = String(actionData.value.function_name || '');
        }
        if ('function_code' in actionData.value) {
          functionCode.function_code = String(actionData.value.function_code || '');
          break;
        }
      }
    }
  }

  let pageIndex = 0;
  if (action.action_datas && Array.isArray(action.action_datas)) {
    for (const actionData of action.action_datas) {
      if (actionData.value && typeof actionData.value === 'object' && 'page_index' in actionData.value) {
        if (actionData.value.page_index != null) {
          pageIndex = parseInt(String(actionData.value.page_index), 10);
          break;
        }
      }
    }
  }

  const currentPage = pageIndex === null || pageIndex === 0 ? '' : String(pageIndex);

  if (assertType === AssertType.toBeChecked) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeChecked();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeUnchecked) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).not.toBeChecked();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeDisabled) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}.${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeDisabled();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeEditable) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeEditable();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeReadOnly) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeReadOnly();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeEmpty) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeEmpty();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeEnabled) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeEnabled();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeFocused) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeFocused();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeHidden) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeHidden();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toBeVisible) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toBeVisible();\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toContainText) {
    let codeReturn = `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n`;
    codeReturn += `    await test.step('${index}. ${action.description || ''}', async () => {\n`;
    codeReturn += `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n`;
    codeReturn += `      await locator.scrollIntoViewIfNeeded();\n`;
    
    if (connections.length > 0) {
      const [connectDbCode, dbVar] = generateConnectDbCode(connections[0]);
      const queryStr = queries[0] || '';
      codeReturn += `      ${connectDbCode}`;
      codeReturn += `      var result = await ${dbVar}.query('${sanitizeJsString(queryStr)}');\n`;
      codeReturn += generateExcelExportCode('result', index, undefined, queryStr);
      codeReturn += `      var resultText = result.rows[0]?.${values[0] || ''};\n`;
      codeReturn += `      await ${dbVar}.end();\n`;
      codeReturn += `      await expect(locator).toContainText(String(resultText));\n`;
    } else if (apiRequests.length > 0 && apiRequests[0]) {
      const apiInfo = serializeApiRequest(apiRequests[0]);
      const endpoint = apiInfo.url || '';
      const method = apiInfo.method || '';
      codeReturn += `      var apiData = ${JSON.stringify(apiInfo, null, 4)};\n`;
      codeReturn += `      var response = await executeApiRequest(page${currentPage}, apiData);\n`;
      codeReturn += `      var responseJson = await response.json();\n`;
      codeReturn += `      var apiResult = {endpoint: '${sanitizeJsString(endpoint)}', method: '${method}', status: await response.status(), status_text: response.statusText(), headers: response.headers(), payload: responseJson};\n`;
      codeReturn += generateApiExportCode('apiResult', index);
      codeReturn += `      var responseText = responseJson['${values[0] || ''}'];\n`;
      codeReturn += `      await expect(locator).toContainText(String(responseText));\n`;
    } else {
      codeReturn += `      await expect(locator).toContainText('${values[0] || ''}');\n`;
    }
    codeReturn += `    })\n`;
    codeReturn += `    await bm.waitForAppIdle();\n`;
    return codeReturn;
  } else if (assertType === AssertType.toHaveCount) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toHaveCount('${values[0] || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toHaveRole) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toHaveRole('${values[0] || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toHaveCSS) {
    let cssProperty = '';
    let cssValue = '';
    if (action.action_datas && Array.isArray(action.action_datas)) {
      for (const actionData of action.action_datas) {
        if (actionData.value && typeof actionData.value === 'object') {
          if ('css_property' in actionData.value) {
            cssProperty = String(actionData.value.css_property || '');
          }
          if ('css_value' in actionData.value) {
            cssValue = String(actionData.value.css_value || '');
          }
          if (cssProperty && cssValue) {
            break;
          }
        }
      }
    }
    const cssPropertyEscaped = cssProperty ? escape(cssProperty) : "''";
    const cssValueEscaped = cssValue ? escape(cssValue) : "''";
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n` +
      `      await locator.scrollIntoViewIfNeeded();\n` +
      `      await expect(locator).toHaveCSS(${cssPropertyEscaped}, ${cssValueEscaped});\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.toHaveText) {
    let codeReturn = `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n`;
    codeReturn += `    await test.step('${index}. ${action.description || ''}', async () => {\n`;
    codeReturn += `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n`;
    codeReturn += `      await locator.scrollIntoViewIfNeeded();\n`;
    
    if (connections.length > 0) {
      const [connectDbCode, dbVar] = generateConnectDbCode(connections[0]);
      const queryStr = queries[0] || '';
      codeReturn += `      ${connectDbCode}`;
      codeReturn += `      var result = await ${dbVar}.query('${sanitizeJsString(queryStr)}');\n`;
      codeReturn += generateExcelExportCode('result', index, undefined, queryStr);
      codeReturn += `      var resultText = result.rows[0]?.${values[0] || ''};\n`;
      codeReturn += `      await ${dbVar}.end();\n`;
      codeReturn += `      await expect(locator).toHaveText(String(resultText));\n`;
    } else if (apiRequests.length > 0) {
      const apiInfo = serializeApiRequest(apiRequests[0]);
      const endpoint = apiInfo.url || '';
      const method = apiInfo.method || '';
      codeReturn += `      var apiData = ${JSON.stringify(apiInfo, null, 4)};\n`;
      codeReturn += `      var response = await executeApiRequest(page${currentPage}, apiData);\n`;
      codeReturn += `      var responseJson = await response.json();\n`;
      codeReturn += `      var apiResult = {endpoint: '${sanitizeJsString(endpoint)}', method: '${method}', status: await response.status(), status_text: response.statusText(), headers: response.headers(), payload: responseJson};\n`;
      codeReturn += generateApiExportCode('apiResult', index);
      codeReturn += `      var responseText = responseJson['${values[0] || ''}'];\n`;
      codeReturn += `      await expect(locator).toHaveText(String(responseText));\n`;
    } else {
      codeReturn += `      await expect(locator).toHaveText('${values[0] || ''}');\n`;
    }
    codeReturn += `    })\n`;
    codeReturn += `    await bm.waitForAppIdle();\n`;
    return codeReturn;
  } else if (assertType === AssertType.toHaveValue) {
    let codeReturn = `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n`;
    codeReturn += `    await test.step('${index}. ${action.description || ''}', async () => {\n`;
    codeReturn += `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n`;
    codeReturn += `      await locator.scrollIntoViewIfNeeded();\n`;
    
    if (connections.length > 0) {
      const [connectDbCode, dbVar] = generateConnectDbCode(connections[0]);
      const queryStr = queries[0] || '';
      codeReturn += `      ${connectDbCode}`;
      codeReturn += `      var result = await ${dbVar}.query('${sanitizeJsString(queryStr)}');\n`;
      codeReturn += generateExcelExportCode('result', index, undefined, queryStr);
      codeReturn += `      var resultText = result.rows[0]?.${values[0] || ''};\n`;
      codeReturn += `      await ${dbVar}.end();\n`;
      codeReturn += `      await expect(locator).toHaveValue(String(resultText));\n`;
    } else if (apiRequests.length > 0) {
      const apiInfo = serializeApiRequest(apiRequests[0]);
      const endpoint = apiInfo.url || '';
      const method = apiInfo.method || '';
      codeReturn += `      var apiData = ${JSON.stringify(apiInfo, null, 4)};\n`;
      codeReturn += `      var response = await executeApiRequest(page${currentPage}, apiData);\n`;
      codeReturn += `      var responseJson = await response.json();\n`;
      codeReturn += `      var apiResult = {endpoint: '${sanitizeJsString(endpoint)}', method: '${method}', status: await response.status(), status_text: response.statusText(), headers: response.headers(), payload: responseJson};\n`;
      codeReturn += generateApiExportCode('apiResult', index);
      codeReturn += `      var responseText = responseJson['${values[0] || ''}'];\n`;
      codeReturn += `      await expect(locator).toHaveValue(String(responseText));\n`;
    } else {
      codeReturn += `      await expect(locator).toHaveValue('${values[0] || ''}');\n`;
    }
    codeReturn += `    })\n`;
    codeReturn += `    await bm.waitForAppIdle();\n`;
    return codeReturn;
  } else if (assertType === AssertType.toHaveValues) {
    let codeReturn = `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n`;
    codeReturn += `    await test.step('${index}. ${action.description || ''}', async () => {\n`;
    codeReturn += `      locator = await resolveUniqueSelector(page${currentPage}, ${selectors[0] || '[]'});\n`;
    codeReturn += `      await locator.scrollIntoViewIfNeeded();\n`;
    
    if (connections.length > 0) {
      const [connectDbCode, dbVar] = generateConnectDbCode(connections[0]);
      const queryStr = queries[0] || '';
      codeReturn += `      ${connectDbCode}`;
      codeReturn += `      var result = await ${dbVar}.query('${sanitizeJsString(queryStr)}');\n`;
      codeReturn += generateExcelExportCode('result', index, undefined, queryStr);
      codeReturn += `      var resultText = result.rows[0]?.${values[0] || ''};\n`;
      codeReturn += `      await ${dbVar}.end();\n`;
      codeReturn += `      await expect(locator).toHaveValues(String(resultText));\n`;
    } else if (apiRequests.length > 0) {
      const apiInfo = serializeApiRequest(apiRequests[0]);
      const endpoint = apiInfo.url || '';
      const method = apiInfo.method || '';
      codeReturn += `      var apiData = ${JSON.stringify(apiInfo, null, 4)};\n`;
      codeReturn += `      var response = await executeApiRequest(page${currentPage}, apiData);\n`;
      codeReturn += `      var responseJson = await response.json();\n`;
      codeReturn += `      var apiResult = {endpoint: '${sanitizeJsString(endpoint)}', method: '${method}', status: await response.status(), status_text: response.statusText(), headers: response.headers(), payload: responseJson};\n`;
      codeReturn += generateApiExportCode('apiResult', index);
      codeReturn += `      var responseText = responseJson['${values[0] || ''}'];\n`;
      codeReturn += `      await expect(locator).toHaveValues(String(responseText));\n`;
    } else {
      codeReturn += `      await expect(locator).toHaveValues('${values[0] || ''}');\n`;
    }
    codeReturn += `    })\n`;
    codeReturn += `    await bm.waitForAppIdle();\n`;
    return codeReturn;
  } else if (assertType === AssertType.pageHasATitle) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await expect(page${currentPage}).toHaveTitle('${values[0] || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.pageHasAURL) {
    return (
      `    await page${currentPage}.screenshot({ path: '<images-folder>/Step_${index}.png' });\n` +
      `    await test.step('${index}. ${action.description || ''}', async () => {\n` +
      `      await expect(page${currentPage}).toHaveURL('${values[0] || ''}');\n` +
      `    })\n` +
      `    await bm.waitForAppIdle();\n`
    );
  } else if (assertType === AssertType.ai) {
    const elementsPages: Array<{ page_index: number; element_index: number }> = [];
    let codeReturn = '';
    
    if (action.action_datas && Array.isArray(action.action_datas)) {
      for (const actionData of action.action_datas) {
        if (actionData.value && typeof actionData.value === 'object' && 'page_index' in actionData.value && 'element_index' in actionData.value && actionData.value.element_index != null) {
          const pageElementIndex = parseInt(String(actionData.value.page_index || 0), 10);
          const elementIndex = parseInt(String(actionData.value.element_index), 10);
          elementsPages.push({
            page_index: pageElementIndex,
            element_index: elementIndex,
          });
        }
      }
    }
    
    for (const elementsPage of elementsPages) {
      let currentPageAi = '';
      if (elementsPage.page_index && elementsPage.page_index !== 0) {
        currentPageAi = String(elementsPage.page_index);
      }
      codeReturn += `    await page${currentPageAi}.screenshot({ path: '<images-folder>/Step_${index}_${elementsPage.element_index}.png' });\n`;
    }
    
    codeReturn += `    await test.step('${index}. ${action.description || ''}', async () => {\n`;
    
    if (selectors.length > 0) {
      codeReturn += `      let outerHTMLs = [];\n`;
      for (let idx = 0; idx < selectors.length; idx++) {
        let currentPageAi = '';
        if (idx >= elementsPages.length) {
          currentPageAi = '';
        } else if (elementsPages[idx].page_index && elementsPages[idx].page_index !== 0) {
          currentPageAi = String(elementsPages[idx].page_index);
        }
        codeReturn += `      locator = await resolveUniqueSelector(page${currentPageAi}, ${selectors[idx]}, ${index});\n`;
        codeReturn += `      await locator.scrollIntoViewIfNeeded();\n`;
        codeReturn += `      outerHTMLs.push(await locator.evaluate((el) => el.outerHTML));\n`;
      }
    }
    
    if (connections.length > 0) {
      codeReturn += `      let databaseResults = [];\n`;
      for (let idx = 0; idx < connections.length; idx++) {
        const [connectDbCode, dbVar] = generateConnectDbCode(connections[idx]);
        const queryStr = queries[idx] || '';
        codeReturn += `      ${connectDbCode}`;
        codeReturn += `      var result = await ${dbVar}.query('${sanitizeJsString(queryStr)}');\n`;
        codeReturn += generateExcelExportCode('result', index, idx, queryStr);
        codeReturn += `      var records = result.rows\n`;
        codeReturn += `      await ${dbVar}.end();\n`;
        codeReturn += `      databaseResults.push(records);\n`;
      }
    }
    
    if (apiRequests.length > 0) {
      codeReturn += `      let apiResults = [];\n`;
      for (let idx = 0; idx < apiRequests.length; idx++) {
        let currentPageAi = '';
        if (apiRequestsPages[idx] && apiRequestsPages[idx] !== 0) {
          currentPageAi = String(apiRequestsPages[idx]);
        }
        const apiInfo = serializeApiRequest(apiRequests[idx]);
        const endpoint = apiInfo.url || '';
        const method = apiInfo.method || '';
        codeReturn += `      var apiData = ${JSON.stringify(apiInfo, null, 4)};\n`;
        codeReturn += `      var response = await executeApiRequest(page${currentPageAi}, apiData);\n`;
        codeReturn += `      var responseJson = await response.json();\n`;
        codeReturn += `      var apiResult = {endpoint: '${sanitizeJsString(endpoint)}', method: '${method}', status: await response.status(), status_text: response.statusText(), headers: response.headers(),payload: responseJson};\n`;
        codeReturn += generateApiExportCode('apiResult', index, idx);
        codeReturn += `      apiResults.push(apiResult);\n`;
      }
    }
    
    const tempVar: string[] = [];
    if (selectors.length > 0) {
      tempVar.push('outerHTMLs');
    }
    if (connections.length > 0) {
      tempVar.push('databaseResults');
    }
    if (apiRequests.length > 0) {
      tempVar.push('apiResults');
    }
    const variables = tempVar.join(',');
    
    codeReturn += `      var expected = ${functionCode.function_name}(${variables});\n`;
    codeReturn += `      await expect(expected).toBe(true);\n`;
    codeReturn += `    })\n`;
    codeReturn += `    await bm.waitForAppIdle();\n`;
    return codeReturn;
  }

  return '';
}
