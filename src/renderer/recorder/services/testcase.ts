import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { TestCaseDataVersionBatch } from '../types/testcase';
import { ActionDataGeneration } from '../types/actions';
import { decryptObject } from './encryption';

/**
 * Xác định các trường cần decrypt trong ActionDataGeneration
 */
function getFieldsToDecryptForActionDataGeneration(gen: ActionDataGeneration): string[] {
    const fields: string[] = [];
    
    // value.value - chỉ decrypt key "value" bên trong dictionary
    if (gen.value && 
        typeof gen.value === 'object' && 
        gen.value.value !== undefined && 
        gen.value.value !== null) {
        fields.push('value.value');
    }
    
    return fields;
}

export class TestCaseService {
    async getTestCaseDataVersions(testcaseId: string, projectId?: string): Promise<ApiResponse<TestCaseDataVersionBatch>> {
        const response = await apiRouter.request<TestCaseDataVersionBatch>(`/testcases/data_version/get_by_testcase_id/${testcaseId}`, {
            method: 'POST',
            body: JSON.stringify({ testcase_id: testcaseId }),
        });

        // Check if testcase was deleted (404 or Not Found error)
        if (!response.success && response.error) {
            const errorLower = response.error.toLowerCase();
            if (errorLower.includes('404') || errorLower.includes('not found') || errorLower.includes('does not exist')) {
                /* console.info(`[TestCaseService] Testcase ${testcaseId} not found (likely deleted), returning empty data versions`); */
                return {
                    success: true,
                    data: {
                        testcase_data_versions: []
                    }
                };
            }
        }

        // Decrypt action_data_generations nếu có projectId và encryption key
        if (response.success && response.data && projectId) {
            try {
                const encryptionKey = await (window as any).encryptionStore?.getKey(projectId);
                if (encryptionKey && response.data.testcase_data_versions) {
                    const decryptedVersions = await Promise.all(
                        response.data.testcase_data_versions.map(async (version) => {
                            const decryptedVersion = { ...version };

                            // Decrypt action_data_generations
                            if (version.action_data_generations && version.action_data_generations.length > 0) {
                                decryptedVersion.action_data_generations = await Promise.all(
                                    version.action_data_generations.map(async (gen) => {
                                        const fieldsToDecrypt = getFieldsToDecryptForActionDataGeneration(gen);
                                        if (fieldsToDecrypt.length > 0) {
                                            return await decryptObject(gen, encryptionKey, fieldsToDecrypt);
                                        }
                                        return gen;
                                    })
                                );
                            }

                            return decryptedVersion;
                        })
                    );

                    return {
                        ...response,
                        data: {
                            ...response.data,
                            testcase_data_versions: decryptedVersions
                        }
                    };
                }
            } catch (error) {
                /* console.error('[TestCaseService] Decryption failed:', error); */
                // Fallback: trả về versions không decrypt nếu có lỗi
            }
        }

        return response;
    }
}