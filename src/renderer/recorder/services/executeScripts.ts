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
        return await apiRouter.request<ExecuteActionsResponse>('/runcode/execute_actions', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
    async generateCode(request: GenerationCodeRequest): Promise<ApiResponse<GenerationCodeResponse>>{
        if (!request || typeof request.actions !== 'object') {
            return { success: false, error: 'actions is required' };
        }
        return await apiRouter.request<GenerationCodeResponse>('/runcode/generate_code', {
            method: 'POST',
            body: JSON.stringify(request)
        });
    }
}