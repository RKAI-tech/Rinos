import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    StatementRunResponse,
    RunWithoutCreateRequest,
    StatementResponse,
} from '../types/statements';
import { Connection } from '../types/actions';
import { connectionToIpcParams } from '../utils/databaseConnection';

export class StatementService {
    async runWithoutCreate(
        payload: RunWithoutCreateRequest, 
        connection?: Connection
    ): Promise<ApiResponse<StatementRunResponse>> {
        if (!payload || !payload.connection_id || !payload.query) {
            return { success: false, error: 'connection_id and query are required' };
        }
        
        // If Connection object is provided, use IPC for local execution
        if (connection) {
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
        
        // Fallback to API call if Connection object is not provided (for backward compatibility)
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