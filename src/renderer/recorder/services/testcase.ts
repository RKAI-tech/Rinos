import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { TestCaseDataVersionBatch } from '../types/testcase';

export class TestCaseService {
    async getTestCaseDataVersions(testcaseId: string): Promise<ApiResponse<TestCaseDataVersionBatch>> {
        return await apiRouter.request<TestCaseDataVersionBatch>(`/testcases/data_version/get_by_testcase_id/${testcaseId}`, {
            method: 'POST',
            body: JSON.stringify({ testcase_id: testcaseId }),
        });
    }
}