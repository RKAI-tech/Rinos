import { Action } from './actions';

export enum BrowserType {
  chrome = "chrome",
  firefox = "firefox",
  edge = "edge",
  safari = "safari",
}

export interface BasicAuthentication {
    basic_authentication_id?: string;
    username: string;
    password: string;
}

export interface TestCaseCreateRequest {
    project_id: string;
    name: string;
    tag?: string;
    browser_type?: BrowserType | string;
    actions?: Action[];
    basic_authentication?: BasicAuthentication;
}

export interface TestCaseUpdateRequest {
    testcase_id?: string;
    name?: string;
    tag?: string;
    browser_type?: BrowserType | string;
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

export interface Screenshot {
    screenshot_id: string;
    url: string;
}
export interface Video {
    video_id: string;
    url: string;
}
export interface Log {
    log_id: string;
    content: string;
}
export interface Evidence {
    evidence_id: string;
    video: Video | null;
    screenshots: Screenshot[] | null;
    log: Log | null;
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
    browser_type: BrowserType | string;
    basic_authentication?: BasicAuthentication | null;
}

export interface TestCaseBatch {
    testcases: TestCase[];
}

export interface ExecuteTestCaseRequest {
    testcase_id: string;
}

export interface TestCaseSearchRequest {
    project_id: string;
    page: number;
    page_size: number;
    q?: string | null;  // search keyword
    status?: string | null;  // filter by status: Passed, Failed, Draft, Running
    sort_by?: string | null;  // field to sort by: name, description, created_at, updated_at, browser_type
    order?: string | null;  // asc or desc
}

export interface TestCaseSearchResponse {
    testcases: TestCase[];
    number_testcase: number;
    current_page: number;
    total_pages: number;
}