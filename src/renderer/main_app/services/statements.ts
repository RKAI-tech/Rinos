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
    GenerateRowQueryRequest,
    GenerateRowQueryResponse,
    RunWithoutCreateRequest,
    StatementSearchRequest,
    StatementSearchResponse,
} from '../types/statements';
import { DefaultResponse } from '../types/api_responses';
import { DatabaseService } from './database';
import { connectionToIpcParams } from '../utils/databaseConnection';

export class StatementService {
     // Statements (Queries)
     async createAndRunStatement(payload: StatementCreateRequest): Promise<ApiResponse<StatementRunResponse>> {
        if (!payload || !payload.connection_id || !payload.statement_text || !payload.name) {
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

    async runStatementById(statementId: string, projectId: string): Promise<ApiResponse<StatementRunByIdResponse>> {
        if (!statementId) {
            return { success: false, error: 'statement_id is required' };
        }
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        
        // Get statement details first
        const statementResp = await this.getStatementById(statementId);
        if (!statementResp.success || !statementResp.data) {
            return { success: false, error: statementResp.error || 'Failed to get statement details' };
        }
        
        const statement = statementResp.data;
        const connectionId = statement.connection_id;
        
        // Get connection details
        const databaseService = new DatabaseService();
        const connectionResp = await databaseService.getConnectionById(projectId, connectionId);
        if (!connectionResp.success || !connectionResp.data) {
            return { success: false, error: 'Connection not found' };
        }
        
        const connection = connectionResp.data;
        
        // Use IPC to execute query
        const electronAPI = (window as any).electronAPI;
        if (!electronAPI?.database) {
            return { success: false, error: 'Database API is not available' };
        }
        
        try {
            const ipcParams = await connectionToIpcParams(connection);
            const result = await electronAPI.database.executeQuery(ipcParams, statement.statement_text);
            
            if (!result.success) {
                return { success: false, error: result.error || 'Failed to execute query' };
            }
            
            // Convert IPC result to StatementRunByIdResponse format
            const data = result.data || [];
            const formattedData = data.map((row: any) => {
                const item: any = {};
                Object.keys(row).forEach(key => {
                    item[key] = String(row[key] ?? '');
                });
                return item;
            });
            
            return {
                success: true,
                data: {
                    status: 'Success',
                    elapsed_ms: 0, // IPC doesn't return elapsed time
                    data: formattedData,
                    affected_rows: 0, // IPC doesn't return affected rows
                    error: ''
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to execute query'
            };
        }
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

    async runWithoutCreate(payload: RunWithoutCreateRequest, projectId?: string): Promise<ApiResponse<StatementRunResponse>> {
        if (!payload || !payload.connection_id || !payload.query) {
            return { success: false, error: 'connection_id and query are required' };
        }
        
        // If projectId is provided, use IPC for local execution
        if (projectId) {
            const databaseService = new DatabaseService();
            const connectionResp = await databaseService.getConnectionById(projectId, payload.connection_id);
            if (!connectionResp.success || !connectionResp.data) {
                return { success: false, error: 'Connection not found' };
            }
            
            const connection = connectionResp.data;
            
            // Use IPC to execute query
            const electronAPI = (window as any).electronAPI;
            if (!electronAPI?.database) {
                return { success: false, error: 'Database API is not available' };
            }
            
            try {
                const ipcParams = await connectionToIpcParams(connection);
                const result = await electronAPI.database.executeQuery(ipcParams, payload.query);
                
                if (!result.success) {
                    return { success: false, error: result.error || 'Failed to execute query' };
                }
                
                // Convert IPC result to StatementRunResponse format
                const data = result.data || [];
                const formattedData = data.map((row: any) => {
                    const item: any = {};
                    Object.keys(row).forEach(key => {
                        item[key] = String(row[key] ?? '');
                    });
                    return item;
                });
                
                return {
                    success: true,
                    data: {
                        status: 'Success',
                        elapsed_ms: 0, // IPC doesn't return elapsed time
                        data: formattedData,
                        affected_rows: 0, // IPC doesn't return affected rows
                        error: ''
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to execute query'
                };
            }
        }
        
        // Fallback to API call if projectId is not provided (for backward compatibility)
        return await apiRouter.request<StatementRunResponse>('/statements/run_without_create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async searchStatements(request: StatementSearchRequest): Promise<ApiResponse<StatementSearchResponse>> {
        if (!request.project_id) {
            return { success: false, error: 'Project ID is required for search' };
        }
        return await apiRouter.request<StatementSearchResponse>('/statements/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
}