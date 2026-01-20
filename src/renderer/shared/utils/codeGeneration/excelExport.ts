// Excel export utility for code generation

/**
 * Generate function string for exporting database results to Excel
 * Similar to getExecuteApiRequestFunctionString()
 */
export function getExportDatabaseToExcelFunctionString(): string {
  return `async function exportDatabaseToExcel(result, stepIndex, queryString = '', queryIndex = null) {
  const XLSXModule = await import('xlsx');
  const XLSX = XLSXModule.default || XLSXModule;
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const databaseFolder = 'databases';
  if (!fs.existsSync(databaseFolder)) { fs.mkdirSync(databaseFolder, { recursive: true }); }
  const fileSuffix = queryIndex !== null && queryIndex !== undefined ? \`_\${queryIndex}\` : '';
  const excelFileName = \`\${databaseFolder}/Step_\${stepIndex}\${fileSuffix}.xlsx\`;
  const workbook = XLSX.utils.book_new();
  const dataRows = result.rows || [];
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(worksheet, [[\`Query: \${queryString || ''}\`]], { origin: 'A1' })
  let columnHeaders = [];
  if (dataRows.length > 0) { columnHeaders = Object.keys(dataRows[0]); }
  if (columnHeaders.length > 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A3' });
    if (dataRows.length > 0) {
      const dataValues = dataRows.map(row => columnHeaders.map(key => row[key] ?? ''));
      XLSX.utils.sheet_add_aoa(worksheet, dataValues, { origin: 'A4' });
    }
  }
  if (columnHeaders.length > 0) {
    const colWidths = [{ wch: 80 }];
    for (let i = 1; i <= columnHeaders.length; i++) { colWidths.push({ wch: 15 }); }
    worksheet['!cols'] = colWidths;
  } else {
    worksheet['!cols'] = [{ wch: 80 }];
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, excelFileName);
}
`;
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


