// Excel export utility for code generation

/**
 * Generate function string for exporting database results to Excel
 * Similar to getExecuteApiRequestFunctionString()
 */
export function getExportDatabaseToExcelFunctionString(): string {
  return "import { exportDatabaseToExcel } from './helpers.js';\n";
}

/**
 * Generate code to call exportDatabaseToExcel function
 * @param resultVar - Variable name containing query result (e.g., 'result')
 * @param stepIndex - Step index for file naming
 * @param queryIndex - Optional index for multiple queries in the same step (for AI assert type)
 * @param queryString - SQL query string to display in first row
 * @returns Generated code string to call export function
 */
export function generateExcelExportCode(
  resultVar: string,
  stepIndex: number,
  queryIndex?: number,
  queryString?: string
): string {
  const sanitizedQuery = queryString ? queryString.replace(/'/g, "\\'").replace(/\n/g, ' ') : '';
  const queryIndexParam = queryIndex !== undefined ? queryIndex : 'null';
  
  return `      await exportDatabaseToExcel(${resultVar}, ${stepIndex}, '${sanitizedQuery}', ${queryIndexParam});\n`;
}

/**
 * Check if any action uses database connection (for adding Excel import)
 */
export function needsExcelExport(actions: any[]): boolean {
  if (!Array.isArray(actions)) {
    return false;
  }
  for (const action of actions) {
    if (action.action_datas && Array.isArray(action.action_datas)) {
      for (const actionData of action.action_datas) {
        if (actionData.statement?.connection) {
          return true;
        }
      }
    }
  }
  return false;
}


