import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { UpdateProfilePayload, UserMeResponse } from '../types/user';

export class UserService {
  async getMe(): Promise<ApiResponse<UserMeResponse>> {
    return await apiRouter.request<UserMeResponse>('/users/me', { method: 'GET' });
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<any>> {
    return await apiRouter.request<any>('/users/update_profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async unactivateAccount(): Promise<ApiResponse<any>> {
    return await apiRouter.request<any>('/users/unactivate_account', {
      method: 'PUT',
    });
  }
}

export const userService = new UserService();
export default userService;

