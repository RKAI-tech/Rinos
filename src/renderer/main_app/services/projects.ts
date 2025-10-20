import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { DefaultResponse } from '../types/api_responses';
import { 
    ProjectGetAllResponse, 
    ProjectCreateRequest, 
    ProjectUpdateRequest, 
    ProjectDeleteRequest, 
    Project, 
    AddUserToProjectRequest,
    UserInProject,
    RemoveUserFromProjectRequest
} from '../types/projects';

export class ProjectService {
    async getProjects(): Promise<ApiResponse<ProjectGetAllResponse>> {
        // Try different endpoints and methods to see what works
        return await apiRouter.request<ProjectGetAllResponse>('/projects/get_list', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
        try {
            const all = await this.getProjects();
            if (all.success && all.data) {
                const projects = (all.data as any).projects as Project[];
                const found = projects.find(p => String((p as any).project_id) === String(projectId));
                if (found) {
                    return { success: true, data: found } as unknown as ApiResponse<Project>;
                }
                return { success: false, error: 'Project not found' } as ApiResponse<Project>;
            }
            return { success: false, error: all.error || 'Failed to load projects' } as ApiResponse<Project>;
        } catch (error) {
            return { success: false, error: 'Failed to get project by id' } as ApiResponse<Project>;
        }
    }

    async createProject(project: ProjectCreateRequest): Promise<ApiResponse<Project>> {
        // Input validation
        if (!project.name || project.name.trim().length === 0) {
            return {
                success: false,
                error: 'Project name is required'
            };
        }

        // description không còn bắt buộc

        return await apiRouter.request<Project>('/projects/create', {
            method: 'POST',
            body: JSON.stringify(project),
        });
    }

    async updateProject(project: ProjectUpdateRequest): Promise<ApiResponse<Project>> {
        // Input validation
        if (!project.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        if (project.name !== undefined && project.name.trim().length === 0) {
            return {
                success: false,
                error: 'Project name cannot be empty'
            };
        }

        return await apiRouter.request<Project>(`/projects/update`, {
            method: 'PUT',
            body: JSON.stringify(project),
        });
    }

    async deleteProject(payload: ProjectDeleteRequest): Promise<ApiResponse<DefaultResponse>> {
        // Input validation
        if (!payload.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        return await apiRouter.request<DefaultResponse>(`/projects/delete/${payload.project_id}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
    }

    async addUserToProject(payload: AddUserToProjectRequest): Promise<ApiResponse<DefaultResponse>> {
        if (!payload.project_id) {
            return {
                success: false,
                error: 'Valid project ID is required'
            };
        }

        if (!payload.users || !Array.isArray(payload.users) || payload.users.length === 0) {
            return {
                success: false,
                error: 'At least one user is required'
            };
        }

        return await apiRouter.request<DefaultResponse>(`/projects/${payload.project_id}/add_users`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }

    async getUsersInProject(projectId: string): Promise<ApiResponse<UserInProject[]>> {
        return await apiRouter.request<UserInProject[]>(`/projects/${projectId}/users`, {
            method: 'GET',
        });
    }

    async removeUserFromProject(payload: RemoveUserFromProjectRequest): Promise<ApiResponse<DefaultResponse>> {
        return await apiRouter.request<DefaultResponse>(`/projects/${payload.project_id}/users/${payload.user_id}`, {
            method: 'DELETE',
            body: JSON.stringify(payload)
        });
    }
}