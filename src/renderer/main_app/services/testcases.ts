import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    TestCaseBatch as TestCaseGetAllResponse,
    TestCaseGetRequest,
    TestCaseCreateRequest,
    TestCaseUpdateRequest,
    TestCaseDeleteRequest,
    TestCase,
    ExecuteTestCaseRequest,
    TestCaseSearchRequest,
    TestCaseSearchResponse,
    TestCaseDataVersionBatch
} from '../types/testcases';
import { DefaultResponse } from '../types/api_responses';
import { Action, ActionData, ActionDataGeneration } from '../types/actions';
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

export class TestCaseService {
    async getTestCases(projectId?: string, limit: number = 10, offset: number = 0): Promise<ApiResponse<TestCaseGetAllResponse>> {
        // Input validation
        if (!projectId) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        const endpoint = `/testcases/get_by_project_id/${projectId}`;
        // use POST method with TestCaseGetRequest body
        const requestBody: TestCaseGetRequest = {
            project_id: projectId, 
            limit: limit,
            offset: offset
        };
        
        const response = await apiRouter.request<TestCaseGetAllResponse>(endpoint, {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });
        
        // Giải mã basic_authentication trong response nếu có projectId và encryption key
        if (response.success && response.data && response.data.testcases && projectId) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    response.data.testcases = await Promise.all(
                        response.data.testcases.map(async (testcase) => {
                            if (testcase.basic_authentication) {
                                try {
                                    testcase.basic_authentication = await decryptObject(
                                        testcase.basic_authentication,
                                        encryptionKey,
                                        ['username', 'password']
                                    );
                                } catch (error) {
                                    console.error('[TestCaseService] Decryption failed for testcase:', error);
                                    // Keep original if decryption fails (backward compatibility)
                                }
                            }
                            return testcase;
                        })
                    );
                }
            } catch (error) {
                console.error('[TestCaseService] Decryption failed:', error);
                // Keep original response if decryption fails (backward compatibility)
            }
        }
        
        return response;
    }


    async searchTestCases(request: TestCaseSearchRequest): Promise<ApiResponse<TestCaseSearchResponse>> {
        // Input validation
        if (!request.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        const response = await apiRouter.request<TestCaseSearchResponse>('/testcases/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
        
        // Giải mã basic_authentication trong response nếu có projectId và encryption key
        if (response.success && response.data && response.data.testcases && request.project_id) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(request.project_id);
                if (encryptionKey) {
                    response.data.testcases = await Promise.all(
                        response.data.testcases.map(async (testcase) => {
                            if (testcase.basic_authentication) {
                                try {
                                    testcase.basic_authentication = await decryptObject(
                                        testcase.basic_authentication,
                                        encryptionKey,
                                        ['username', 'password']
                                    );
                                } catch (error) {
                                    console.error('[TestCaseService] Decryption failed for testcase:', error);
                                    // Keep original if decryption fails (backward compatibility)
                                }
                            }
                            return testcase;
                        })
                    );
                }
            } catch (error) {
                console.error('[TestCaseService] Decryption failed:', error);
                // Keep original response if decryption fails (backward compatibility)
            }
        }
        
        return response;
    }

    async createTestCase(testCase: TestCaseCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!testCase.name || testCase.name.trim().length === 0) {
            return {
                success: false,
                error: 'Test case name is required'
            };
        }
        // console.log('testCase', testCase.project_id);
        if (!testCase.project_id ) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        // Script can be empty on creation; backend supports recording later

        return await apiRouter.request<DefaultResponse>('/testcases/create', {
            method: 'POST',
            body: JSON.stringify(testCase),
        });
    }

    async createTestCaseWithActions(testCase: TestCaseCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!testCase.name || testCase.name.trim().length === 0) {
            return {
                success: false,
                error: 'Test case name is required'
            };
        }
        if (!testCase.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }
        if (!testCase.actions || testCase.actions.length === 0) {
            // console.log('No actions provided');
        }

        // Mã hóa dữ liệu nhạy cảm nếu có projectId và encryption key
        let encryptedTestCase = { ...testCase };
        if (testCase.project_id) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(testCase.project_id);
                if (encryptionKey) {
                    // Mã hóa basic_authentication nếu có
                    if (testCase.basic_authentication && testCase.basic_authentication.username && testCase.basic_authentication.password) {
                        encryptedTestCase.basic_authentication = await encryptObject(
                            testCase.basic_authentication,
                            encryptionKey,
                            ['username', 'password']
                        );
                    }

                    // Mã hóa actions nếu có
                    if (testCase.actions && testCase.actions.length > 0) {
                        const encryptedActions = await Promise.all(
                            testCase.actions.map(async (action: Action) => {
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
                        encryptedTestCase = {
                            ...encryptedTestCase,
                            actions: encryptedActions
                        };
                    }
                }
            } catch (error) {
                console.error('[TestCaseService] Encryption failed:', error);
                // Fallback: gửi không mã hóa nếu có lỗi
            }
        }

        return await apiRouter.request<DefaultResponse>('/testcases/create_with_actions', {
            method: 'POST',
            body: JSON.stringify(encryptedTestCase),
        });
    }

    async updateTestCase(testCase: TestCaseUpdateRequest, projectId?: string): Promise<ApiResponse<TestCase>> {
        // Input validation
        if (!testCase.testcase_id) {
            return {
                success: false,
                error: 'Valid test case ID is required'
            };
        }

        if (testCase.name !== undefined && testCase.name.trim().length === 0) {
            return {
                success: false,
                error: 'Test case name cannot be empty'
            };
        }

        // Mã hóa basic_authentication nếu có projectId và encryption key
        let encryptedTestCase = { ...testCase };
        if (projectId && testCase.basic_authentication && testCase.basic_authentication.username && testCase.basic_authentication.password) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    encryptedTestCase.basic_authentication = await encryptObject(
                        testCase.basic_authentication,
                        encryptionKey,
                        ['username', 'password']
                    );
                }
            } catch (error) {
                console.error('[TestCaseService] Encryption failed:', error);
                // Fallback: send unencrypted if encryption fails
            }
        }

        const response = await apiRouter.request<TestCase>(`/testcases/update/${testCase.testcase_id}`, {
            method: 'PUT',
            body: JSON.stringify(encryptedTestCase),
        });

        // Giải mã basic_authentication trong response nếu có projectId
        if (response.success && response.data && projectId && response.data.basic_authentication) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    response.data.basic_authentication = await decryptObject(
                        response.data.basic_authentication,
                        encryptionKey,
                        ['username', 'password']
                    );
                }
            } catch (error) {
                console.error('[TestCaseService] Decryption failed:', error);
                // Keep original response if decryption fails (backward compatibility)
            }
        }

        return response;
    }

    async deleteTestCase(payload: TestCaseDeleteRequest): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!payload.testcase_id) {
            return {
                success: false,
                error: 'Valid test case ID is required'
            };
        }

        try {
            const response = await apiRouter.request<DefaultResponse>(`/testcases/delete/${payload.testcase_id}`, {
                method: 'DELETE',
                body: JSON.stringify(payload)
            });
            return response;
        } catch (error) {
            // console.error('[ApiRouter] Delete test case failed:', error);
            return {
                success: false,
                error: 'Failed to delete test case'
            };
        }
    }

    async executeTestCase(payload: ExecuteTestCaseRequest): Promise<ApiResponse<DefaultResponse>> {
        // Use local test execution service instead of API
        try {
            const { TestExecutionService } = await import('../../shared/services/testExecutionService');
            const { apiRouter } = await import('./baseAPIRequest');
            
            const testExecutionService = new TestExecutionService(
                apiRouter,
                undefined // Will use getElectronIPC() internally
            );
            
            const result = await testExecutionService.executeTestcase({
                testcase_id: payload.testcase_id,
                test_suite_id: payload.test_suite_id,
                project_id: payload.project_id,
                onSave: true,
            });
            
            return {
                success: result.success,
                data: {
                    message: result.success ? 'Test executed successfully' : 'Test execution failed',
                },
                error: result.success ? undefined : result.logs,
            };
        } catch (error) {
            console.error('[TestCaseService] Error executing testcase locally:', error);
            // Fallback to API if local execution fails
            return await apiRouter.request<DefaultResponse>(`/runcode/execute_test_case/${payload.testcase_id}`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }
    }

    async getTestCaseDataVersions(testcaseId: string, projectId?: string): Promise<ApiResponse<TestCaseDataVersionBatch>> {
        const response = await apiRouter.request<TestCaseDataVersionBatch>(`/testcases/data_version/get_by_testcase_id/${testcaseId}`, {
            method: 'POST',
            body: JSON.stringify({ testcase_id: testcaseId }),
        });

        // Check if testcase was deleted (404 or Not Found error)
        if (!response.success && response.error) {
            const errorLower = response.error.toLowerCase();
            if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
                console.info(`[TestCaseService] Testcase ${testcaseId} not found (likely deleted), returning empty data versions`);
                return {
                    success: true,
                    data: {
                        testcase_data_versions: []
                    }
                };
            }
        }

        // Decrypt action_data_generations nếu có projectId và encryption key
        if (response.success && response.data && projectId) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey && response.data.testcase_data_versions) {
                    const decryptedVersions = await Promise.all(
                        response.data.testcase_data_versions.map(async (version) => {
                            const decryptedVersion = { ...version };

                            // Decrypt action_data_generations
                            if (version.action_data_generations && version.action_data_generations.length > 0) {
                                decryptedVersion.action_data_generations = await Promise.all(
                                    version.action_data_generations.map(async (gen) => {
                                        const fieldsToDecrypt = getFieldsToDecryptForActionDataGeneration(gen);
                                        if (fieldsToDecrypt.length > 0) {
                                            return await decryptObject(gen, encryptionKey, fieldsToDecrypt);
                                        }
                                        return gen;
                                    })
                                );
                            }

                            return decryptedVersion;
                        })
                    );

                    return {
                        ...response,
                        data: {
                            ...response.data,
                            testcase_data_versions: decryptedVersions
                        }
                    };
                }
            } catch (error) {
                console.error('[TestCaseService] Decryption failed:', error);
                // Fallback: trả về versions không decrypt nếu có lỗi
            }
        }

        return response;
    }
}