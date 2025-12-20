import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    StatementRunResponse,
    RunWithoutCreateRequest,
    StatementResponse,
} from '../types/statements';

export class StatementService {
    async runWithoutCreate(payload: RunWithoutCreateRequest): Promise<ApiResponse<StatementRunResponse>> {
        if (!payload || !payload.connection_id || !payload.query) {
            return { success: false, error: 'connection_id and query are required' };
        }
        return await apiRouter.request<StatementRunResponse>('/statements/run_without_create', {
            method: 'POST',
            body: JSON.stringify(payload)
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
}