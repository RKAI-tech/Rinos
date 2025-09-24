import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    TestCaseGetAllResponse,
    TestCaseGetRequest,
    TestCaseCreateRequest,
    TestCaseUpdateRequest,
    TestCaseDeleteRequest,
    TestCase
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

        if (!testCase.project_id || testCase.project_id <= 0) {
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
            console.error('[ApiRouter] Delete test case failed:', error);
            return {
                success: false,
                error: 'Failed to delete test case'
            };
        }
    }
}