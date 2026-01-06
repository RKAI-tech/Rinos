import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import {
    GroupCreateRequest,
    GroupUpdateRequest,
    GroupResponse,
    GroupTreeResponse,
    GroupListResponse,
    GroupTreeItem,
    GroupTreeWithSuitesItem,
    GroupTreeWithSuitesResponse,
} from '../types/group';
import { DefaultResponse } from '../types/api_responses';

export class GroupService {
    async createGroup(payload: GroupCreateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.project_id || !payload.name) {
            return { success: false, error: 'project_id and name are required' };
        }
        return await apiRouter.request<DefaultResponse>('/groups/create', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getByProject(projectId: string): Promise<ApiResponse<GroupListResponse>> {
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        return await apiRouter.request<GroupListResponse>(`/groups/get_by_project/${projectId}`, {
            method: 'GET'
        });
    }
    
    async getTreeWithSuitesByProject(projectId: string): Promise<ApiResponse<GroupTreeWithSuitesResponse>> {
        if (!projectId) {
            return { success: false, error: 'project_id is required' };
        }
        return await apiRouter.request<GroupTreeWithSuitesResponse>(`/groups/tree_with_suites_by_project/${projectId}`, {
            method: 'GET'
        });
    }

    async getTreeWithSuitesByGroupId(groupId: string): Promise<ApiResponse<GroupTreeWithSuitesResponse>> {
        if (!groupId) {
            return { success: false, error: 'group_id is required' };
        }
        return await apiRouter.request<GroupTreeWithSuitesResponse>(`/groups/tree_with_suites_by_group/${groupId}`, {
            method: 'GET'
        });
    }

    async updateGroup(payload: GroupUpdateRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload || !payload.group_id) {
            return { success: false, error: 'group_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/groups/update/${payload.group_id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
    }
    
    async deleteGroup(groupId: string): Promise<ApiResponse<DefaultResponse>> {
        if (!groupId) {
            return { success: false, error: 'group_id is required' };
        }
        return await apiRouter.request<DefaultResponse>(`/groups/${groupId}`, {
            method: 'DELETE'
        });
    }
}