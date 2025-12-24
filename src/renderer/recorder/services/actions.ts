import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
  Action,
  ActionBatch,
  AiAssertRequest,
  AiAssertResponse,
  AssertActionsResponse,
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

        const requestBody: ActionBatch = { actions: normalizedActions };

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

  // Generate AI assert action
  async generateAiAssert(request: AiAssertRequest): Promise<AiAssertResponse> {
    // Input validation

    if (!request.prompt || request.prompt.trim() === "") {
      return {
        success: false,
        error: "Prompt is required",
      };
    }

    // element or database_results or api_requests is required
    if (!request.elements && !request.database_results && !request.api_requests) {
      return {
        success: false,
        error: "You must provide at least one information to generate AI assert",
      };
    }

    const response = await apiRouter.request<AiAssertResponse>("/actions/generate_assert", {
      method: "POST",
      body: JSON.stringify(request),
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

    async getAssertActions(): Promise<ApiResponse<AssertActionsResponse>> {
        const response = await apiRouter.request<AssertActionsResponse>('/actions/get_assert_actions', {
            method: 'GET'
        });
        return response;
    }

    // Update a single action by ID
    async updateActionById(actionId: string, action: Partial<Action>): Promise<ApiResponse<DefaultResponse>> {
        if (!actionId) {
            return {
                success: false,
                error: 'Valid action ID is required'
            };
        }

        if (!action || Object.keys(action).length === 0) {
            return {
                success: false,
                error: 'Action data is required'
            };
        }

        // Nếu payload có action_data_generation, chuẩn hoá lại version_number theo thứ tự
        let normalizedAction: Partial<Action> = action;
        if (action.action_data_generation && action.action_data_generation.length > 0) {
            normalizedAction = {
                ...action,
                action_data_generation: action.action_data_generation.map((gen, idx) => ({
                    ...gen,
                    version_number: idx + 1,
                })),
            };
        }

        const endpoint = `/actions/${actionId}`;
        const response = await apiRouter.request<DefaultResponse>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(normalizedAction),
        });
        return response;
    }
}