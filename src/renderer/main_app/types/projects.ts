export interface ProjectGetAllResponse {
    projects: Project[];
    number_project: number;
}

export interface ProjectCreateRequest {
    name: string;
    description: string;
}

export interface ProjectDeleteRequest {
    project_id: string;
}

export interface Project {
    project_id: string;
    name: string;
    description: string;
    created_at: string;
    number_testcase: number;
    number_testsuite: number;
    number_variable: number;
    number_database_connection: number;
    number_member: number;
    userRole: string;
}

export interface ProjectUpdateRequest {
    project_id: string;
    name?: string;
    description?: string;
}