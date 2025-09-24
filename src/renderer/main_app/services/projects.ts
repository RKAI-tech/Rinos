import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { DefaultResponse } from '../types/api_responses';
import { ProjectGetAllResponse, ProjectCreateRequest, ProjectUpdateRequest, ProjectDeleteRequest, Project } from '../types/projects';

export class ProjectService {
    async getProjects(): Promise<ApiResponse<ProjectGetAllResponse>> {
        // Try different endpoints and methods to see what works
        let response;
        
        try {
            // First try the original endpoint without pagination parameters
            response = await apiRouter.request<ProjectGetAllResponse>('/projects/get_list', {
                method: 'POST',
                body: JSON.stringify({}),
            });
        } catch (error) {
            console.warn('First attempt failed, trying GET method:', error);
            try {
                // Try GET method without query parameters
                response = await apiRouter.request<ProjectGetAllResponse>('/projects/get_list', {
                    method: 'GET',
                });
            } catch (error2) {
                console.warn('GET method failed, trying /projects endpoint:', error2);
                // Try different endpoint
                response = await apiRouter.request<ProjectGetAllResponse>('/projects', {
                    method: 'GET',
                });
            }
        }

        // console.log('Raw API response:', JSON.stringify(response, null, 2));

        // console.log('Projects response:', response);
        // console.log('Projects response.data type:', typeof response.data);
        if (response.data && typeof response.data === 'object') {
            // console.log('Projects response.data keys:', Object.keys(response.data));
        }

        // Handle different response structures
        if (response.success && response.data) {
            let projectsArray: any[] = [];
            let totalProjects: number = 0;
            
            // Check if data has the new structure with projects and number_project
            if (typeof response.data === 'object' && response.data !== null && 'projects' in response.data && 'number_project' in response.data) {
                projectsArray = (response.data as any).projects;
                totalProjects = (response.data as any).number_project;
            }
            // Check if data is already an array (fallback for old API)
            else if (Array.isArray(response.data)) {
                projectsArray = response.data as any[];
                totalProjects = (response.data as any[]).length;
            }
            // Check if data has a projects property (common API pattern)
            else if (typeof response.data === 'object' && response.data !== null && 'projects' in response.data && Array.isArray((response.data as any).projects)) {
                projectsArray = (response.data as any).projects;
                totalProjects = (response.data as any).total || (response.data as any).count || projectsArray.length;
            }
            // Check if data has a data property (nested structure)
            else if (typeof response.data === 'object' && response.data !== null && 'data' in response.data && Array.isArray((response.data as any).data)) {
                projectsArray = (response.data as any).data;
                totalProjects = (response.data as any).total || (response.data as any).count || projectsArray.length;
            }
            // Check if data has an items property (pagination pattern)
            else if (typeof response.data === 'object' && response.data !== null && 'items' in response.data && Array.isArray((response.data as any).items)) {
                projectsArray = (response.data as any).items;
                totalProjects = (response.data as any).total || (response.data as any).count || projectsArray.length;
            }
            else {
                console.error('Unexpected projects response structure:', response.data);
                return {
                    success: false,
                    error: 'Invalid response structure: projects data is not in expected format'
                };
            }

            // Normalize and map project fields to match frontend expectations
            const normalizedProjects = projectsArray.map((project: any) => ({
                project_id: project.project_id || project.id,
                name: project.name,
                description: project.description,
                created_at: project.created_at || project.createdAt,
                number_testcase: project.number_testcase || 0,
                number_testsuite: project.number_testsuite || 0,
                number_variable: project.number_variable || 0,
                number_database_connection: project.number_database_connection || 0,
                number_member: project.number_member || 0,
                userRole: project.userRole || 'MEMBER'
            }));

            return {
                success: true,
                data: {
                    projects: normalizedProjects,
                    number_project: totalProjects
                }
            };
        }

        // If the API call failed, propagate the failure so the UI can show an error state
        if (!response.success) {
            const errorMessage = String(response.error || '');
            // Gracefully handle backend validation error complaining about missing number_project
            // Treat it as an empty list so the UI shows the proper empty state
            if (/number_project/i.test(errorMessage) || /ProjectGetAllResponse/i.test(errorMessage)) {
                console.warn('[ApiRouter] Backend validation error for projects. Falling back to empty list. Error:', errorMessage);
                return {
                    success: true,
                    data: {
                        projects: [],
                        number_project: 0
                    }
                } as ApiResponse<ProjectGetAllResponse>;
            }
            return response;
        }

        return response;
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

        if (!project.description || project.description.trim().length === 0) {
            return {
                success: false,
                error: 'Project description is required'
            };
        }

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
}