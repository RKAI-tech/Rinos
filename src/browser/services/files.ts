import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { GetFileContentRequest, GetFileContentResponse } from '../types/files';

export class FileService {
    async getFileContent(payload: GetFileContentRequest): Promise<ApiResponse<GetFileContentResponse>> {
        if (!payload || !payload.file_path) {
            return { success: false, error: 'file_path is required' };
        }
        return await apiRouter.request<GetFileContentResponse>('/files/get_file_content', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    }
}