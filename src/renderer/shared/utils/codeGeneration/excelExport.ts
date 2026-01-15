// Excel export utility for code generation

/**
 * Generate function string for exporting database results to Excel
 * Similar to getExecuteApiRequestFunctionString()
 */
export function getExportDatabaseToExcelFunctionString(): string {
  return `async function exportDatabaseToExcel(result, stepIndex, queryString = '', queryIndex = null) {
  // Dynamic imports for ES modules
  const XLSXModule = await import('xlsx');
  const XLSX = XLSXModule.default || XLSXModule;
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const databaseFolder = '<database-execution-folder>';
  
  // Ensure database folder exists
  if (!fs.existsSync(databaseFolder)) {
    fs.mkdirSync(databaseFolder, { recursive: true });
  }
  
  // Generate file name
  const fileSuffix = queryIndex !== null && queryIndex !== undefined ? \`_\${queryIndex}\` : '';
  const excelFileName = \`\${databaseFolder}/Step_\${stepIndex}_database\${fileSuffix}.xlsx\`;
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const dataRows = result.rows || [];
  
  // Create worksheet manually to have:
  // Row 1: Query: <<query string>>
  // Row 2: (empty)
  // Row 3: Column headers (field names)
  // Row 4+: Data rows
  
  // Initialize worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  
  // Row 1: Query row
  XLSX.utils.sheet_add_aoa(worksheet, [[\`Query: \${queryString || ''}\`]], { origin: 'A1' });
  
  // Row 2: Empty row (skip)
  
  // Get column headers from first data row if available
  let columnHeaders = [];
  if (dataRows.length > 0) {
    columnHeaders = Object.keys(dataRows[0]);
  }
  
  // Row 3: Column headers
  if (columnHeaders.length > 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A3' });
    
    // Row 4+: Data rows
    if (dataRows.length > 0) {
      const dataValues = dataRows.map(row => columnHeaders.map(key => row[key] ?? ''));
      XLSX.utils.sheet_add_aoa(worksheet, dataValues, { origin: 'A4' });
    }
  }
  
  // Set column widths: Query column wider, others default
  if (columnHeaders.length > 0) {
    // First column (Query) is wider, rest are default
    const colWidths = [{ wch: 80 }];
    for (let i = 1; i <= columnHeaders.length; i++) {
      colWidths.push({ wch: 15 });
    }
    worksheet['!cols'] = colWidths;
  } else {
    // Only query row, set Query column width
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


