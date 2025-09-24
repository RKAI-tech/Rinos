import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    DatabaseConnectionCreateRequest,
    DatabaseConnectionListRequest,
    DatabaseConnection,
    DatabaseConnectionListResponse,
    StatementCreateRequest,
    StatementRunResponse,
    Statement,
    StatementListResponse,
    StatementResponse,
    StatementRunByIdResponse,
    StatementDeleteResponse,
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
}