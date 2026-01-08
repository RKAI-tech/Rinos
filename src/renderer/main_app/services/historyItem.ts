import { apiRouter } from './baseAPIRequest';
import { ApiResponse, DefaultResponse } from '../types/api_responses';
import {
    HistoryListResponse,
    ProjectHistoriesRequest,
    ProjectTestcaseHistoriesRequest,
    ProjectTestsuiteHistoriesRequest,
    DeleteHistoryResponse,
    DeleteHistoryRequest,
    HistorySearchRequest,
    HistorySearchResponse
} from '../types/historyItem';

export class HistoryItemService {
    // Project histories: GET /project/{project_id}
    async getProjectHistories(request: ProjectHistoriesRequest): Promise<ApiResponse<HistoryListResponse>> {
        return await apiRouter.request<HistoryListResponse>(`/histories/project/${request.project_id}`, {
            method: 'GET'
        });
    }

    // Testcase histories: GET /project/{project_id}/testcases/{testcase_id}
    async getProjectTestcaseHistories(request: ProjectTestcaseHistoriesRequest): Promise<ApiResponse<HistoryListResponse>> {
        return await apiRouter.request<HistoryListResponse>(
            `/histories/project/${encodeURIComponent(request.project_id)}/testcases/${encodeURIComponent(request.testcase_id)}`,
            {
                method: 'GET'
            }
        );
    }

    // Testsuite histories: GET /project/{project_id}/test-suites/{testsuite_id}
        async getProjectTestsuiteHistories(request: ProjectTestsuiteHistoriesRequest): Promise<ApiResponse<HistoryListResponse>> {
        return await apiRouter.request<HistoryListResponse>(
            `/histories/project/${request.project_id}/test-suites/${request.testsuite_id}`,
            {
                method: 'GET'
            }
        );
    }

    // Delete history item: DELETE /{history_id} (needs project_id as param)
    async deleteHistory(request: DeleteHistoryRequest): Promise<ApiResponse<DeleteHistoryResponse>> {
        return await apiRouter.request<DeleteHistoryResponse>(`/histories/${request.history_id}`, {
            method: 'DELETE',
            body: JSON.stringify(request)
        });
    }

    // Delete all history items: DELETE /project/{project_id}/all
    async deleteAllHistory(project_id: string): Promise<ApiResponse<DefaultResponse>> {
        return await apiRouter.request<DefaultResponse>(`/histories/project/${project_id}/all`, {
            method: 'DELETE'
        });
    }

    // Search histories: POST /histories/search
    async searchHistories(request: HistorySearchRequest): Promise<ApiResponse<HistorySearchResponse>> {
        if (!request.project_id) {
            return { success: false, error: 'Project ID is required for search' };
        }
        return await apiRouter.request<HistorySearchResponse>('/histories/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }
}
