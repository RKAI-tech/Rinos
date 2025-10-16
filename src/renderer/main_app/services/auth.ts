import { apiRouter } from './baseAPIRequest';
import { ApiResponse } from '../types/api_responses';
import { 
  LoginWithMicrosoftRequest, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest,
  AuthMeResponse,
  ValidateTokenRequest
} from '../types/auth';

export class AuthService {
  // Authentication
  async loginWithMicrosoft(credentials: LoginWithMicrosoftRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiRouter.request<LoginResponse>('/auth/microsoft-login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (response.success && response.data && response.data.access_token) {
      apiRouter.setAuthToken(response.data.access_token);
      // console.log('[AuthService] Login with Microsoft successful, token set');
    }
    return response;
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    // Input validation
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const response = await apiRouter.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // console.log('[AuthService] Login response:', response);
    if (response.success && response.data && response.data.access_token) {
      apiRouter.setAuthToken(response.data.access_token);
      // console.log('[AuthService] Login successful, token set');
    }

    return response;
  }

  async register(credentials: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    // Input validation
    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const response = await apiRouter.request<LoginResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // console.log('[AuthService] Register response:', response);
    if (response.success && response.data && response.data.access_token) {
      apiRouter.setAuthToken(response.data.access_token);
      // console.log('[AuthService] Register successful, token set');
    }

    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await apiRouter.request<void>('/auth/logout', {
      method: 'POST',
    });

    apiRouter.clearAuth();
    // console.log('[AuthService] Logout successful, token cleared');

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<AuthMeResponse>> {
    const response = await apiRouter.request<AuthMeResponse>('/auth/me');
    // console.log('[AuthService] Get current user response:', response);
    return response;
  }

  async refreshToken(): Promise<ApiResponse<LoginResponse>> {
    const response = await apiRouter.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });
    
    if (response.success && response.data && response.data.access_token) {
      apiRouter.setAuthToken(response.data.access_token);
      // console.log('[AuthService] Token refreshed successfully');
    }

    return response;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return apiRouter.isAuthenticated();
  }

  clearAuth(): void {
    apiRouter.clearAuth();
  }

  async validateToken(token: string): Promise<ApiResponse<LoginResponse>> {
    const response = await apiRouter.request<LoginResponse>(
      `/auth/validate_token/${token}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response;
  }
}
// Export singleton instance
export const authService = new AuthService();
export default authService;
