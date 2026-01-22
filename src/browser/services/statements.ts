import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    StatementRunResponse,
    RunWithoutCreateRequest,
} from '../types/statements';
import { Connection } from '../types';
import { executeQuery } from '../../main/services/databaseService';
import { cleanupTempFiles, connectionToIpcParams } from '../utils/databaseConnection';

export class StatementService {
    async runWithoutCreate(
        payload: RunWithoutCreateRequest,
        connection?: Connection
    ): Promise<ApiResponse<StatementRunResponse>> {
        if (!payload || !payload.connection_id || !payload.query) {
            return { success: false, error: 'connection_id and query are required' };
        }

        if (connection) {
            const { params, tempFiles } = connectionToIpcParams(connection);
            try {
                const result = await executeQuery(params, payload.query);
                if (!result.success) {
                    return { success: false, error: result.error || 'Failed to execute query' };
                }

                const data = (result.data || []).map((row: any) => {
                    const item: any = {};
                    Object.keys(row || {}).forEach(key => {
                        item[key] = String(row?.[key] ?? '');
                    });
                    return item;
                });

                return {
                    success: true,
                    data: {
                        status: 'Success',
                        elapsed_ms: 0,
                        data: data as any,
                        affected_rows: 0,
                        error: ''
                    }
                };
            } catch (error) {
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to execute query'
                };
            } finally {
                cleanupTempFiles(tempFiles);
            }
        }

        return await apiRouter.request<StatementRunResponse>('/statements/run_without_create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
}