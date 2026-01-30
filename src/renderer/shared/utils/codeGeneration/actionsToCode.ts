// Main entry point for code generation
// Ported from downloads/actions_to_code.txt

import { Action, ActionType } from '../../types/actions';
import { BasicAuthentication } from '../../types/actions';
import { checkNeedResolveUniqueSelector, checkNeedForceAction } from './selectorFuncs';
import { getImportDb } from './base';
import { checkNeedConnectDb } from './dbConnectionCode';
import { generateActionCode } from './actionCodeGenerator';
import { needsApiRequestSupport } from './apiRequestFuncs';
import { getListAiFunctions } from './assertCodeGenerator';
import { getBasicHttpAuthCode } from './basicHttpAuth';
import { needsExcelExport } from './excelExport';
import { needsApiExport } from './apiExport';

export function actionsToCode(
  basicAuth: BasicAuthentication | null | undefined, 
  actions: Action[],
  filePathMapping?: Map<string, string>
): string {
  /**
   * Generate the full JS test code for actions.
   */
  
  // Normalize action_datas structure (handle database_connection -> connection)
  for (const action of actions) {
    if (action.action_datas && Array.isArray(action.action_datas)) {
      for (const actionData of action.action_datas) {
        if (actionData.statement) {
          // Handle both database_connection and connection
          const statement = actionData.statement as any;
          if (statement.database_connection && !statement.connection) {
            statement.connection = statement.database_connection;
          }
        }
      }
    }
  }

  let code = '';
  code += "import { test, expect } from '@playwright/test';\n";
  const helperImports = new Set<string>();
  helperImports.add('BrowserManager');
  
  if (checkNeedConnectDb(actions)) {
    code += getImportDb(actions);
  }
  
  if (checkNeedResolveUniqueSelector(actions)) {
    helperImports.add('resolveUniqueSelector');
  }

  if (checkNeedForceAction(actions)) {
    helperImports.add('forceAction');
  }
  
  if (needsApiRequestSupport(actions)) {
    helperImports.add('executeApiRequest');
  }
  
  if (needsExcelExport(actions)) {
    helperImports.add('exportDatabaseToExcel');
  }
  
  if (needsApiExport(actions)) {
    helperImports.add('exportApiToJson');
  }
  
  if (helperImports.size > 0) {
    code += `import { ${Array.from(helperImports).join(', ')} } from './helpers.js';`;
  }
  
  const aiFunctions = getListAiFunctions(actions);
  if (aiFunctions) {
    code += '\n';
    code += aiFunctions;
  }
  
  code += getBasicHttpAuthCode(basicAuth);
  code += "test('Generated Test', async ({ context, page}) => {\n";
  code += "    const bm = new BrowserManager();\n";
  code += "    bm.trackRequests(page);\n";
  code += "    page.setDefaultTimeout(30000);\n";
  code += "    let result; let cookies; let locator; let element;\n";
  
  // Declare page variables
  const pageIndexs: number[] = [];
  const openerPageIndexes: number[] = [];
  
  for (const action of actions) {
    if (action.action_type === ActionType.page_create) {
      if (action.action_datas && Array.isArray(action.action_datas)) {
        for (const actionData of action.action_datas) {
          if (actionData.value && typeof actionData.value === 'object' && 'opener_index' in actionData.value && actionData.value.opener_index != null) {
            if (actionData.value.page_index != null && 
                actionData.value.page_index !== 0 && 
                !openerPageIndexes.includes(parseInt(String(actionData.value.page_index), 10))) {
              openerPageIndexes.push(parseInt(String(actionData.value.page_index), 10));
            }
          }
        }
      }
    }
  }
  
  for (const action of actions) {
    if (action.action_type === ActionType.page_create) {
      if (action.action_datas && Array.isArray(action.action_datas)) {
        for (const actionData of action.action_datas) {
          if (actionData.value && typeof actionData.value === 'object' && 'page_index' in actionData.value) {
            if (actionData.value.page_index != null && 
                actionData.value.page_index !== 0 && 
                !pageIndexs.includes(parseInt(String(actionData.value.page_index), 10))) {
              pageIndexs.push(parseInt(String(actionData.value.page_index), 10));
            }
          }
        }
      }
    }
  }
  
  for (const pageIndex of pageIndexs) {
    code += `    let page${pageIndex};\n`;
  }
  
  for (const openerPageIndex of openerPageIndexes) {
    code += `    let page${openerPageIndex}Promise ;\n`;
  }
  
  // Generate code for each action
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const followUpAction = i < actions.length - 1 ? actions[i + 1] : undefined;
    code += generateActionCode(action, i + 1, followUpAction, filePathMapping);
  }
  
  code += "});\n";
  return code;
}
