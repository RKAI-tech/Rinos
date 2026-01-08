// File service for renderer process
// Uses ApiRouterLike to make API requests

import { ApiRouterLike } from '../utils/apiRequest';
import { ApiResponse } from '../../main_app/types/api_responses';

export interface GetFileContentRequest {
  file_path: string;
}

export interface GetFileContentResponse {
  file_content: string;
}

export class FileService {
  private apiRouter: ApiRouterLike;

  constructor(apiRouter: ApiRouterLike) {
    this.apiRouter = apiRouter;
  }

  async getFileContent(payload: GetFileContentRequest): Promise<ApiResponse<GetFileContentResponse>> {
    if (!payload || !payload.file_path) {
      return { success: false, error: 'file_path is required' };
    }
    return await this.apiRouter.request<GetFileContentResponse>('/files/get_file_content', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
