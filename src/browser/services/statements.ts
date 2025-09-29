import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    StatementRunResponse,
    RunWithoutCreateRequest,
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
}