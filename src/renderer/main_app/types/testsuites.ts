// Test Suites
export interface TestSuite {
    test_suite_id: string;
    name: string;
    description: string;
    passed_rate: string;
    number_testcase: number;
    test_passed: string;
    test_failed: string;
    created_at: string;
    updated_at?: string;
}

export interface TestSuiteGetAllResponse {
    test_suites: TestSuite[];
    total: number;
}

export interface TestSuiteCreateRequest {
    project_id: string;
    name: string;
    description: string;
}

export interface TestSuiteGetAllRequest {
    project_id: string;
}

// Add test cases to test suite
export interface AddTestCasesToSuiteRequest {
    test_suite_id: string;
    testcase_ids: string[];
}

export interface AddTestCasesToSuiteResponse {
    message: string;
}

// Get test cases by test suite
export interface GetTestCasesBySuiteRequest {
    test_suite_id: string;
}

export interface TestCaseInSuite {
    testcase_id: string;
    project_id: string;
    name: string;
    description: string;
    status: string;
    logs: string;
    created_at: string;
    updated_at: string;
    url_video: string;
}

export interface GetTestCasesBySuiteResponse {
    testcases: TestCaseInSuite[];
    total: number;
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