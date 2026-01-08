import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    RunCodeRequest,
    RunCodeResponse,
    UploadFileRequest,
    UploadFileResponse,
    FileDeleteRequest,
    FileDeleteResponse,
    ExecuteActionsResponse,
    ExecuteActionsRequest,
    GenerationCodeResponse,
    GenerationCodeRequest
} from '../types/executeScripts';
import { ActionBatch } from '../types/actions';
import { CodeGenerator } from '../../shared/services/codeGenerator';
import { Action as SharedAction, BasicAuthentication as SharedBasicAuth } from '../../shared/types/actions';

export class ExecuteScriptsService {
    async executeJavascript(payload: RunCodeRequest): Promise<ApiResponse<RunCodeResponse>> {
        if (!payload || typeof payload.code !== 'string') {
            return { success: false, error: 'code is required' };
        }
        return await apiRouter.request<RunCodeResponse>('/runcode/execute-javascript', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async uploadFile(request: UploadFileRequest): Promise<ApiResponse<UploadFileResponse>> {
        if (!request || typeof request.filename !== 'string' || typeof request.file_content !== 'string') {
            return { success: false, error: 'filename and file_content are required' };
        }
        return await apiRouter.request<UploadFileResponse>('/runcode/upload-file', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }

    async deleteFile(request: FileDeleteRequest): Promise<ApiResponse<FileDeleteResponse>> {
        if (!request || typeof request.filename !== 'string') {
            return { success: false, error: 'filename is required' };
        }
        return await apiRouter.request<FileDeleteResponse>('/runcode/delete-file', {
            method: 'DELETE',
            body: JSON.stringify(request)
        });
    }

    async executeActions(request: GenerationCodeRequest): Promise<ApiResponse<ExecuteActionsResponse>> {
        if (!request || typeof request.actions !== 'object') {
            return { success: false, error: 'actions is required' };
        }
        
        // Use local test execution service instead of API
        try {
            const { TestExecutionService } = await import('../../shared/services/testExecutionService');
            
            const testExecutionService = new TestExecutionService(
                apiRouter,
                undefined // Will use getElectronIPC() internally
            );
            
            // Preprocess upload files and generate code
            const { FilePreprocessor } = await import('../../shared/services/filePreprocessor');
            const { FileService } = await import('../../shared/services/fileService');
            const codeGenerator = new CodeGenerator();
            const sharedActions = request.actions as unknown as SharedAction[];
            const sharedBasicAuth = request.basic_auth as unknown as SharedBasicAuth | null;
            
            // Preprocess upload files: fetch from server and save to temp files
            const sandboxDir = 'sandbox'; // Use relative path, will be resolved in main process
            const fileService = new FileService(apiRouter);
            const ipc = (window as any).electronAPI ? {
                invoke: async (channel: string, ...args: any[]) => {
                    if (channel.startsWith('fs:')) {
                        const method = channel.replace('fs:', '');
                        const electronAPI = (window as any).electronAPI;
                        switch (method) {
                            case 'write-file':
                                return electronAPI.fs.writeFile(args[0], args[1], args[2]);
                            case 'delete-file':
                                return electronAPI.fs.deleteFile(args[0]);
                            default:
                                throw new Error(`Unknown fs method: ${method}`);
                        }
                    }
                    throw new Error(`Unknown IPC channel: ${channel}`);
                }
            } : undefined;
            
            if (!ipc) {
                return { success: false, error: 'Electron API not available' };
            }
            
            let tempFiles: string[] = [];
            try {
                const preprocessingResult = await FilePreprocessor.preprocessFiles(
                    sharedActions,
                    sandboxDir,
                    fileService,
                    ipc
                );
                tempFiles = preprocessingResult.tempFiles;
                
                // Generate code with file path mapping
                const code = codeGenerator.generateCode(
                    sharedBasicAuth, 
                    sharedActions, 
                    preprocessingResult.filePathMapping
                );
                
                if (!code) {
                    // Cleanup temp files if no code generated
                    for (const filePath of tempFiles) {
                        await ipc.invoke('fs:delete-file', filePath).catch(() => {});
                    }
                    return { success: false, error: 'Failed to generate code from actions' };
                }
                
                // Execute code
                const result = await testExecutionService.executeCode({
                    code,
                    browser_type: undefined, // Will use default
                    onSave: false,
                    evidence_id: request.evidence_id,
                    tempFiles: tempFiles,
                });
                
                return {
                    success: result.success,
                    data: {
                        success: result.success,
                        logs: result.logs,
                    } as ExecuteActionsResponse,
                    error: result.success ? undefined : result.logs,
                };
            } catch (error) {
                // Cleanup temp files on error
                for (const filePath of tempFiles) {
                    await ipc.invoke('fs:delete-file', filePath).catch(() => {});
                }
                throw error;
            }

            return {
                success: result.success,
                data: {
                    success: result.success,
                    logs: result.logs,
                } as ExecuteActionsResponse,
                error: result.success ? undefined : result.logs,
            };
        } catch (error) {
            console.error('[ExecuteScriptsService] Error executing actions locally:', error);
            // Fallback to API if local execution fails
            return await apiRouter.request<ExecuteActionsResponse>('/runcode/execute_actions', {
                method: 'POST',
                body: JSON.stringify(request)
            });
        }
    }
    async generateCode(request: GenerationCodeRequest): Promise<ApiResponse<GenerationCodeResponse>>{
        if (!request || typeof request.actions !== 'object') {
            return { success: false, error: 'actions is required' };
        }
        
        // Use local code generator service instead of API call
        try {
            const codeGenerator = new CodeGenerator();
            
            // Types are compatible enough to cast directly
            const sharedActions = request.actions as unknown as SharedAction[];
            const sharedBasicAuth = request.basic_auth as unknown as SharedBasicAuth | null;
            
            const code = codeGenerator.generateCode(sharedBasicAuth, sharedActions);
            
            return {
                success: true,
                data: {
                    code: code,
                },
            };
        } catch (error: any) {
            console.error('[ExecuteScriptsService] Error generating code:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate code',
            };
        }
    }
}