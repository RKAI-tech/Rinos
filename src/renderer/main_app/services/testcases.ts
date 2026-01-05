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
    TestCaseDataVersionBatch
} from '../types/testcases';
import { DefaultResponse } from '../types/api_responses';

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

        return await apiRouter.request<DefaultResponse>('/testcases/create_with_actions', {
            method: 'POST',
            body: JSON.stringify(testCase),
        });
    }

    async updateTestCase(testCase: TestCaseUpdateRequest): Promise<ApiResponse<TestCase>> {
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

        return await apiRouter.request<TestCase>(`/testcases/update/${testCase.testcase_id}`, {
            method: 'PUT',
            body: JSON.stringify(testCase),
        });
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
        return await apiRouter.request<DefaultResponse>(`/runcode/execute_test_case/${payload.testcase_id}`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }

    async getTestCaseDataVersions(testcaseId: string): Promise<ApiResponse<TestCaseDataVersionBatch>> {
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

        return response;
    }
}