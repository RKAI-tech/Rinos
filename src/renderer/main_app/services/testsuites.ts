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
        return await apiRouter.request<{ message: string }>(`/runcode/execute_test_suite/${payload.test_suite_id}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
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
        request: TestSuiteTestCaseSearchRequest
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
        
        return await apiRouter.request<TestSuiteTestCaseSearchResponse>(
            `/test-suites/${testSuiteId}/testcases/search`,
            {
                method: 'POST',
                body: JSON.stringify(request),
            }
        );
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