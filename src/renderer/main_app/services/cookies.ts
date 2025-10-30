import { apiRouter } from './baseAPIRequest';
import { ApiResponse, DefaultResponse } from '../types/api_responses';
import {
	CookiesCreateRequest,
	CookiesUpdateRequest,
	CookiesResponse,
	CookiesListResponse
} from '../types/cookies';

export class CookiesService {
	async createCookie(payload: CookiesCreateRequest): Promise<ApiResponse<DefaultResponse>> {
		if (!payload?.project_id || !payload?.name || payload.value === undefined) {
			return { success: false, error: 'project_id, name, value are required' };
		}
		return await apiRouter.request<DefaultResponse>('/cookies/create', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	}

	async updateCookie(cookiesId: string, payload: CookiesUpdateRequest): Promise<ApiResponse<DefaultResponse>> {
		if (!cookiesId) {
			return { success: false, error: 'cookies_id is required' };
		}
		return await apiRouter.request<DefaultResponse>(`/cookies/${cookiesId}`, {
			method: 'PUT',
			body: JSON.stringify(payload)
		});
	}

	async deleteCookie(cookiesId: string): Promise<ApiResponse<DefaultResponse>> {
		if (!cookiesId) {
			return { success: false, error: 'cookies_id is required' };
		}
		return await apiRouter.request<DefaultResponse>(`/cookies/${cookiesId}`, {
			method: 'DELETE'
		});
	}

	async getCookiesByProject(projectId: string, limit?: number, offset?: number): Promise<ApiResponse<CookiesListResponse>> {
		if (!projectId) {
			return { success: false, error: 'project_id is required' };
		}
		const query = new URLSearchParams();
		if (typeof limit === 'number') query.set('limit', String(limit));
		if (typeof offset === 'number') query.set('offset', String(offset));
		const qs = query.toString();
		const endpoint = `/cookies/get_by_project/${projectId}${qs ? `?${qs}` : ''}`;
		return await apiRouter.request<CookiesListResponse>(endpoint, { method: 'GET' });
	}
}

export const cookiesService = new CookiesService();


