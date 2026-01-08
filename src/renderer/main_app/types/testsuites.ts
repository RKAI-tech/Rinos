import { BrowserType } from "./testcases";

// Test Suites
export interface TestSuite {
    test_suite_id: string;
    name: string;
    description: string;
    passed_rate: string;
    number_testcase: number;
    test_passed: string;
    test_failed: string;
    browser_type: BrowserType;
    group_id?: string;
    created_at: string;
    updated_at?: string;
    progress?: number;
}

export interface TestSuiteGetAllResponse {
    test_suites: TestSuite[];
    total: number;
}

export interface TestSuiteCreateRequest {
    project_id: string;
    name: string;
    description: string;
    browser_type?: BrowserType | string;
    group_id?: string;
}

export interface UpdateTestSuiteGroupRequest {
    test_suite_id: string;
    group_id: string | null;
}

export interface TestSuiteGetAllRequest {
    project_id: string;
}

// Add test cases to test suite
export interface TestcaseId {
    testcase_id: string;
    level: number;
}
export interface AddTestCasesToSuiteRequest {
    test_suite_id: string;
    testcase_ids: TestcaseId[];
}

export interface UpdateTestCaseLevelRequest {
    test_suite_id: string;
    testcase_ids: TestcaseId[];
}

export interface AddTestCasesToSuiteResponse {
    message: string;
}

// Get test cases by test suite (legacy - kept for backward compatibility)
export interface GetTestCasesBySuiteRequest {
    test_suite_id: string;
}

export interface TestCaseInSuite {
    testcase_id: string;
    project_id: string;
    evidence_id?: string;
    name: string;
    description: string;
    status: string;
    logs: string;
    created_at: string;
    updated_at: string;
    url_video: string;
    level: number;
    browser_type: BrowserType;
}

export interface GetTestCasesBySuiteResponse {
    testcases: TestCaseInSuite[];
    total: number;
}

// Search test cases by test suite (with pagination, filter, sort)
export interface TestSuiteTestCaseSearchRequest {
    page: number;
    page_size: number;
    q?: string | null;  // search keyword
    sort_by?: string | null;  // field to sort by: name, description, created_at, updated_at, browser_type, level
    order?: string;  // asc or desc, default desc
    level?: number | null;  // filter by level
    status?: string | null;  // filter by evidence status: Draft, Running, Passed, Failed
    browser_type?: string | null;  // filter by browser type
}

export interface TestSuiteTestCaseSearchResponse {
    testcases: TestCaseInSuite[];
    number_testcase: number;
    current_page: number;
    total_pages: number;
}

// Execute Test Suite
export interface ExecuteTestSuiteRequest {
    test_suite_id: string;
}

// Export Test Suite
export interface ExportTestSuiteRequest {
    test_suite_id: string;
}

export interface ExportTestSuiteResponse {
    blob: Blob;
    filename: string;
}