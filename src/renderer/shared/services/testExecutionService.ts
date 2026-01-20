// Test execution service for running tests locally
import { CodeGenerator } from './codeGenerator';
import { EvidenceService } from './evidenceService';
import { FilePreprocessor } from './filePreprocessor';
import { FileService } from './fileService';
import { 
  ExecuteTestcaseOptions, 
  ExecuteCodeOptions, 
  TestExecutionResult, 
  EvidenceStatus,
  PlaywrightRunResult 
} from '../types/testExecution';
import { Action, BasicAuthentication, ActionType, ActionData } from '../types/actions';
import { ApiRouterLike } from '../utils/apiRequest';
import { decryptObject } from '../../main_app/services/encryption';

import * as fs from "fs";

// Simple UUID generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Generate hex UUID (without dashes)
function generateHexUUID(): string {
  return generateUUID().replace(/-/g, '');
}

// IPC interface for Electron
interface ElectronIPC {
  invoke(channel: string, ...args: any[]): Promise<any>;
}

// Get Electron IPC from window
function getElectronIPC(): ElectronIPC {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const electronAPI = (window as any).electronAPI;
    return {
      invoke: async (channel: string, ...args: any[]) => {
        if (channel.startsWith('playwright:')) {
          const method = channel.replace('playwright:', '');
          if (method === 'run-test') {
            return electronAPI.playwright.runTest(args[0]);
          }
        } else if (channel.startsWith('fs:')) {
          const method = channel.replace('fs:', '');
          switch (method) {
            case 'write-file':
              return electronAPI.fs.writeFile(args[0], args[1], args[2]);
            case 'read-file':
              return electronAPI.fs.readFile(args[0]);
            case 'delete-file':
              return electronAPI.fs.deleteFile(args[0]);
            case 'delete-directory':
              return electronAPI.fs.deleteDirectory(args[0]);
            case 'find-files':
              return electronAPI.fs.findFiles(args[0], args[1]);
            default:
              throw new Error(`Unknown fs method: ${method}`);
          }
        }
        throw new Error(`Unknown IPC channel: ${channel}`);
      }
    };
  }
  throw new Error('Electron API not available');
}

/**
 * Xác định các trường cần decrypt trong ActionData
 */
function getFieldsToDecryptForActionData(actionData: ActionData): string[] {
  const fields: string[] = [];
  
  // value.value - chỉ decrypt key "value" bên trong dictionary
  if (actionData.value && 
      typeof actionData.value === 'object' && 
      actionData.value.value !== undefined && 
      actionData.value.value !== null) {
      fields.push('value.value');
  }
  
  // Database connection
  if (actionData.statement?.connection) {
      const connection = actionData.statement.connection as any;
      if (connection.connection_name) {
          fields.push('statement.connection.connection_name');
      }
      if (connection.host) {
          fields.push('statement.connection.host');
      }
      if (connection.db_name) {
          fields.push('statement.connection.db_name');
      }
      if (connection.username) {
          fields.push('statement.connection.username');
      }
      if (connection.password) {
          fields.push('statement.connection.password');
      }
      if (connection.ca_certificate) {
          fields.push('statement.connection.ca_certificate');
      }
      if (connection.client_certificate) {
          fields.push('statement.connection.client_certificate');
      }
      if (connection.client_private_key) {
          fields.push('statement.connection.client_private_key');
      }
      if (connection.ssl_key_passphrase) {
          fields.push('statement.connection.ssl_key_passphrase');
      }
      if (connection.ssh_host) {
          fields.push('statement.connection.ssh_host');
      }
      if (connection.ssh_username) {
          fields.push('statement.connection.ssh_username');
      }
      if (connection.ssh_private_key) {
          fields.push('statement.connection.ssh_private_key');
      }
      if (connection.ssh_key_passphrase) {
          fields.push('statement.connection.ssh_key_passphrase');
      }
      if (connection.ssh_password) {
          fields.push('statement.connection.ssh_password');
      }
      if (connection.local_port) {
          fields.push('statement.connection.local_port');
      }
  }
  
  return fields;
}

/**
 * Xác định các trường cần decrypt trong ActionDataGeneration
 */
function getFieldsToDecryptForActionDataGeneration(gen: any): string[] {
  const fields: string[] = [];
  
  // value.value - chỉ decrypt key "value" bên trong dictionary
  if (gen.value && 
      typeof gen.value === 'object' && 
      gen.value.value !== undefined && 
      gen.value.value !== null) {
      fields.push('value.value');
  }
  
  return fields;
}

export class TestExecutionService {
  private codeGenerator: CodeGenerator;
  private evidenceService: EvidenceService;
  private apiRouter: ApiRouterLike;
  private ipc: ElectronIPC;

  constructor(
    apiRouter: ApiRouterLike,
    ipc?: ElectronIPC
  ) {
    this.codeGenerator = new CodeGenerator();
    this.evidenceService = new EvidenceService(apiRouter);
    this.apiRouter = apiRouter;
    this.ipc = ipc || getElectronIPC();
  }

  /**
   * Execute a testcase by ID
   */
  async executeTestcase(options: ExecuteTestcaseOptions): Promise<TestExecutionResult> {
    console.log('[TestExecutionService] Evidence ID', options.evidence_id);
    let tempFiles: string[] = [];
    try {
      /* console.log('[TestExecutionService] Options', options); */
      // Get actions and basic auth from API
      console.log('[TestExecutionService] Options', options);
      const { actions, basic_auth } = await this.getActionsByTestCase(options.testcase_id, options.project_id);
      console.log('[TestExecutionService] Actions', actions);

      // console.log('[TestExecutionService] Actions', actions);
      // console.log('[TestExecutionService] Basic auth', basic_auth);
      
      // Preprocess upload files: fetch from server and save to temp files
      const sandboxDir = await this.getSandboxDirectory();
      const fileService = new FileService(this.apiRouter);
      const preprocessingResult = await FilePreprocessor.preprocessFiles(
        actions,
        sandboxDir,
        fileService,
        this.ipc
      );
      tempFiles = preprocessingResult.tempFiles;
      
      // Generate code with file path mapping
      const code = this.codeGenerator.generateCode(
        basic_auth, 
        actions, 
        preprocessingResult.filePathMapping
      );
      
      if (!code) {
        // Cleanup temp files if no code generated
        await this.cleanupTempFiles(tempFiles);
        return {
          success: true,
          status: 'Draft',
          logs: 'No actions to execute',
          execution_time: 0,
        };
      }

      // Determine browser type
      let browserType = options.browser_type || options.test_suite_browser_type || 'chrome';

      // Execute code (pass temp files for cleanup)
      return await this.executeCode({
        code,
        browser_type: browserType,
        onSave: options.onSave !== false,
        evidence_id: options.evidence_id,
        tempFiles: tempFiles,
      });
    } catch (error) {
      // Cleanup temp files on error
      await this.cleanupTempFiles(tempFiles);
      return {
        success: false,
        status: 'Failed',
        logs: error instanceof Error ? error.message : 'Unknown error occurred',
        execution_time: 0,
      };
    }
  }

  /**
   * Execute generated code directly
   */
  async executeCode(options: ExecuteCodeOptions): Promise<TestExecutionResult> {
    const runId = generateHexUUID();
    let scriptPath: string | null = null;
    let outputDir: string | null = null;
    const tempFiles = options.tempFiles || [];

    options.onSave = true;

    try {
      // Update evidence status to "Running" if evidence_id is provided
      if (options.evidence_id && options.onSave) {
        await this.evidenceService.updateEvidenceStatus(options.evidence_id, 'Running');
      }

      // Setup sandbox directory
      const sandboxDir = await this.getSandboxDirectory();
      outputDir = `test-results/${runId}`;
      const fullOutputDir = `${sandboxDir}/${outputDir}`;

      // Replace <images-folder> placeholder in code
      let processedCode = options.code.replace(/<images-folder>/g, `./${outputDir}`);
      // Replace <database-execution-folder> placeholder in code
      processedCode = processedCode.replace(/<database-execution-folder>/g, `./${outputDir}/database-execution`);
      // Replace <api-execution-folder> placeholder in code
      processedCode = processedCode.replace(/<api-execution-folder>/g, `./${outputDir}/api-execution`);

      // Write test script
      const scriptFilename = `script_${generateHexUUID()}.spec.js`;
      scriptPath = `${sandboxDir}/${scriptFilename}`;

      // In browser environment, we need to use a different approach
      // For now, we'll write via IPC or use a file system API
      await this.writeFile(scriptPath, processedCode);

      // Determine browser type
      const browserType = options.browser_type || 'chrome';
      const browserName = this.mapBrowserTypeToName(browserType);

      // Run Playwright test via IPC
      const runResult: PlaywrightRunResult = await this.ipc.invoke('playwright:run-test', {
        scriptPath: scriptFilename,
        browserType: browserName,
        outputDir: outputDir,
        timeout: 600000, // 10 minutes
      });

      // Collect results
      const results = await this.collectTestResults(fullOutputDir, runResult);

      // Update evidence with results if onSave is true
      if (options.evidence_id && options.onSave) {
        await this.updateEvidenceWithResults(
          options.evidence_id,
          results.status,
          results.logs,
          results.video_url,
          results.images_urls,
          results.database_files_urls,
          results.api_files_urls
        );
      }

      return {
        success: results.success,
        status: results.status,
        logs: results.logs,
        video_url: results.video_url,
        images_urls: results.images_urls,
        database_files_urls: results.database_files_urls,
        api_files_urls: results.api_files_urls,
        execution_time: 0, // Could calculate from runResult if needed
      };
    } catch (error) {
      // Update evidence status to Failed if onSave is true
      if (options.evidence_id && options.onSave) {
        /* console.log('[TestExecutionService] Updating evidence status to Failed', error); */
        try {
          await this.evidenceService.updateEvidenceStatus(
            options.evidence_id,
            'Failed'
          );
        } catch (updateError) {
          /* console.error('Failed to update evidence status:', updateError); */
        }
      }

      return {
        success: false,
        status: 'Failed',
        logs: error instanceof Error ? error.message : 'Unknown error occurred',
        execution_time: 0,
      };
    } finally {
      // Cleanup
      if (scriptPath) {
        await this.deleteFile(scriptPath).catch(() => {});
      }
      if (outputDir) {
        const sandboxDir = await this.getSandboxDirectory();
        const fullOutputDir = `${sandboxDir}/${outputDir}`;
        await this.deleteDirectory(fullOutputDir).catch(() => {});
      }
      // Cleanup temp upload files
      await this.cleanupTempFiles(tempFiles);
    }
  }

  /**
   * Cleanup temporary upload files
   */
  private async cleanupTempFiles(tempFiles: string[]): Promise<void> {
    for (const filePath of tempFiles) {
      try {
        await this.deleteFile(filePath);
      } catch (error) {
        // Ignore errors during cleanup
        /* console.error(`Failed to delete temp file ${filePath}:`, error); */
      }
    }
  }

  /**
   * Collect test results from output directory
   */
  private async collectTestResults(
    outputDir: string,
    runResult: PlaywrightRunResult
  ): Promise<{
    success: boolean;
    status: EvidenceStatus;
    logs: string;
    video_url?: string;
    images_urls?: string[];
    database_files_urls?: string[];
    api_files_urls?: string[];
  }> {
    const status: EvidenceStatus = runResult.exitCode === 0 ? 'Passed' : 'Failed';
    const logs = [ runResult.stdout, runResult.stderr ].filter(Boolean).join('') || 
                 'The application is currently unable to execute code or encountered an internal error. Please check your configuration, try again later, or contact support for assistance.';

    // Find video file
    let videoUrl: string | undefined;
    try {
      const videoFiles = await this.findFiles(outputDir, ['.webm', '.mp4']);
      if (videoFiles.length > 0) {
        // Get the latest video file
        const latestVideo = videoFiles.sort((a, b) => {
          // Sort by modification time if available
          return 0; // Simplified - could enhance with file stats
        })[0];
        videoUrl = latestVideo;
      }
    } catch (error) {
      /* console.error('Error finding video file:', error); */
    }

    // Find image files
    let imagesUrls: string[] = [];
    try {
      const imageFiles = await this.findFiles(outputDir, ['.png', '.jpg', '.jpeg']);
      imagesUrls = imageFiles;
    } catch (error) {
      /* console.error('Error finding image files:', error); */
    }

    // Find database execution Excel files
    let databaseFilesUrls: string[] = [];
    try {
      const databaseExecutionDir = `${outputDir}/database-execution`;
      const excelFiles = await this.findFiles(databaseExecutionDir, ['.xlsx', '.xls']);
      databaseFilesUrls = excelFiles;
    } catch (error) {
      /* console.error('Error finding database execution files:', error); */
    }

    // Find API execution JSON files
    let apiFilesUrls: string[] = [];
    try {
      const apiExecutionDir = `${outputDir}/api-execution`;
      const jsonFiles = await this.findFiles(apiExecutionDir, ['.json']);
      apiFilesUrls = jsonFiles;
    } catch (error) {
      /* console.error('Error finding API execution files:', error); */
    }

    return {
      success: true,
      status,
      logs,
      video_url: videoUrl,
      images_urls: imagesUrls.length > 0 ? imagesUrls : undefined,
      database_files_urls: databaseFilesUrls.length > 0 ? databaseFilesUrls : undefined,
      api_files_urls: apiFilesUrls.length > 0 ? apiFilesUrls : undefined,
    };
  }

  /**
   * Update evidence with test results
   */
  private async updateEvidenceWithResults(
    evidenceId: string,
    status: EvidenceStatus,
    logs: string,
    videoUrl?: string,
    imagesUrls?: string[],
    databaseFilesUrls?: string[],
    apiFilesUrls?: string[]
  ): Promise<void> {
    const files: {
      video_file?: File;
      log_file?: File;
      image_files?: File[];
      database_files?: File[];
      api_files?: File[];
    } = {};

    // Create log file
    if (logs) {
      const logBlob = new Blob([logs], { type: 'text/plain' });
      files.log_file = new File([logBlob], 'logs.txt', { type: 'text/plain' });
    }

    // Load video file if exists
    if (videoUrl) {
      try {
        const videoFile = await this.loadFileAsBlob(videoUrl);
        if (videoFile) {
          const fileName = videoUrl.split('/').pop() || 'video.webm';
          files.video_file = new File([videoFile], fileName, { 
            type: videoFile.type || 'video/webm' 
          });
        }
      } catch (error) {
        /* console.error('Error loading video file:', error); */
      }
    }

    // Load image files if exist
    if (imagesUrls && imagesUrls.length > 0) {
      files.image_files = [];
      for (const imageUrl of imagesUrls) {
        try {
          const imageFile = await this.loadFileAsBlob(imageUrl);
          if (imageFile) {
            const fileName = imageUrl.split('/').pop() || 'image.png';
            files.image_files.push(new File([imageFile], fileName, { 
              type: imageFile.type || 'image/png' 
            }));
          }
        } catch (error) {
          /* console.error('Error loading image file:', error); */
        }
      }
    }

    // Load database execution Excel files if exist
    if (databaseFilesUrls && databaseFilesUrls.length > 0) {
      files.database_files = [];
      for (const databaseFileUrl of databaseFilesUrls) {
        try {
          const databaseFile = await this.loadFileAsBlob(databaseFileUrl);
          if (databaseFile) {
            const fileName = databaseFileUrl.split('/').pop() || 'database.xlsx';
            files.database_files.push(new File([databaseFile], fileName, { 
              type: databaseFile.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            }));
          }
        } catch (error) {
          /* console.error('Error loading database file:', error); */
        }
      }
    }

    // Load API execution JSON files if exist
    if (apiFilesUrls && apiFilesUrls.length > 0) {
      files.api_files = [];
      for (const apiFileUrl of apiFilesUrls) {
        try {
          const apiFile = await this.loadFileAsBlob(apiFileUrl);
          if (apiFile) {
            const fileName = apiFileUrl.split('/').pop() || 'api.json';
            files.api_files.push(new File([apiFile], fileName, { 
              type: apiFile.type || 'application/json' 
            }));
          }
        } catch (error) {
          /* console.error('Error loading API file:', error); */
        }
      }
    }

    await this.evidenceService.updateEvidence(evidenceId, status, files);
  }

  /**
   * Map browser type to Playwright project name
   */
  private mapBrowserTypeToName(browserType: string): string {
    const normalized = browserType.toLowerCase();
    const mapping: { [key: string]: string } = {
      chrome: 'Chrome',
      firefox: 'Firefox',
      edge: 'Edge',
      safari: 'Safari',
    };
    return mapping[normalized] || 'Chrome';
  }

  /**
   * Get actions by testcase ID
   */
  private async getActionsByTestCase(testcaseId: string, projectId?: string): Promise<{ actions: Action[], basic_auth: BasicAuthentication }> {
    const response = await this.apiRouter.request<{ actions: Action[], basic_auth: BasicAuthentication }>(
      `/actions/testcase/${testcaseId}`,
      { method: 'GET' }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to get actions');
    }

    let actions = response.data.actions || [];
    let basic_auth = response.data.basic_auth || null;

    // Decrypt metadata nếu có projectId và encryption key
    if (projectId) {
      try {
        const encryptionKey = await (window as any).encryptionStore?.getKey?.(projectId);
        if (encryptionKey) {
          // Decrypt basic_auth if present
          if (basic_auth && basic_auth.username && basic_auth.password) {
            try {
              basic_auth = await decryptObject(basic_auth, encryptionKey, ['username', 'password']);
            } catch (error) {
              /* console.error('[TestExecutionService] Basic auth decryption failed:', error); */
              // Keep original if decryption fails (backward compatibility)
            }
          }

          // Decrypt actions if present
          if (actions.length > 0) {
            actions = await Promise.all(
              actions.map(async (action) => {
                const decryptedAction = { ...action };

                // Decrypt action_datas
                if (action.action_datas && action.action_datas.length > 0) {
                  decryptedAction.action_datas = await Promise.all(
                    action.action_datas.map(async (actionData) => {
                      const fieldsToDecrypt = getFieldsToDecryptForActionData(actionData);
                      if (fieldsToDecrypt.length > 0) {
                        return await decryptObject(actionData, encryptionKey, fieldsToDecrypt);
                      }
                      return actionData;
                    })
                  );
                }

                // Decrypt action_data_generation
                if (action.action_data_generation && action.action_data_generation.length > 0) {
                  decryptedAction.action_data_generation = await Promise.all(
                    action.action_data_generation.map(async (gen) => {
                      const fieldsToDecrypt = getFieldsToDecryptForActionDataGeneration(gen);
                      if (fieldsToDecrypt.length > 0) {
                        return await decryptObject(gen, encryptionKey, fieldsToDecrypt);
                      }
                      return gen;
                    })
                  );
                }

                return decryptedAction;
              })
            );
        }
      }
    } catch (error) {
      /* console.error('[TestExecutionService] Decryption failed:', error); */
      // Fallback: trả về actions không decrypt nếu có lỗi
    }
    }

    return { actions, basic_auth };
  }

  /**
   * Get sandbox directory path
   */
  private async getSandboxDirectory(): Promise<string> {
    // In Electron, we can get this via IPC or use a fixed path
    // For now, return relative path that will be resolved in main process
    return 'sandbox';
  }

  /**
   * Write file (via IPC in Electron)
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    // In browser environment, we might need IPC
    // For Electron, we can use fs.writeFile via IPC
    await this.ipc.invoke('fs:write-file', filePath, content);
  }

  /**
   * Delete file (via IPC in Electron)
   */
  private async deleteFile(filePath: string): Promise<void> {
    await this.ipc.invoke('fs:delete-file', filePath).catch(() => {});
  }

  /**
   * Delete directory (via IPC in Electron)
   */
  private async deleteDirectory(dirPath: string): Promise<void> {
    await this.ipc.invoke('fs:delete-directory', dirPath).catch(() => {});
  }

  /**
   * Find files by extension
   */
  private async findFiles(dirPath: string, extensions: string[]): Promise<string[]> {
    const result = await this.ipc.invoke('fs:find-files', dirPath, extensions);
    return result?.files || [];
  }

  /**
   * Load file as Blob
   */
  private async loadFileAsBlob(filePath: string): Promise<Blob | null> {
    try {
      // In Electron, we can read file via IPC and convert to Blob
      const fileData = await this.ipc.invoke('fs:read-file', filePath);
      if (fileData && fileData.data) {
        // fileData should be ArrayBuffer or base64
        if (fileData.data instanceof ArrayBuffer) {
          return new Blob([fileData.data], { type: fileData.mimeType || 'application/octet-stream' });
        } else if (typeof fileData.data === 'string') {
          // Base64 string
          const binaryString = atob(fileData.data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return new Blob([bytes], { type: fileData.mimeType || 'application/octet-stream' });
        }
      }
    } catch (error) {
      /* console.error('Error loading file as blob:', error); */
    }
    return null;
  }
}
