import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { TestCaseDataVersionBatch } from '../types/testcase';

export class TestCaseService {
    async getTestCaseDataVersions(testcaseId: string): Promise<ApiResponse<TestCaseDataVersionBatch>> {
        const response = await apiRouter.request<TestCaseDataVersionBatch>(`/testcases/data_version/get_by_testcase_id/${testcaseId}`, {
            method: 'POST',
            body: JSON.stringify({ testcase_id: testcaseId }),
        });

        // Check if testcase was deleted (404 or Not Found error)
        if (!response.success && response.error) {
            const errorLower = response.error.toLowerCase();
            if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
                console.info(`[TestCaseService] Testcase ${testcaseId} not found (likely deleted), returning empty data versions`);
                return {
                    success: true,
                    data: {
                        testcase_data_versions: []
                    }
                };
            }
        }

        return response;
    }
}