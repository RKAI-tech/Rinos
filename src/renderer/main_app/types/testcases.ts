import { Action } from './actions';

export interface BasicAuthentication {
    basic_authentication_id?: string;
    username: string;
    password: string;
}

export interface TestCase {
    id: number;
    name: string;
    project_id: number;
    projectName: string;
    description?: string;
    script: string;
    status: string;
    createdAt: string;
    basic_authentication?: BasicAuthentication;
}

export interface TestCaseCreateRequest {
    project_id: string;
    name: string;
    tag?: string;
    actions?: Action[];
    basic_authentication?: BasicAuthentication;
}

export interface TestCaseUpdateRequest {
    testcase_id?: string;
    name?: string;
    tag?: string;
    basic_authentication?: BasicAuthentication;
}

export interface TestCaseDeleteRequest {
    testcase_id: string;
}

export interface TestCaseGetRequest {
    project_id: string;
    limit: number;
    offset: number;
}

// Updated TestCase response interface
export interface TestCaseGetResponse {
    testcase_id: string;
    project_id: string;
    name: string;
    tag?: string;
    actions: Action[];
    status: string;
    script: string | null;
    url_video: string | null;
    logs?: string;
    created_at: string;
    updated_at: string;
    basic_authentication?: BasicAuthentication;
}

export interface TestCaseGetAllResponse {
    testcases: TestCaseGetResponse[];
}

export interface ExecuteTestCaseRequest {
    testcase_id: string;
}