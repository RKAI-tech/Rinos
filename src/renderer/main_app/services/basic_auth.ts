import { BasicAuthentication } from "../types/basic_auth";
import apiRouter, { ApiRouter } from "./baseAPIRequest";
import { ApiResponse } from "../types/api_responses";
import { encryptObject, decryptObject } from "./encryption";

export class BasicAuthService {
    // TODO: Create basic authentication
    async upsertBasicAuthentication(basicAuthentication: BasicAuthentication, projectId?: string): Promise<ApiResponse<BasicAuthentication>> {
        let payload = basicAuthentication;
        
        // Encrypt username and password if projectId and encryption key are available
        if (projectId && basicAuthentication.username && basicAuthentication.password) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    payload = await encryptObject(basicAuthentication, encryptionKey, ['username', 'password']);
                }
            } catch (error) {
                console.error('[BasicAuthService] Encryption failed:', error);
                // Fallback: send unencrypted if encryption fails
            }
        }
        
        const response = await apiRouter.request<BasicAuthentication>('/basic-auth/upsert', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        
        // Decrypt response if needed
        if (response.success && response.data && projectId) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    response.data = await decryptObject(response.data, encryptionKey, ['username', 'password']);
                }
            } catch (error) {
                console.error('[BasicAuthService] Decryption failed:', error);
                // Keep original response if decryption fails (backward compatibility)
            }
        }
        
        return response;
    }

    // TODO: Get basic authentication list by testcase
    async getBasicAuthenticationByTestcaseId(testcaseId: string, projectId?: string): Promise<ApiResponse<BasicAuthentication[]>> {
        const response = await apiRouter.request<BasicAuthentication[]>(`/basic-auth/${testcaseId}`, {
            method: 'GET',
        });
        
        // Decrypt username and password for each item in array if projectId and encryption key are available
        if (response.success && response.data && projectId && Array.isArray(response.data)) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    response.data = await Promise.all(
                        response.data.map(async (item) => {
                            try {
                                return await decryptObject(item, encryptionKey, ['username', 'password']);
                            } catch (error) {
                                console.error('[BasicAuthService] Decryption failed for item:', error);
                                // Keep original item if decryption fails (backward compatibility)
                                return item;
                            }
                        })
                    );
                }
            } catch (error) {
                console.error('[BasicAuthService] Decryption failed:', error);
                // Keep original response if decryption fails (backward compatibility)
            }
        }
        
        return response;
    }

    // TODO: Upsert multiple basic authentication
    async upsertMultipleBasicAuthentication(payload: BasicAuthentication[], projectId?: string): Promise<ApiResponse<BasicAuthentication[]>> {
        let encryptedPayload = payload;
        
        // Encrypt username and password for each item if projectId and encryption key are available
        if (projectId && Array.isArray(payload) && payload.length > 0) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    encryptedPayload = await Promise.all(
                        payload.map(async (item) => {
                            if (item.username && item.password) {
                                try {
                                    return await encryptObject(item, encryptionKey, ['username', 'password']);
                                } catch (error) {
                                    console.error('[BasicAuthService] Encryption failed for item:', error);
                                    return item; // Fallback: send unencrypted
                                }
                            }
                            return item;
                        })
                    );
                }
            } catch (error) {
                console.error('[BasicAuthService] Encryption failed:', error);
                // Fallback: send unencrypted if encryption fails
            }
        }
        
        const response = await apiRouter.request<BasicAuthentication[]>(`/basic-auth/upsert-multiple`, {
            method: 'POST',
            body: JSON.stringify(encryptedPayload),
        });
        
        // Decrypt response if needed
        if (response.success && response.data && projectId && Array.isArray(response.data)) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    response.data = await Promise.all(
                        response.data.map(async (item) => {
                            try {
                                return await decryptObject(item, encryptionKey, ['username', 'password']);
                            } catch (error) {
                                console.error('[BasicAuthService] Decryption failed for item:', error);
                                // Keep original item if decryption fails (backward compatibility)
                                return item;
                            }
                        })
                    );
                }
            } catch (error) {
                console.error('[BasicAuthService] Decryption failed:', error);
                // Keep original response if decryption fails (backward compatibility)
            }
        }
        
        return response;
    }
    
    // TODO: Delete basic authentication
    async deleteBasicAuthentication(payload: BasicAuthentication): Promise<ApiResponse<BasicAuthentication>> {
        const response = await apiRouter.request<BasicAuthentication>(`/basic-auth/${payload.testcase_id}`, {
            method: 'DELETE',
            body: JSON.stringify(payload),
        });
        return response;
    }
}