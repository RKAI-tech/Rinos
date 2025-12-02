import { apiRouter } from './baseAPIRequest';

export interface VersionCheckResponse {
  success: boolean;
  data?: {
    is_latest: boolean;
    latest_version: string;
    release_note: string;
  };
  error?: string;
}

export const versionCheckService = {
  async checkVersion(currentVersion: string): Promise<VersionCheckResponse> {
    try {
      const response = await apiRouter.request<{
        is_latest: boolean;
        latest_version: string;
        release_note: string;
      }>('/admin/app_releases/is_latest_version', {
        method: 'POST',
        body: JSON.stringify({version: currentVersion }),
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check version',
      };
    }
  },
};

