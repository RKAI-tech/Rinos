import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    ActionBatch,
    Action,
    GenerateRandomDataFunctionRequest,
    GenerateRandomDataFunctionResponse,
} from '../types/actions';
import { DefaultResponse } from '../types/api_responses';

export class ActionService {
    async getActionsByTestCase(testcaseId: string, limit?: number, offset?: number): Promise<ApiResponse<ActionBatch>> {
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
        
        return await apiRouter.request<ActionBatch>(endpoint, {
            method: 'GET'
        });
    }

    async batchCreateActions(actions: Action[]): Promise<ApiResponse<DefaultResponse>> {
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

        const requestBody: ActionBatch = { actions };

        const response = await apiRouter.request<DefaultResponse>('/actions/batch-create', {
            method: 'POST',
            body: JSON.stringify(requestBody),
        });
        
        // console.log('[ApiRouter] Batch create response:', response);
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