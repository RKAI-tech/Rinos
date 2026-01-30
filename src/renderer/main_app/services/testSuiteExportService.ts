import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { TestSuiteService } from './testsuites';
import { ActionService } from './actions';
import { CodeGenerator } from '../../shared/services/codeGenerator';
import { Action, AssertType, ActionType } from '../../shared/types/actions';
import { TestCaseInSuite } from '../types/testsuites';

interface ElectronIPC {
  invoke(channel: string, ...args: any[]): Promise<any>;
}

// Get Electron IPC from window (similar to testExecutionService)
function getElectronIPC(): ElectronIPC {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const electronAPI = (window as any).electronAPI;
    return {
      invoke: async (channel: string, ...args: any[]) => {
        if (channel.startsWith('fs:')) {
          const method = channel.replace('fs:', '');
          switch (method) {
            case 'read-file':
              return electronAPI.fs.readFile(args[0]);
            default:
              throw new Error(`Unknown fs method: ${method}`);
          }
        }
        throw new Error(`Unknown IPC channel: ${channel}`);
      },
    };
  }
  // Fallback for non-Electron environment
  return {
    invoke: async () => {
      throw new Error('Electron IPC not available');
    },
  };
}

/**
 * Sanitize testcase name to valid filename
 */
function sanitizeFileName(name: string): string {
  // Remove special characters, keep only alphanumeric, spaces, hyphens, underscores
  let sanitized = name.replace(/[^a-zA-Z0-9\s\-_]/g, '');
  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');
  // Trim and replace spaces with nothing (camelCase style)
  sanitized = sanitized.trim();
  // Convert to PascalCase
  sanitized = sanitized
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  // If empty after sanitization, use a default name
  if (!sanitized) {
    sanitized = 'Testcase';
  }
  return sanitized;
}

/**
 * Extract expected value from assert action based on assert_type
 */
function extractExpectedValue(action: Action): string {
  if (action.action_type !== ActionType.assert || !action.assert_type) {
    return '';
  }

  const assertType = action.assert_type;
  const actionDatas = action.action_datas || [];

  // Extract value from action_datas
  let extractedValue: string = '';

  for (const actionData of actionDatas) {
    if (actionData.value && typeof actionData.value === 'object') {
      const valueObj: any = actionData.value;
      
      // Try different value paths
      const value = valueObj.value !== undefined ? valueObj.value :
                   valueObj.key !== undefined ? valueObj.key :
                   valueObj.column !== undefined ? valueObj.column :
                   null;

      if (value !== null && value !== undefined) {
        if (typeof value === 'string') {
          extractedValue = value;
        } else if (typeof value === 'object') {
          extractedValue = JSON.stringify(value);
        } else {
          extractedValue = String(value);
        }
        break;
      }

      // For AI assert, try function_name
      if (assertType === AssertType.ai && valueObj.function_name) {
        extractedValue = valueObj.function_name;
        break;
      }
    }
  }

  // Map assert types to expected value descriptions
  switch (assertType) {
    case AssertType.toHaveText:
    case AssertType.toContainText:
      return extractedValue ? `Text: "${extractedValue}"` : 'Text verification';
    
    case AssertType.toHaveValue:
      return extractedValue ? `Value: "${extractedValue}"` : 'Value verification';
    
    case AssertType.toHaveCSS:
      // Try to get both key (property) and value
      let cssProperty = '';
      let cssValue = '';
      for (const actionData of actionDatas) {
        if (actionData.value && typeof actionData.value === 'object') {
          const valueObj: any = actionData.value;
          if (valueObj.key) cssProperty = valueObj.key;
          if (valueObj.value) cssValue = valueObj.value;
        }
      }
      if (cssProperty && cssValue) {
        return `CSS ${cssProperty}: "${cssValue}"`;
      }
      return extractedValue ? `CSS: "${extractedValue}"` : 'CSS verification';
    
    case AssertType.pageHasATitle:
      return extractedValue ? `Page title: "${extractedValue}"` : 'Page title verification';
    
    case AssertType.pageHasAURL:
      return extractedValue ? `Page URL: "${extractedValue}"` : 'Page URL verification';
    
    case AssertType.toBeChecked:
      return 'Element should be checked';
    
    case AssertType.toBeUnchecked:
      return 'Element should be unchecked';
    
    case AssertType.toBeVisible:
      return 'Element should be visible';
    
    case AssertType.toBeHidden:
      return 'Element should be hidden';
    
    case AssertType.toBeEnabled:
      return 'Element should be enabled';
    
    case AssertType.toBeDisabled:
      return 'Element should be disabled';
    
    case AssertType.toBeFocused:
      return 'Element should be focused';
    
    case AssertType.toBeEditable:
      return 'Element should be editable';
    
    case AssertType.toBeReadOnly:
      return 'Element should be read-only';
    
    case AssertType.toBeEmpty:
      return 'Element should be empty';
    
    case AssertType.ai:
      return extractedValue || action.description || 'AI verification';
    
    default:
      return extractedValue || action.description || 'Verification';
  }
}

/**
 * Read file from sandbox directory via IPC
 */
async function readSandboxFile(filePath: string): Promise<string> {
  const ipc = getElectronIPC();
  try {
    const result = await ipc.invoke('fs:read-file', filePath);
    if (result.success && result.data) {
      // Decode base64 to string
      const binaryString = atob(result.data);
      return binaryString;
    }
    throw new Error(result.error || 'Failed to read file');
  } catch (error) {
    throw new Error(`Failed to read sandbox file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export class TestSuiteExportService {
  private suiteService: TestSuiteService;
  private actionService: ActionService;
  private codeGenerator: CodeGenerator;

  constructor() {
    this.suiteService = new TestSuiteService();
    this.actionService = new ActionService();
    this.codeGenerator = new CodeGenerator();
  }

  /**
   * Export scripts: Create zip file with sandbox folder and testcase code files
   */
  async exportScripts(
    suiteId: string,
    suiteName: string,
    projectId?: string
  ): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    try {
      // Get all testcases in suite
      const testcases: TestCaseInSuite[] = [];
      let currentPage = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.suiteService.searchTestCasesBySuite(
          suiteId,
          {
            page: currentPage,
            page_size: pageSize,
            q: null,
            sort_by: null,
            order: 'asc',
            level: null,
            status: null,
            browser_type: null,
          },
          projectId
        );

        if (!response.success || !response.data) {
          return {
            success: false,
            error: response.error || 'Failed to get testcases from suite',
          };
        }

        testcases.push(...(response.data.testcases || []));

        if (response.data.current_page >= response.data.total_pages) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Create zip file
      const zip = new JSZip();

      // Read sandbox files
      const sandboxFiles = [
        'sandbox/helpers.js',
        'sandbox/package.json',
        'sandbox/playwright.config.ts',
        'sandbox/reporter.ts',
      ];

      for (const filePath of sandboxFiles) {
        try {
          const content = await readSandboxFile(filePath);
          // Extract filename from path
          const fileName = filePath.replace('sandbox/', '');
          zip.file(fileName, content);
        } catch (error) {
          // Log error but continue (file might not exist)
          console.warn(`Failed to read ${filePath}:`, error);
        }
      }

      // Generate code for each testcase (place in root, not in testcases folder)
      for (const testcase of testcases) {
        try {
          // Get actions for testcase
          const actionsResponse = await this.actionService.getActionsByTestCase(
            testcase.testcase_id,
            undefined,
            undefined,
            projectId
          );

          if (!actionsResponse.success || !actionsResponse.data) {
            console.warn(`Failed to get actions for testcase ${testcase.testcase_id}`);
            continue;
          }

          const actions = actionsResponse.data.actions || [];
          const basicAuth = testcase.basic_authentication || null;

          // Generate code
          const code = this.codeGenerator.generateCode(
            basicAuth as any,
            actions as any[]
          );

          if (code) {
            // Sanitize testcase name for filename
            const fileName = sanitizeFileName(testcase.name);
            const fileExtension = '.js';
            let finalFileName = `${fileName}${fileExtension}`;

            // Ensure unique filename if duplicate
            let counter = 1;
            while (zip.file(finalFileName)) {
              finalFileName = `${fileName}_${counter}${fileExtension}`;
              counter++;
            }

            zip.file(finalFileName, code);
          }
        } catch (error) {
          console.warn(`Failed to generate code for testcase ${testcase.testcase_id}:`, error);
          // Continue with other testcases
        }
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Create filename
      const sanitizedSuiteName = sanitizeFileName(suiteName);
      const filename = `${sanitizedSuiteName}_scripts.zip`;

      return {
        success: true,
        blob: zipBlob,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export scripts',
      };
    }
  }

  /**
   * Export suite: Create Excel file with testcase statistics
   */
  async exportSuite(
    suiteId: string,
    suiteName: string,
    projectId?: string
  ): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    try {
      // Get all testcases in suite
      const testcases: TestCaseInSuite[] = [];
      let currentPage = 1;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.suiteService.searchTestCasesBySuite(
          suiteId,
          {
            page: currentPage,
            page_size: pageSize,
            q: null,
            sort_by: null,
            order: 'asc',
            level: null,
            status: null,
            browser_type: null,
          },
          projectId
        );

        if (!response.success || !response.data) {
          return {
            success: false,
            error: response.error || 'Failed to get testcases from suite',
          };
        }

        testcases.push(...(response.data.testcases || []));

        if (response.data.current_page >= response.data.total_pages) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Prepare Excel data
      const excelData: any[] = [];

      // Header row
      excelData.push([
        'No',
        'Name',
        'Description',
        'Step',
        'Expected',
        'Status',
        'Updated',
      ]);

      // Process each testcase
      for (let i = 0; i < testcases.length; i++) {
        const testcase = testcases[i];
        const row: any[] = [];

        // No
        row.push(i + 1);

        // Name
        row.push(testcase.name || '');

        // Description
        row.push(testcase.description || '');

        // Step: Get actions and extract descriptions with index
        let steps: string[] = [];
        let expectedValues: Array<{ index: number; value: string }> = [];

        try {
          const actionsResponse = await this.actionService.getActionsByTestCase(
            testcase.testcase_id,
            undefined,
            undefined,
            projectId
          );

          if (actionsResponse.success && actionsResponse.data) {
            const actions = actionsResponse.data.actions || [];

            // Extract steps with index (all actions with descriptions)
            // Track expected values with matching step index
            let stepIndex = 1;
            actions.forEach((action, actionIndex) => {
              const hasDescription = !!action.description;
              const isAssert = action.action_type === ActionType.assert;
              
              if (hasDescription) {
                steps.push(`${stepIndex}. ${action.description}`);
                
                // If this assert action has description, the expected value matches this step index
                if (isAssert) {
                  const expectedValue = extractExpectedValue(action as Action);
                  if (expectedValue.length > 0) {
                    expectedValues.push({ index: stepIndex, value: expectedValue });
                  }
                }
                
                stepIndex++;
              } else if (isAssert) {
                // Assert action without description - match with previous step index
                const expectedValue = extractExpectedValue(action as Action);
                if (expectedValue.length > 0) {
                  // Use the current stepIndex (which is the next available index)
                  // or the previous step index if no steps yet
                  const matchIndex = stepIndex > 1 ? stepIndex - 1 : 1;
                  expectedValues.push({ index: matchIndex, value: expectedValue });
                }
              }
            });
          }
        } catch (error) {
          console.warn(`Failed to get actions for testcase ${testcase.testcase_id}:`, error);
        }

        // Join steps with newline
        row.push(steps.join('\n') || '');

        // Expected: Join expected values with index matching Step
        const expectedText = expectedValues
          .map(ev => `${ev.index}. ${ev.value}`)
          .join('\n');
        row.push(expectedText || '');

        // Status
        row.push(testcase.status || 'Draft');

        // Updated: Format date
        let updatedDate = '';
        if (testcase.updated_at) {
          try {
            const date = new Date(testcase.updated_at);
            updatedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch (error) {
            updatedDate = testcase.updated_at;
          }
        }
        row.push(updatedDate);

        excelData.push(row);
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },   // No
        { wch: 30 }, // Name
        { wch: 40 }, // Description
        { wch: 50 }, // Step
        { wch: 40 }, // Expected
        { wch: 15 }, // Status
        { wch: 20 }, // Updated
      ];

      // Format header row: bold, center horizontal and vertical
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      headerRange.e.c = 6; // 7 columns (0-6)
      headerRange.e.r = 0; // Header is row 0

      for (let col = 0; col <= 6; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          font: { bold: true },
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true,
          },
        };
      }

      // Format data rows
      const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let row = 1; row <= dataRange.e.r; row++) {
        // Column A (No): center horizontal and vertical
        const cellNo = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (worksheet[cellNo]) {
          worksheet[cellNo].s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        }

        // Column B (Name): left top (default)
        const cellName = XLSX.utils.encode_cell({ r: row, c: 1 });
        if (worksheet[cellName]) {
          worksheet[cellName].s = {
            alignment: {
              horizontal: 'left',
              vertical: 'top',
              wrapText: true,
            },
          };
        }

        // Column C (Description): left top
        const cellDesc = XLSX.utils.encode_cell({ r: row, c: 2 });
        if (worksheet[cellDesc]) {
          worksheet[cellDesc].s = {
            alignment: {
              horizontal: 'left',
              vertical: 'top',
              wrapText: true,
            },
          };
        }

        // Column D (Step): left top
        const cellStep = XLSX.utils.encode_cell({ r: row, c: 3 });
        if (worksheet[cellStep]) {
          worksheet[cellStep].s = {
            alignment: {
              horizontal: 'left',
              vertical: 'top',
              wrapText: true,
            },
          };
        }

        // Column E (Expected): left top
        const cellExpected = XLSX.utils.encode_cell({ r: row, c: 4 });
        if (worksheet[cellExpected]) {
          worksheet[cellExpected].s = {
            alignment: {
              horizontal: 'left',
              vertical: 'top',
              wrapText: true,
            },
          };
        }

        // Column F (Status): center horizontal and vertical
        const cellStatus = XLSX.utils.encode_cell({ r: row, c: 5 });
        if (worksheet[cellStatus]) {
          worksheet[cellStatus].s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        }

        // Column G (Updated): center horizontal and vertical
        const cellUpdated = XLSX.utils.encode_cell({ r: row, c: 6 });
        if (worksheet[cellUpdated]) {
          worksheet[cellUpdated].s = {
            alignment: {
              horizontal: 'center',
              vertical: 'center',
            },
          };
        }
      }

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Testcases');

      // Generate Excel file as blob
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const excelBlob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Create filename
      const sanitizedSuiteName = sanitizeFileName(suiteName);
      const filename = `${sanitizedSuiteName}_suite.xlsx`;

      return {
        success: true,
        blob: excelBlob,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export suite',
      };
    }
  }
}
