import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { User, UserRequest, UserResponse } from '../types/user';

export class UserService {
    async getAllUsers(payload: UserRequest = {}): Promise<ApiResponse<UserResponse>> {
        return await apiRouter.request<UserResponse>('/users/get_all_lower_level', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
}
