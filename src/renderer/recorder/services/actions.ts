import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    Action,
    ActionBatch,
    AiAssertRequest,
    AiAssertResponse,
    AssertActionsResponse,
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

        // console.log('[ApiRouter] Sending batch create request:', JSON.stringify(requestBody, null, 2));
        // console.log('[ApiRouter] Request structure validation:');
        // console.log('- Actions count:', requestBody.actions.length);
        // requestBody.actions.forEach((action, index) => {
        //     console.log(`- Action ${index}:`, {
        //         testcase_id: action.testcase_id,
        //         action_type: action.action_type,
        //         elements_count: action.elements ? action.elements.length : 0,
        //         elements: action.elements,
        //         value: action.value,
        //         assert_type: action.assert_type,
        //         connection_id: action.connection_id,
        //         statement_id: action.statement_id,
        //         query: action.query,
        //         variable_name: action.variable_name
        //     });
        // });
        // console.log('[ApiRouter] Request body:', requestBody);

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

    // Generate AI assert action
    async generateAiAssert(request: AiAssertRequest): Promise<AiAssertResponse> {
        // Input validation
        if (!request.testcase_id) {
            return {
                success: false,
                error: 'Valid testcase ID is required'
            };
        }

        if (!request.prompt || request.prompt.trim() === '') {
            return {
                success: false,
                error: 'Prompt is required'
            };
        }

        if (!request.elements || !Array.isArray(request.elements) || request.elements.length === 0) {
            return {
                success: false,
                error: 'At least one element is required'
            };
        }

        // console.log('[ApiRouter] Sending AI assert request:', JSON.stringify(request, null, 2));

        const response = await apiRouter.request<AiAssertResponse['data']>('/actions/generate_assert', {
            method: 'POST',
            body: JSON.stringify(request),
        });

        return response;
    }

    async getAssertActions(): Promise<ApiResponse<AssertActionsResponse>> {
        const response = await apiRouter.request<AssertActionsResponse>('/actions/get_assert_actions', {
            method: 'GET'
        });
        return response;
    }
}