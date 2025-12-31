import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    VariableListResponse,
    VariableCreateRequest,
    Variable,
    VariableSearchRequest,
    VariableSearchResponse
} from '../types/variables';
import { DefaultResponse } from '../types/api_responses';

export class VariableService {
    async getVariablesByProject(projectId: string): Promise<ApiResponse<VariableListResponse>> {
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        return await apiRouter.request<VariableListResponse>(`/variables/get_by_project/${projectId}`, {
            method: 'GET'
        });
    }

    async searchVariables(request: VariableSearchRequest): Promise<ApiResponse<VariableSearchResponse>> {
        if (!request.project_id) {
            return { success: false, error: 'Project ID is required for search' };
        }
        return await apiRouter.request<VariableSearchResponse>('/variables/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async createVariable(payload: VariableCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.project_id || !payload.statement_id || !payload.user_defined_name || !payload.original_name || !payload.value) {
            return { success: false, error: 'project_id, statement_id, user_defined_name, original_name, value are required' };
        }
        return await apiRouter.request<DefaultResponse>('/variables/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async deleteVariable(variableId: string): Promise<ApiResponse<DefaultResponse>> {
        if (!variableId) {
            return { success: false, error: 'variable_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/variables/${variableId}`, {
            method: 'DELETE'
        });
    }
}