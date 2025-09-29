import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    DatabaseConnectionListRequest,
    DatabaseConnectionListResponse,

} from '../types/databases';

export class DatabaseService {
    async getDatabaseConnections(payload: DatabaseConnectionListRequest): Promise<ApiResponse<DatabaseConnectionListResponse>> {
        if (!payload || !payload.project_id) {
            return {
                success: false,
                error: 'project_id is required'
            };
        }

        return await apiRouter.request<DatabaseConnectionListResponse>('/database-connections/get_list', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
  
}