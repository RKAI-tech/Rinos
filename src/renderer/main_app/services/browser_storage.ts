import { apiRouter } from './baseAPIRequest';
import { ApiResponse, DefaultResponse } from '../types/api_responses';
import {
	BrowserStorageCreateRequest,
	BrowserStorageUpdateRequest,
	BrowserStorageResponse,
	BrowserStorageListResponse,
	BrowserStorageSearchRequest,
	BrowserStorageSearchResponse
} from '../types/browser_storage';

export class BrowserStorageService {
	async createBrowserStorage(payload: BrowserStorageCreateRequest): Promise<ApiResponse<DefaultResponse>> {
		if (!payload?.project_id || !payload?.name || payload.value === undefined) {
			return { success: false, error: 'project_id, name, value are required' };
		}
		return await apiRouter.request<DefaultResponse>('/browser-storage/create', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	}

	async updateBrowserStorage(cookiesId: string, payload: BrowserStorageUpdateRequest): Promise<ApiResponse<DefaultResponse>> {
		if (!cookiesId) {
			return { success: false, error: 'cookies_id is required' };
		}
		return await apiRouter.request<DefaultResponse>(`/browser-storage/${cookiesId}`, {
			method: 'PUT',
			body: JSON.stringify(payload)
		});
	}

	async deleteBrowserStorage(cookiesId: string): Promise<ApiResponse<DefaultResponse>> {
		if (!cookiesId) {
			return { success: false, error: 'cookies_id is required' };
		}
		return await apiRouter.request<DefaultResponse>(`/browser-storage/${cookiesId}`, {
			method: 'DELETE'
		});
	}

	async getBrowserStoragesByProject(projectId: string, limit?: number, offset?: number): Promise<ApiResponse<BrowserStorageListResponse>> {
		if (!projectId) {
			return { success: false, error: 'project_id is required' };
		}
		const query = new URLSearchParams();
		if (typeof limit === 'number') query.set('limit', String(limit));
		if (typeof offset === 'number') query.set('offset', String(offset));
		const qs = query.toString();
		const endpoint = `/browser-storage/get_by_project/${projectId}${qs ? `?${qs}` : ''}`;
		return await apiRouter.request<BrowserStorageListResponse>(endpoint, { method: 'GET' });
	}

	async searchBrowserStorages(request: BrowserStorageSearchRequest): Promise<ApiResponse<BrowserStorageSearchResponse>> {
		// Input validation
		if (!request.project_id) {
			return {
				success: false,
				error: 'Valid project ID is required'
			};
		}

		return await apiRouter.request<BrowserStorageSearchResponse>('/browser-storage/search', {
			method: 'POST',
			body: JSON.stringify(request),
		});
	}
}

export const browserStorageService = new BrowserStorageService();

