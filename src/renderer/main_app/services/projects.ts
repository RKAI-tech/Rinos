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
    RemoveUserFromProjectRequest,
    ProjectSearchRequest,
    ProjectSearchResponse,
    ProjectGetResponse
} from '../types/projects';

export class ProjectService {
    async getProjects(): Promise<ApiResponse<ProjectGetAllResponse>> {
        // Try different endpoints and methods to see what works
        return await apiRouter.request<ProjectGetAllResponse>('/projects/get_list', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async searchProjects(request: ProjectSearchRequest): Promise<ApiResponse<ProjectSearchResponse>> {
        return await apiRouter.request<ProjectSearchResponse>('/projects/search', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
        if (!projectId) {
            return { success: false, error: 'Project ID is required' };
        }
        
        try {
            // Use dedicated endpoint: GET /projects/get_by_id/{project_id}
            const response = await apiRouter.request<ProjectGetResponse>(`/projects/get_by_id/${projectId}`, {
                method: 'GET',
            });
            
            if (response.success && response.data) {
                // Map ProjectGetResponse to Project interface
                const projectData: Project = {
                    project_id: response.data.project_id,
                    name: response.data.name,
                    description: response.data.description,
                    created_at: response.data.created_at,
                    number_testcase: response.data.number_testcase,
                    number_testsuite: response.data.number_testsuite,
                    number_member: response.data.number_member,
                    user_role: response.data.user_role,
                    user_permissions: response.data.user_permissions,
                    // Set default values for optional fields
                    number_variable: 0,
                    number_database_connection: 0,
                    history: []
                };
                return { success: true, data: projectData };
            }
            
            return { success: false, error: response.error || 'Project not found' };
        } catch (error) {
            return { success: false, error: 'Failed to get project by id' };
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