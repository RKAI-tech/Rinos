import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { RunCodeRequest, RunCodeResponse } from '../types/executeScripts';

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
}