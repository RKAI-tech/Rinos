// Base utility functions for code generation
// Ported from downloads/base.txt

export function enumToStr(value: any, defaultValue: string | null = null, lower: boolean = true): string {
  if (value === null || value === undefined) {
    return defaultValue || '';
  }
  if (typeof value === 'object' && 'value' in value) {
    value = value.value;
  }
  const valueStr = String(value);
  return lower && valueStr !== null ? valueStr.toLowerCase() : valueStr;
}

export function sanitizeStr(text: any): string | null {
  if (text === null || text === undefined) {
    return null;
  }
  return String(text);
}

export function preProcessCookies(cookies: string): string {
  let processed = cookies.replace(/True/g, 'true').replace(/False/g, 'false');
  processed = processed.replace(/lax/g, 'Lax').replace(/strict/g, 'Strict');
  processed = processed.replace(/None/g, "'None'");
  processed = processed.replace(/no_restriction/g, "'None'");
  processed = processed.replace(/unspecified/g, "'None'");
  return processed;
}

export function escape(string: string): string {
  let escaped = string;

  // Escape backslashes first
  escaped = escaped.replace(/\\/g, '\\\\');

  // Escape single quotes
  escaped = escaped.replace(/'/g, "\\'");

  // Escape double quotes
  escaped = escaped.replace(/"/g, '\\"');

  // For complex selectors with special characters, wrap in quotes
  if (string.includes(':') || (string.includes('.') && /\d/.test(string))) {
    return `"${escaped}"`;
  } else {
    return `'${escaped}'`;
  }
}

export function sanitizeJsString(raw: string | null | undefined): string {
  /**
   * Prepare a string to be safely embedded inside a single-quoted JS string literal.
   * - Removes newlines (\r, \n) by replacing with a single space
   * - Escapes backslashes and both quote types
   */
  if (raw === null || raw === undefined) {
    return '';
  }
  const noNewlines = String(raw).replace(/[\r\n]+/g, ' ');
  const escaped = noNewlines.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
  return escaped;
}

export function getImportDb(actions: any[]): string {
  /**
   * Returns JS import statements for DB clients based on actions.
   */
  const importDb = new Set<string>();
  
  for (const action of actions) {
    if (action.action_datas) {
      for (const actionData of action.action_datas) {
        if (actionData.statement?.connection) {
          const dbType = enumToStr(actionData.statement.connection.db_type, '', true);
          if (dbType) {
            importDb.add(dbType);
          }
        }

        if (actionData.value && typeof actionData.value === 'object' && 'playwright_code' in actionData.value) {
          const code = actionData.value.playwright_code;
          if (typeof code === 'string') {
            if (code.includes('new PgClient')) {
              importDb.add('postgres');
            }
            if (code.includes('await mysql.createConnection')) {
              importDb.add('mysql');
            }
            if (code.includes('await sql.connect')) {
              importDb.add('mssql');
            }
          }
        }
      }
    }
  }

  let importDbCode = '';
  if (importDb.has('postgres')) {
    importDbCode += "import { Client as PgClient } from 'pg';\n";
  }
  if (importDb.has('mysql')) {
    importDbCode += "import mysql from 'mysql2/promise';\n";
  }
  if (importDb.has('mssql')) {
    importDbCode += "import sql from 'mssql';\n";
  }
  return importDbCode;
}
