export interface ProjectGetAllResponse {
    projects: Project[];
    number_project: number;
}

export interface ProjectCreateRequest {
    name: string;
    description?: string;
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
    user_role: string;
    user_permissions: string;
}

export interface ProjectUpdateRequest {
    project_id: string;
    name?: string;
    description?: string;
}

export interface UserPermissionToProject {
    user_id: string;
    role?: string;
    project_permissions: string;
}

export interface AddUserToProjectRequest {
    users: UserPermissionToProject[];
    project_id: string;
}

export interface UserInProject {
    user_id: string;
    email?: string;
    role?: string;
    permissions?: string;
}