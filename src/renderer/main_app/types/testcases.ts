import { Action } from './actions';

export interface BasicAuthentication {
    basic_authentication_id?: string;
    username: string;
    password: string;
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
    actions?: Action[];
}

export interface TestCaseDeleteRequest {
    testcase_id: string;
}

export interface TestCaseGetRequest {
    project_id: string;
    limit: number;
    offset: number;
}
export interface Evidence {
    evidence_id: string;
    url_video: string;
    url_screenshot: string[];
    logs: string;
}

export interface TestCase {
    testcase_id: string;
    project_id: string;
    name: string;
    description?: string;
    actions: Action[];
    status: 'Passed' | 'Failed' | 'Draft' | 'Running';
    evidence_id?: string | null;
    evidence?: Evidence;
    created_at: string;
    updated_at: string;
    basic_authentication?: BasicAuthentication | null;
}

export interface TestCaseBatch {
    testcases: TestCase[];
}

export interface ExecuteTestCaseRequest {
    testcase_id: string;
}