import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    TestSuiteGetAllResponse,
    TestSuiteCreateRequest,
    TestSuiteGetAllRequest,
    AddTestCasesToSuiteRequest,
    AddTestCasesToSuiteResponse,
    GetTestCasesBySuiteRequest,
    TestCaseInSuite,
    ExecuteTestSuiteRequest,
    GetTestCasesBySuiteResponse,
    ExportTestSuiteRequest,
    ExportTestSuiteResponse,
    UpdateTestCaseLevelRequest,
    UpdateTestSuiteGroupRequest,

    TestSuiteTestCaseSearchRequest,
    TestSuiteTestCaseSearchResponse
} from '../types/testsuites';
import { DefaultResponse } from '../types/api_responses';
import { decryptObject } from './encryption';

export class TestSuiteService {
    async removeTestCaseFromTestSuite(testcaseId: string, testSuiteId: string): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!testcaseId) {
            return {
                success: false,
                error: 'Valid test case ID is required'
            };
        }

        if (!testSuiteId) {
            return {
                success: false,
                error: 'Valid test suite ID is required'
            };
        }

        try {
            const response = await apiRouter.request<DefaultResponse>(`/testcases/${testcaseId}/remove_from_test_suite/${testSuiteId}`, {
                method: 'DELETE'
            });
            return response;
        } catch (error) {
            // console.error('[ApiRouter] Remove test case from test suite failed:', error);
            return {
                success: false,
                error: 'Failed to remove test case from test suite'
            };
        }
    }
    async executeTestSuite(payload: ExecuteTestSuiteRequest): Promise<ApiResponse<{ message: string }>> {
        if (!payload || !payload.test_suite_id) {
            return { success: false, error: 'test_suite_id is required' };
        }

        // Use local test execution service instead of API
        try {
            const { TestExecutionService } = await import('../../shared/services/testExecutionService');
            
            const testExecutionService = new TestExecutionService(
                apiRouter,
                undefined // Will use getElectronIPC() internally
            );

            // Get testcases from suite
            const testcasesResponse = await this.getTestCasesBySuite({ 
                test_suite_id: payload.test_suite_id 
            });

            if (!testcasesResponse.success || !testcasesResponse.data) {
                return {
                    success: false,
                    error: testcasesResponse.error || 'Failed to get testcases from suite'
                };
            }

            const testcases = testcasesResponse.data.testcases || [];

            if (testcases.length === 0) {
                return {
                    success: false,
                    error: 'No testcases found in test suite'
                };
            }

            // Sort testcases by level (ascending - lower level = higher priority)
            const sortedTestcases = [...testcases].sort((a, b) => {
                const levelA = a.level ?? 0;
                const levelB = b.level ?? 0;
                return levelA - levelB;
            });

            // Group testcases by level
            const groupedByLevel = new Map<number, TestCaseInSuite[]>();
            sortedTestcases.forEach(testcase => {
                const level = testcase.level ?? 0;
                if (!groupedByLevel.has(level)) {
                    groupedByLevel.set(level, []);
                }
                groupedByLevel.get(level)!.push(testcase);
            });

            // Get sorted levels (ascending order)
            const sortedLevels = Array.from(groupedByLevel.keys()).sort((a, b) => a - b);

            // Execute testcases sequentially by level
            let successCount = 0;
            let failureCount = 0;
            const errors: string[] = [];

            for (const level of sortedLevels) {
                const testcasesInLevel = groupedByLevel.get(level) || [];
                
                // Execute testcases in this level sequentially
                for (const testcase of testcasesInLevel) {
                    try {
                        const result = await testExecutionService.executeTestcase({
                            testcase_id: testcase.testcase_id,
                            test_suite_id: payload.test_suite_id,
                            project_id: testcase.project_id,
                            evidence_id: testcase.evidence_id,
                            browser_type: testcase.browser_type,
                            onSave: true,
                        });

                        if (result.success) {
                            successCount++;
                        } else {
                            failureCount++;
                            errors.push(`${testcase.name}: ${result.logs}`);
                        }
                    } catch (error) {
                        failureCount++;
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                        errors.push(`${testcase.name}: ${errorMessage}`);
                        /* console.error(`[TestSuiteService] Error executing testcase ${testcase.testcase_id}:`, error); */
                    }
                }
            }

            // Return success if at least one testcase executed successfully
            const hasSuccess = successCount > 0;
            const totalCount = testcases.length;
            const message = `Executed ${totalCount} testcase(s): ${successCount} passed, ${failureCount} failed`;

            return {
                success: hasSuccess,
                data: {
                    message: message
                },
                error: hasSuccess ? undefined : (errors.length > 0 ? errors.join('; ') : 'All testcases failed to execute')
            };
        } catch (error) {
            /* console.error('[TestSuiteService] Error executing test suite locally:', error); */
            return { success: false, error: 'Failed to execute test suite' };
        }
    }
    async getTestSuites(projectId: string): Promise<ApiResponse<TestSuiteGetAllResponse>> {
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        return await apiRouter.request<TestSuiteGetAllResponse>(`/test-suites/get_by_project/${projectId}`, {
            method: 'GET'
        });
    }
    async getByGroupId(groupId: string): Promise<ApiResponse<TestSuiteGetAllResponse>> {
        if (!groupId) {
            return { success: false, error: 'group_id is required' };
        }
        return await apiRouter.request<TestSuiteGetAllResponse>(`/test-suites/get_by_group/${groupId}`, {
            method: 'GET'
        });
    }

    async createTestSuite(testSuite: TestSuiteCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!testSuite || !testSuite.project_id) {
            return { success: false, error: 'project_id is required' };
        }

        if (!testSuite.name || testSuite.name.trim().length === 0) {
            return {
                success: false,
                error: 'Test suite name is required'
            };
        }

        return await apiRouter.request<DefaultResponse>('/test-suites/create', {
            method: 'POST',
            body: JSON.stringify(testSuite),
        });
    }

    async updateTestSuite(payload: { test_suite_id: string; name: string; description: string; browser_type?: string }): Promise<ApiResponse<DefaultResponse>> {
        // console.log('updateTestSuite payload', payload);
        if (!payload || !payload.test_suite_id) {
            return { success: false, error: 'Suite ID is missing, please try again.' };
        }
        
        if (!payload.name) {
            return { success: false, error: 'Name are required' };
        }

        return await apiRouter.request<DefaultResponse>(`/test-suites/${payload.test_suite_id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

    async updateTestSuiteGroup(payload: UpdateTestSuiteGroupRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.test_suite_id) {
            return { success: false, error: 'Test suite ID is required' };
        }
        // Allow null/empty group_id to remove suite from group (move to root)
        return await apiRouter.request<DefaultResponse>(`/test-suites/${payload.test_suite_id}/update_group`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }

    async deleteTestSuite(testSuiteId: string): Promise<ApiResponse<DefaultResponse>> {
        if (!testSuiteId) {
            return { success: false, error: 'test_suite_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/test-suites/${testSuiteId}`, {
            method: 'DELETE'
        });
    }

    // Add test cases to test suite
    async addTestCasesToSuite(request: AddTestCasesToSuiteRequest): Promise<ApiResponse<AddTestCasesToSuiteResponse>> {
        // Input validation
        if (!request.test_suite_id) {
            return {
                success: false,
                error: 'Test suite ID is required'
            };
        }

        if (!request.testcase_ids || !Array.isArray(request.testcase_ids) || request.testcase_ids.length === 0) {
            return {
                success: false,
                error: 'At least one test case ID is required'
            };
        }

        return await apiRouter.request<AddTestCasesToSuiteResponse>(`/test-suites/${request.test_suite_id}/add_test_cases`, {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async updateTestCaseLevel(request: UpdateTestCaseLevelRequest): Promise<ApiResponse<AddTestCasesToSuiteRequest>> {
        if (!request.test_suite_id) {
            return {
                success: false,
                error: 'Test suite ID is required'
            };
        }

        return await apiRouter.request<AddTestCasesToSuiteRequest>(`/test-suites/${request.test_suite_id}/update_test_case_level`, {
            method: 'PUT',
            body: JSON.stringify(request),
        });
    }

    // Get test cases by test suite (legacy - kept for backward compatibility)
    async getTestCasesBySuite(request: GetTestCasesBySuiteRequest): Promise<ApiResponse<GetTestCasesBySuiteResponse>> {
        // Input validation
        if (!request.test_suite_id) {
            return {
                success: false,
                error: 'Test suite ID is required'
            };
        }
        
        
        return await apiRouter.request<GetTestCasesBySuiteResponse>(`/test-suites/${request.test_suite_id}/testcases`, {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    // Search test cases by test suite (with pagination, filter, sort)
    async searchTestCasesBySuite(
        testSuiteId: string,
        request: TestSuiteTestCaseSearchRequest,
        projectId?: string
    ): Promise<ApiResponse<TestSuiteTestCaseSearchResponse>> {
        // Input validation
        if (!testSuiteId) {
            return {
                success: false,
                error: 'Test suite ID is required'
            };
        }

        if (request.page < 1) {
            return {
                success: false,
                error: 'page must be >= 1'
            };
        }

        if (request.page_size < 1 || request.page_size > 100) {
            return {
                success: false,
                error: 'page_size must be >= 1 and <= 100'
            };
        }
        
        const response = await apiRouter.request<TestSuiteTestCaseSearchResponse>(
            `/test-suites/${testSuiteId}/testcases/search`,
            {
                method: 'POST',
                body: JSON.stringify(request),
            }
        );

        // Giải mã basic_authentication trong response nếu có projectId và encryption key
        if (response.success && response.data && projectId && response.data.testcases) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey) {
                    // Giải mã basic_authentication cho từng testcase
                    response.data.testcases = await Promise.all(
                        response.data.testcases.map(async (testcase) => {
                            if (testcase.basic_authentication && 
                                testcase.basic_authentication.username && 
                                testcase.basic_authentication.password) {
                                try {
                                    testcase.basic_authentication = await decryptObject(
                                        testcase.basic_authentication,
                                        encryptionKey,
                                        ['username', 'password']
                                    );
                                } catch (error) {
                                    /* console.error('[TestSuiteService] Decryption failed for testcase:', testcase.testcase_id, error); */
                                    // Keep original if decryption fails (backward compatibility)
                                }
                            }
                            return testcase;
                        })
                    );
                }
            } catch (error) {
                /* console.error('[TestSuiteService] Decryption failed:', error); */
                // Keep original response if decryption fails (backward compatibility)
            }
        }

        return response;
    }

    // Export test suite to Excel
    async exportTestSuite(request: ExportTestSuiteRequest): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
        // Input validation
        if (!request.test_suite_id) {
            return {
                success: false,
                error: 'Test suite ID is required'
            };
        }

        return await apiRouter.downloadFile(`/test-suites/${request.test_suite_id}/export`, {
            method: 'GET'
        });
    }
}