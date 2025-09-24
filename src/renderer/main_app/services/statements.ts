import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    StatementCreateRequest,
    StatementRunResponse,
    Statement,
    StatementListResponse,
    StatementResponse,
    StatementRunByIdResponse,
    StatementDeleteResponse,
} from '../types/statements';
import { DefaultResponse } from '../types/api_responses';

export class StatementService {
     // Statements (Queries)
     async createAndRunStatement(payload: StatementCreateRequest): Promise<ApiResponse<StatementRunResponse>> {
        if (!payload || !payload.connection_id || !payload.statement_text || !payload.name || !payload.description) {
            return { success: false, error: 'connection_id and statement_text are required' };
        }
        return await apiRouter.request<StatementRunResponse>('/statements/create_and_run', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getStatementsByConnection(connectionId: string): Promise<ApiResponse<StatementListResponse>> {
        if (!connectionId) {
            return { success: false, error: 'connection_id is required' };
        }
        return await apiRouter.request<StatementListResponse>(`/statements/get_by_connection/${connectionId}`, {
            method: 'GET'
        });
    }

    async deleteStatement(statementId: string): Promise<ApiResponse<StatementDeleteResponse>> {
        if (!statementId) {
            return { success: false, error: 'statement_id is required' };
        }
        return await apiRouter.request<StatementDeleteResponse>(`/statements/${statementId}`, {
            method: 'DELETE'
        });
    }

    async runStatementById(statementId: string): Promise<ApiResponse<StatementRunByIdResponse>> {
        if (!statementId) {
            return { success: false, error: 'statement_id is required' };
        }
        return await apiRouter.request<StatementRunByIdResponse>(`/statements/run/${statementId}`, {
            method: 'POST'
        });
    }

    async getStatementById(statementId: string): Promise<ApiResponse<StatementResponse>> {
        if (!statementId) {
            return { success: false, error: 'statement_id is required' };
        }
        return await apiRouter.request<StatementResponse>(`/statements/get_by_id/${statementId}`, {
            method: 'GET'
        });
    }

    async getStatementsByProject(projectId: string): Promise<ApiResponse<StatementListResponse>> {
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        return await apiRouter.request<StatementListResponse>(`/statements/get_by_project/${projectId}`, {
            method: 'GET'
        });
    }
}