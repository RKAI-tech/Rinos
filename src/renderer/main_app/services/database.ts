import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    DatabaseConnectionCreateRequest,
    DatabaseConnectionListRequest,
    DatabaseConnection,
    DatabaseConnectionListResponse,
    DatabaseConnectionSearchRequest,
    DatabaseConnectionSearchResponse
} from '../types/databases';
import { DefaultResponse } from '../types/api_responses';

export class DatabaseService {
    // Database connections
    async createDatabaseConnection(payload: DatabaseConnectionCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.project_id || !payload.username || !payload.password || !payload.host || !payload.port || !payload.db_name || !payload.db_type) {
            return {
                success: false,
                error: 'project_id, username, password, host, port, db_name, db_type are required'
            };
        }

        return await apiRouter.request<DefaultResponse>('/database-connections/create', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async deleteDatabaseConnection(connectionId: string): Promise<ApiResponse<DefaultResponse>> {
        if (!connectionId) {
            return { success: false, error: 'connection_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/database-connections/delete/${connectionId}`, {
            method: 'DELETE'
        });
    }

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

    async searchDatabaseConnections(request: DatabaseConnectionSearchRequest): Promise<ApiResponse<DatabaseConnectionSearchResponse>> {
        // Input validation
        if (!request.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        return await apiRouter.request<DatabaseConnectionSearchResponse>('/database-connections/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async getConnectionById(projectId: string, connectionId: string): Promise<ApiResponse<DatabaseConnection | null>> {
        if (!projectId || !connectionId) {
            return {
                success: false,
                error: 'project_id and connection_id are required',
                data: null
            };
        }

        const resp = await this.getDatabaseConnections({ project_id: projectId });
        if (resp.success && resp.data) {
            const connection = resp.data.connections.find(c => c.connection_id === connectionId);
            return {
                success: true,
                data: connection || null
            };
        }

        return {
            success: false,
            error: resp.error || 'Failed to get connection',
            data: null
        };
    }
}