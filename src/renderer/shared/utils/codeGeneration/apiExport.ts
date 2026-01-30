// API export utility for code generation

/**
 * Generate function string for exporting API request/response to JSON
 * Similar to getExportDatabaseToExcelFunctionString()
 */
export function getExportApiToJsonFunctionString(): string {
  return "import { exportApiToJson } from './helpers.js';\n";
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

