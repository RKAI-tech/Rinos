import { Action } from './actions';


export interface TestCase {
    id: number;
    name: string;
    project_id: number;
    projectName: string;
    description?: string;
    script: string;
    status: 'active' | 'inactive';
    createdAt: string;
}

export interface TestCaseCreateRequest {
    project_id: string;
    name: string;
    tag?: string;
    actions?: Action[];
}

export interface TestCaseUpdateRequest {
    testcase_id?: string;
    name?: string;
    tag?: string;
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
    url: string | null;
    logs?: string;
    created_at: string;
    updated_at: string;
}

export interface TestCaseGetAllResponse {
    testcases: TestCaseGetResponse[];
}

export interface ExecuteTestCaseRequest {
    testcase_id: string;
}