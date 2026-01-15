// Evidence service for updating evidence with files
import { ApiResponse } from '../../main_app/types/api_responses';
import { EvidenceStatus, EvidenceUpdateFiles } from '../types/testExecution';
import { requestWithFormDataAndAuth } from '../utils/apiRequest';
import { ApiRouterLike } from '../utils/apiRequest';

export class EvidenceService {
  private apiRouter: ApiRouterLike;

  private async getAuthToken(): Promise<string | null> {
    const token = await (window as any).tokenStore?.get?.();
    return token || null;
  }

  constructor(apiRouter: ApiRouterLike) {
    this.apiRouter = apiRouter;
  }

  /**
   * Update evidence status only (without files)
   */
  async updateEvidenceStatus(
    evidenceId: string,
    status: EvidenceStatus
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('evidence_id', evidenceId);
    formData.append('status', status);

    return await requestWithFormDataAndAuth(
      'PUT',
      this.apiRouter,
      '/runcode/update_evidence',
      formData,
      async () => await this.getAuthToken()
    );
  }

  /**
   * Update evidence with status and files
   */
  async updateEvidence(
    evidenceId: string,
    status: EvidenceStatus,
    files?: EvidenceUpdateFiles
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('evidence_id', evidenceId);
    formData.append('status', status);

    if (files) {
      if (files.video_file) {
        formData.append('video_file', files.video_file);
      }
      
      if (files.log_file) {
        formData.append('log_file', files.log_file);
      }
      
      if (files.image_files && files.image_files.length > 0) {
        for (const imageFile of files.image_files) {
          formData.append('image_files', imageFile);
        }
      }
      
      if (files.database_files && files.database_files.length > 0) {
        for (const databaseFile of files.database_files) {
          formData.append('database_files', databaseFile);
        }
      }
      
      if (files.api_files && files.api_files.length > 0) {
        for (const apiFile of files.api_files) {
          formData.append('api_files', apiFile);
        }
      }
    }

    return await requestWithFormDataAndAuth(
      'PUT',
      this.apiRouter,
      '/runcode/update_evidence',
      formData,
      async () => await this.getAuthToken()
    );
  }
}
