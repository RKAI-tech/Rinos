// File preprocessing service
// Fetches files from server and saves them as temp files in sandbox directory

import { Action, ActionType, FileUpload } from '../types/actions';
import { FileService } from './fileService';

// IPC interface for Electron
interface ElectronIPC {
  invoke(channel: string, ...args: any[]): Promise<any>;
}

export interface FilePreprocessingResult {
  filePathMapping: Map<string, string>;
  tempFiles: string[];
}

export class FilePreprocessor {
  /**
   * Preprocess upload actions: fetch files from server and save to temp files
   * @param actions Array of actions to process
   * @param sandboxDir Sandbox directory path
   * @param fileService FileService instance for fetching files
   * @param ipc Electron IPC interface for file operations
   * @returns Mapping of file identifiers to temp file paths, and list of temp files
   */
  static async preprocessFiles(
    actions: Action[],
    sandboxDir: string,
    fileService: FileService,
    ipc: ElectronIPC
  ): Promise<FilePreprocessingResult> {
    const filePathMapping = new Map<string, string>();
    const tempFiles: string[] = [];
    const uploadsDir = `${sandboxDir}/uploads`;

    // Extract all upload actions
    const uploadActions: { action: Action; fileUpload: FileUpload }[] = [];
    for (const action of actions) {
      if (action.action_type === ActionType.upload && action.action_datas) {
        for (const actionData of action.action_datas) {
          if (actionData.file_upload) {
            uploadActions.push({
              action,
              fileUpload: actionData.file_upload
            });
          }
        }
      }
    }

    // If no upload actions, return empty result
    if (uploadActions.length === 0) {
      return { filePathMapping, tempFiles };
    }

    // Ensure uploads directory exists
    // Create directory by writing a dummy file then deleting it, or check if exists
    // For now, we'll create files directly - the directory will be created automatically by writeFile
    // But we need to ensure it exists first
    try {
      // Try to write a dummy file to ensure directory exists
      const dummyPath = `${uploadsDir}/.dummy`;
      await ipc.invoke('fs:write-file', dummyPath, '');
      await ipc.invoke('fs:delete-file', dummyPath).catch(() => {});
    } catch (error) {
      // Directory might not exist, but writeFile should handle it
      // If not, we'll let the error propagate
    }

    // Process each upload action
    for (const { fileUpload } of uploadActions) {
      try {
        // Get file content: use file_content if available, otherwise fetch from server using file_path
        let fileContent: string | undefined = fileUpload.file_content;

        if (!fileContent) {
          // If no file_content, try to fetch from server using file_path
          if (!fileUpload.file_path) {
            throw new Error(
              `Either file_path or file_content is required for file upload ${fileUpload.file_upload_id || 'unknown'}`
            );
          }

          const response = await fileService.getFileContent({
            file_path: fileUpload.file_path
          });

          if (!response.success || !response.data?.file_content) {
            throw new Error(
              response.error || 
              `Failed to fetch file content from server for path: ${fileUpload.file_path}`
            );
          }

          fileContent = response.data.file_content;
        }

        // Determine filename
        // Prefer filename, then file_path, then generate a default name
        let filename: string;
        if (fileUpload.filename) {
          filename = fileUpload.filename;
        } else if (fileUpload.file_path) {
          // Extract just the filename if file_path contains directory
          filename = fileUpload.file_path.split('/').pop() || fileUpload.file_path;
        } else {
          // If no filename or file_path, use file_upload_id or default name
          filename = fileUpload.file_upload_id || 'uploaded_file';
        }
        
        const baseFilename = filename;
        const tempFilePath = `${uploadsDir}/${baseFilename}`;

        // Write file via IPC with base64 encoding
        // The IPC handler will decode base64 to binary
        await ipc.invoke('fs:write-file', tempFilePath, fileContent, 'base64');

        // Store mapping
        // Use file_upload_id if available, otherwise use file_path, then filename as key
        const mappingKey = fileUpload.file_upload_id || fileUpload.file_path || fileUpload.filename || filename;
        filePathMapping.set(mappingKey, `uploads/${baseFilename}`);
        tempFiles.push(tempFilePath);
      } catch (error) {
        // Throw error immediately if file fetch fails
        throw new Error(
          `Failed to preprocess upload file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return { filePathMapping, tempFiles };
  }
}
