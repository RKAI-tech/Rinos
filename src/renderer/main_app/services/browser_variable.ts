import { apiRouter } from './baseAPIRequest';
import { ApiResponse, DefaultResponse } from '../types/api_responses';
import {
    BrowserVariableCreateRequest,
    BrowserVariableUpdateRequest,
    BrowserVariableResponse,
    BrowserVariableListResponse,
    BrowserVariableSearchRequest,
    BrowserVariableSearchResponse
} from '../types/browser_variable';

export class BrowserVariableService {
    async createBrowserVariable(payload: BrowserVariableCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload?.project_id || !payload?.name || payload.value === undefined) {
            return { success: false, error: 'project_id, name, value are required' };
        }
        return await apiRouter.request<DefaultResponse>('/browser-variables/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getBrowserVariableById(browserVariableId: string): Promise<ApiResponse<BrowserVariableResponse>> {
        if (!browserVariableId) {
            return { success: false, error: 'browser_variable_id is required' };
        }
        return await apiRouter.request<BrowserVariableResponse>(`/browser-variables/${browserVariableId}`, {
            method: 'GET'
        });
    }

    async updateBrowserVariable(browserVariableId: string, payload: BrowserVariableUpdateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!browserVariableId) {
            return { success: false, error: 'browser_variable_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/browser-variables/${browserVariableId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

    async deleteBrowserVariable(browserVariableId: string): Promise<ApiResponse<DefaultResponse>> {
        if (!browserVariableId) {
            return { success: false, error: 'browser_variable_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/browser-variables/${browserVariableId}`, {
            method: 'DELETE'
        });
    }

    async getBrowserVariablesByProject(projectId: string, limit?: number, offset?: number): Promise<ApiResponse<BrowserVariableListResponse>> {
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        const query = new URLSearchParams();
        if (typeof limit === 'number') query.set('limit', String(limit));
        if (typeof offset === 'number') query.set('offset', String(offset));
        const qs = query.toString();
        const endpoint = `/browser-variables/get_by_project/${projectId}${qs ? `?${qs}` : ''}`;
        return await apiRouter.request<BrowserVariableListResponse>(endpoint, { method: 'GET' });
    }

    async searchBrowserVariables(request: BrowserVariableSearchRequest): Promise<ApiResponse<BrowserVariableSearchResponse>> {
        if (!request.project_id) {
            return { success: false, error: 'Valid project ID is required' };
        }
        return await apiRouter.request<BrowserVariableSearchResponse>('/browser-variables/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
}

export const browserVariableService = new BrowserVariableService();
