// API export utility for code generation

/**
 * Generate function string for exporting API request/response to JSON
 * Similar to getExportDatabaseToExcelFunctionString()
 */
export function getExportApiToJsonFunctionString(): string {
  return `async function exportApiToJson(apiResult, stepIndex, requestIndex = null) {
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const pathModule = await import('path');
  const path = pathModule.default || pathModule;
  const apiFolder = 'apis';  
  if (!fs.existsSync(apiFolder)) { fs.mkdirSync(apiFolder, { recursive: true }); }
  const fileSuffix = requestIndex !== null && requestIndex !== undefined ? \`_\${requestIndex}\` : '';
  const jsonFileName = \`\${apiFolder}/Step_\${stepIndex}\${fileSuffix}.json\`;
  let baseUrl = '';
  let apiPath = '';
  let queryParams = {};
  const fullUrl = apiResult.endpoint || '';
  try {
    const urlObj = new URL(fullUrl);
    baseUrl = urlObj.origin;
    apiPath = urlObj.pathname;
    queryParams = Object.fromEntries(urlObj.searchParams);
  } catch (e) {
    baseUrl = fullUrl;
    apiPath = '';
  }
  const apiData = {
    step_index: stepIndex,
    request_index: requestIndex,
    timestamp: new Date().toISOString(),
    request: {
      method: apiResult.method || 'GET',
      url: fullUrl,
      base_url: baseUrl,
      path: apiPath,
      query_params: queryParams,
      headers: apiResult.headers || {},
    },
    response: {
      status: apiResult.status || 0,
      status_text: apiResult.status_text || '',
      headers: apiResult.response_headers || apiResult.headers || {},
      body: {
        payload: apiResult.payload || null,
      },
      duration_ms: apiResult.duration_ms || 0
    },
  };
  fs.writeFileSync(jsonFileName, JSON.stringify(apiData, null, 2), 'utf8');
}
`;
}

/**
 * Generate code to call exportApiToJson function
 * @param apiResultVar - Variable name containing API result (e.g., 'apiResult')
 * @param stepIndex - Step index for file naming
 * @param requestIndex - Optional index for multiple requests in the same step (for AI assert type)
 * @returns Generated code string to call export function
 */
export function generateApiExportCode(
  apiResultVar: string,
  stepIndex: number,
  requestIndex?: number
): string {
  const requestIndexParam = requestIndex !== undefined ? requestIndex : 'null';
  
  return `      await exportApiToJson(${apiResultVar}, ${stepIndex}, ${requestIndexParam});\n`;
}

/**
 * Check if any action uses API request (for adding API export function)
 */
export function needsApiExport(actions: any[]): boolean {
  if (!Array.isArray(actions)) {
    return false;
  }
  for (const action of actions) {
    if (action.action_datas && Array.isArray(action.action_datas)) {
      for (const actionData of action.action_datas) {
        if (actionData.api_request) {
          return true;
        }
      }
    }
  }
  return false;
}

