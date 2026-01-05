import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    ActionBatch,
    Action,
    ActionData,
    ActionDataGeneration,
    GenerateRandomDataFunctionRequest,
    GenerateRandomDataFunctionResponse,
    TestCaseDataVersion,
} from '../types/actions';
import { DefaultResponse } from '../types/api_responses';
import { encryptObject, decryptObject } from './encryption';

/**
 * Xác định các trường cần mã hóa trong ActionData
 */
function getFieldsToEncryptForActionData(actionData: ActionData): string[] {
    const fields: string[] = [];
    
    // value.value - chỉ mã hóa key "value" bên trong dictionary
    if (actionData.value && 
        typeof actionData.value === 'object' && 
        actionData.value.value !== undefined && 
        actionData.value.value !== null) {
        fields.push('value.value');
    }
    
    // Database connection
    if (actionData.statement?.connection) {
        if (actionData.statement.connection.username) {
            fields.push('statement.connection.username');
        }
        if (actionData.statement.connection.password) {
            fields.push('statement.connection.password');
        }
    }
    
    // API request - không mã hóa (theo yêu cầu)
    
    return fields;
}

/**
 * Xác định các trường cần mã hóa trong ActionDataGeneration
 */
function getFieldsToEncryptForActionDataGeneration(gen: ActionDataGeneration): string[] {
    const fields: string[] = [];
    
    // value.value - chỉ mã hóa key "value" bên trong dictionary
    if (gen.value && 
        typeof gen.value === 'object' && 
        gen.value.value !== undefined && 
        gen.value.value !== null) {
        fields.push('value.value');
    }
    
    return fields;
}

/**
 * Xác định các trường cần decrypt trong ActionData
 */
function getFieldsToDecryptForActionData(actionData: ActionData): string[] {
    const fields: string[] = [];
    
    // value.value - chỉ decrypt key "value" bên trong dictionary
    if (actionData.value && 
        typeof actionData.value === 'object' && 
        actionData.value.value !== undefined && 
        actionData.value.value !== null) {
        fields.push('value.value');
    }
    
    // Database connection
    if (actionData.statement?.connection) {
        if (actionData.statement.connection.username) {
            fields.push('statement.connection.username');
        }
        if (actionData.statement.connection.password) {
            fields.push('statement.connection.password');
        }
    }
    
    return fields;
}

/**
 * Xác định các trường cần decrypt trong ActionDataGeneration
 */
function getFieldsToDecryptForActionDataGeneration(gen: ActionDataGeneration): string[] {
    const fields: string[] = [];
    
    // value.value - chỉ decrypt key "value" bên trong dictionary
    if (gen.value && 
        typeof gen.value === 'object' && 
        gen.value.value !== undefined && 
        gen.value.value !== null) {
        fields.push('value.value');
    }
    
    return fields;
}

export class ActionService {
    async getActionsByTestCase(testcaseId: string, limit?: number, offset?: number, projectId?: string): Promise<ApiResponse<ActionBatch>> {
        // Input validation
        if (!testcaseId) {
            return {
                success: false,
                error: 'Valid testcase ID is required'
            };
        }

        // Build query parameters
        const params = new URLSearchParams();
        if (limit !== undefined) {
            params.append('limit', limit.toString());
        }
        if (offset !== undefined) {
            params.append('offset', offset.toString());
        }

        const endpoint = `/actions/testcase/${testcaseId}`;
        
        const response = await apiRouter.request<ActionBatch>(endpoint, {
            method: 'GET'
        });

        // Check if testcase was deleted (404 or Not Found error)
        if (!response.success && response.error) {
            const errorLower = response.error.toLowerCase();
            if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
                console.info(`[ActionService] Testcase ${testcaseId} not found (likely deleted), returning empty actions`);
                return {
                    success: true,
                    data: {
                        actions: []
                    }
                };
            }
        }

        // Decrypt metadata nếu có projectId và encryption key
        if (response.success && response.data && projectId) {
            try {
                const encryptionKey = await window.encryptionStore?.getKey(projectId);
                if (encryptionKey && response.data.actions) {
                    const decryptedActions = await Promise.all(
                        response.data.actions.map(async (action) => {
                            const decryptedAction = { ...action };

                            // Decrypt action_datas
                            if (action.action_datas && action.action_datas.length > 0) {
                                decryptedAction.action_datas = await Promise.all(
                                    action.action_datas.map(async (actionData) => {
                                        const fieldsToDecrypt = getFieldsToDecryptForActionData(actionData);
                                        if (fieldsToDecrypt.length > 0) {
                                            return await decryptObject(actionData, encryptionKey, fieldsToDecrypt);
                                        }
                                        return actionData;
                                    })
                                );
                            }

                            // Decrypt action_data_generation
                            if (action.action_data_generation && action.action_data_generation.length > 0) {
                                decryptedAction.action_data_generation = await Promise.all(
                                    action.action_data_generation.map(async (gen) => {
                                        const fieldsToDecrypt = getFieldsToDecryptForActionDataGeneration(gen);
                                        if (fieldsToDecrypt.length > 0) {
                                            return await decryptObject(gen, encryptionKey, fieldsToDecrypt);
                                        }
                                        return gen;
                                    })
                                );
                            }

                            return decryptedAction;
                        })
                    );

                    return {
                        ...response,
                        data: {
                            ...response.data,
                            actions: decryptedActions
                        }
                    };
                }
            } catch (error) {
                console.error('[ActionService] Decryption failed:', error);
                // Fallback: trả về actions không decrypt nếu có lỗi
            }
        }

        return response;
    }

    async batchCreateActions(
        actions: Action[], 
        testcaseDataVersions?: TestCaseDataVersion[],
        projectId?: string
    ): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!actions || !Array.isArray(actions) || actions.length === 0) {
            return {
                success: false,
                error: 'Actions array is required and cannot be empty'
            };
        }

        // Validate each action
        for (const action of actions) {
            if (!action.testcase_id) {
                return {
                    success: false,
                    error: 'Each action must have a valid testcase_id'
                };
            }
            if (!action.action_type) {
                return {
                    success: false,
                    error: 'Each action must have a valid action_type'
                };
            }
        }

        // Chuẩn hoá version_number cho action_data_generation (đánh số từ 1 trở đi theo thứ tự mảng)
        const normalizedActions: Action[] = actions.map((action) => {
            if (!action.action_data_generation || action.action_data_generation.length === 0) {
                return action;
            }
            const gens = action.action_data_generation.map((gen, idx) => ({
                ...gen,
                version_number: idx + 1,
            }));
            return {
                ...action,
                action_data_generation: gens,
            };
        });

        // Mã hóa dữ liệu nhạy cảm nếu có projectId và encryption key
        let encryptedActions = normalizedActions;
        if (projectId) {
            try {
                const encryptionKey = await window.encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    encryptedActions = await Promise.all(
                        normalizedActions.map(async (action) => {
                            const encryptedAction = { ...action };

                            // Mã hóa action_datas
                            if (action.action_datas && action.action_datas.length > 0) {
                                encryptedAction.action_datas = await Promise.all(
                                    action.action_datas.map(async (actionData) => {
                                        const fieldsToEncrypt = getFieldsToEncryptForActionData(actionData);
                                        if (fieldsToEncrypt.length > 0) {
                                            return await encryptObject(actionData, encryptionKey, fieldsToEncrypt);
                                        }
                                        return actionData;
                                    })
                                );
                            }

                            // Mã hóa action_data_generation
                            if (action.action_data_generation && action.action_data_generation.length > 0) {
                                encryptedAction.action_data_generation = await Promise.all(
                                    action.action_data_generation.map(async (gen) => {
                                        const fieldsToEncrypt = getFieldsToEncryptForActionDataGeneration(gen);
                                        if (fieldsToEncrypt.length > 0) {
                                            return await encryptObject(gen, encryptionKey, fieldsToEncrypt);
                                        }
                                        return gen;
                                    })
                                );
                            }

                            return encryptedAction;
                        })
                    );
                }
            } catch (error) {
                console.error('[ActionService] Encryption failed:', error);
                // Fallback: gửi không mã hóa nếu có lỗi
            }
        }

        const requestBody: ActionBatch = { 
            actions: encryptedActions, 
            testcase_data_versions: testcaseDataVersions 
        };

        const response = await apiRouter.request<DefaultResponse>('/actions/batch-create', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });
        
        return response;
    }

    // Delete all actions of a test case
    async deleteActionsByTestCase(testcaseId: string): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!testcaseId) {
            return {
                success: false,
                error: 'Valid testcase ID is required'
            };
        }

        const endpoint = `/actions/testcase/${testcaseId}`;
        const response = await apiRouter.request<DefaultResponse>(endpoint, {
            method: 'DELETE'
        });
        return response;
    }

    // Delete a single action by ID
    async deleteActionById(actionId: string): Promise<ApiResponse<DefaultResponse>> {
        if (!actionId) {
            return {
                success: false,
                error: 'Valid action ID is required'
            };
        }

        const endpoint = `/actions/${actionId}`;
        const response = await apiRouter.request<DefaultResponse>(endpoint, {
            method: 'DELETE'
        });
        return response;
    }

    async generateRandomDataFunction(request: GenerateRandomDataFunctionRequest): Promise<ApiResponse<GenerateRandomDataFunctionResponse>> {
        // Input validation
        if (!request || !request.prompt || request.prompt.trim() === '') {
            return {
                success: false,
                error: 'Prompt is required to generate random data function',
            };
        }

        const response = await apiRouter.request<GenerateRandomDataFunctionResponse>(
            "/actions/generate_random_data_function",
            {
                method: "POST",
                body: JSON.stringify(request),
            }
        );
        
        if (response.success && !response.data && (response as any).generator_data_function_code !== undefined) {
            // Backend trả về GenerateRandomDataFunctionResponse trực tiếp, wrap lại
            return {
                success: true,
                data: response as unknown as GenerateRandomDataFunctionResponse,
            };
        }
        
        return response;
    }
}