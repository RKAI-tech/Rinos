import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    DatabaseConnectionCreateRequest,
    DatabaseConnectionUpdateRequest,
    DatabaseConnectionListRequest,
    DatabaseConnection,
    DatabaseConnectionListResponse,
    DatabaseConnectionSearchRequest,
    DatabaseConnectionSearchResponse
} from '../types/databases';
import { DefaultResponse } from '../types/api_responses';
import { encryptObject, decryptObject } from './encryption';

/**
 * Xác định các trường cần mã hóa trong DatabaseConnection
 * Các trường không mã hóa: project_id, db_type, security_type, ssl_mode, ssh_auth_method, connection_id, port
 */
function getFieldsToEncryptForDatabaseConnection(): string[] {
    return [
        'connection_name',
        'db_name',
        'host',
        'username',
        'password',
        'ca_certificate',
        'client_certificate',
        'client_private_key',
        'ssl_key_passphrase',
        'ssh_host',
        'ssh_username',
        'ssh_private_key',
        'ssh_key_passphrase',
        'ssh_password',
        'local_port'
    ];
}

export class DatabaseService {
    // Database connections
    async createDatabaseConnection(payload: DatabaseConnectionCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.project_id || !payload.connection_name || !payload.username || !payload.password || !payload.host || !payload.port || !payload.db_type) {
            return {
                success: false,
                error: 'project_id, connection_name, username, password, host, port, db_type are required'
            };
        }

        let encryptedPayload = payload;
        const projectId = typeof payload.project_id === 'string' ? payload.project_id : String(payload.project_id);

        // Encrypt sensitive fields if projectId and encryption key are available
        if (projectId) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    const fieldsToEncrypt = getFieldsToEncryptForDatabaseConnection();
                    encryptedPayload = await encryptObject(payload, encryptionKey, fieldsToEncrypt);
                }
            } catch (error) {
                /* console.error('[DatabaseService] Encryption failed:', error); */
                // Fallback: send unencrypted if encryption fails
            }
        }

        return await apiRouter.request<DefaultResponse>('/database-connections/create', {
            method: 'POST',
            body: JSON.stringify(encryptedPayload),
        });
    }

    async updateDatabaseConnection(payload: DatabaseConnectionUpdateRequest, projectId: string | number): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.connection_id) {
            return {
                success: false,
                error: 'connection_id is required'
            };
        }

        let { project_id, ...rest } = payload;
        let encryptedPayload = rest;
        
        // Get project_id from payload or need to fetch it - for now, we'll try to get it from the connection
        // Since update might not have project_id, we need to handle this case
        // For update, we'll encrypt only if project_id is available
        if (projectId) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    const fieldsToEncrypt = getFieldsToEncryptForDatabaseConnection();
                    // Only encrypt fields that are present in the payload
                    encryptedPayload = await encryptObject(payload, encryptionKey, fieldsToEncrypt);
                }
            } catch (error) {
                /* console.error('[DatabaseService] Encryption failed:', error); */
                // Fallback: send unencrypted if encryption fails
            }
        }

        return await apiRouter.request<DefaultResponse>('/database-connections/update', {
            method: 'PUT',
            body: JSON.stringify(encryptedPayload),
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

        const response = await apiRouter.request<DatabaseConnectionListResponse>('/database-connections/get_list', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        // Decrypt connections if needed
        if (response.success && response.data && response.data.connections) {
            const projectId = typeof payload.project_id === 'string' ? payload.project_id : String(payload.project_id);
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    const fieldsToDecrypt = getFieldsToEncryptForDatabaseConnection();
                    response.data.connections = await Promise.all(
                        response.data.connections.map(async (connection) => {
                            try {
                                return await decryptObject(connection, encryptionKey, fieldsToDecrypt);
                            } catch (error) {
                                /* console.error('[DatabaseService] Decryption failed for connection:', connection.connection_id, error); */
                                // Keep original connection if decryption fails (backward compatibility)
                                return connection;
                            }
                        })
                    );
                }
            } catch (error) {
                /* console.error('[DatabaseService] Decryption failed:', error); */
                // Keep original response if decryption fails (backward compatibility)
            }
        }

        return response;
    }

    async searchDatabaseConnections(request: DatabaseConnectionSearchRequest): Promise<ApiResponse<DatabaseConnectionSearchResponse>> {
        // Input validation
        if (!request.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        const response = await apiRouter.request<DatabaseConnectionSearchResponse>('/database-connections/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });

        // Decrypt connections if needed
        if (response.success && response.data && response.data.database_connections) {
            const projectId = typeof request.project_id === 'string' ? request.project_id : String(request.project_id);
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    const fieldsToDecrypt = getFieldsToEncryptForDatabaseConnection();
                    response.data.database_connections = await Promise.all(
                        response.data.database_connections.map(async (connection) => {
                            try {
                                return await decryptObject(connection, encryptionKey, fieldsToDecrypt);
                            } catch (error) {
                                /* console.error('[DatabaseService] Decryption failed for connection:', connection.connection_id, error); */
                                // Keep original connection if decryption fails (backward compatibility)
                                return connection;
                            }
                        })
                    );
                }
            } catch (error) {
                /* console.error('[DatabaseService] Decryption failed:', error); */
                // Keep original response if decryption fails (backward compatibility)
            }
        }

        return response;
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