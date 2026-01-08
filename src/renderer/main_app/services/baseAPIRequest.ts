import { config} from '../../env.config';
import { ApiResponse } from '../types/api_responses';

export class ApiRouter {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
    // console.log('[ApiRouter] Initialized with base URL:', this.baseUrl);

  }
  setAuthToken(token: string | null) {
    this.token = token;
    // console.log('[ApiRouter] Auth token set:', token ? '***' : 'null');
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      // console.log('[ApiRouter] Request =>', options.method || 'GET', url);
      // console.log('[ApiRouter] Request headers:', headers);
      if (options.body) {
        // console.log('[ApiRouter] Request body:', options.body);
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // console.log('[ApiRouter] Response status:', response.status);
      // console.log('[ApiRouter] Response headers:', response.headers);

      let data: unknown;
      try {
        data = await response.json();
      } catch (parseError) {
        // console.error('[ApiRouter] Failed to parse JSON response:', parseError);
        const textResponse = await response.text();
        // console.log('[ApiRouter] Raw response text:', textResponse);
        return {
          success: false,
          error: `Invalid JSON response: ${textResponse}`
        };
      }

      // console.log('[ApiRouter] Response <=', url, { status: response.status, data });

      if (!response.ok) {
        return {
          success: false,
          error: (data as any)?.error || (data as any)?.detail || (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      if (endpoint === '/auth/login') {
        return {
          success: true,
          data: data as T
        };
      }

      if ((data as any)?.success !== undefined) {
        return data as ApiResponse<T>;
      } else {
        return {
          success: true,
          data: data as T
        };
      }
    } catch (error) {
      // console.error('[ApiRouter] Request failed:', url, error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: `Unable to connect to server. Please check your internet connection and try again.`
        };
      }
      
      if (error instanceof TypeError && error.message.includes('CORS')) {
        return {
          success: false,
          error: `The server is not allowing requests. Please contact support.`
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred. Please contact support.',
      };
    }
  }

  // Utility methods
  getBaseUrl(): string {
    return this.baseUrl;
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  clearAuth(): void {
    this.token = null;
  }

  async downloadFile(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; blob?: Blob; filename?: string; error?: string }> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText} - ${errorText}`
        };
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Exported.zip';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      return {
        success: true,
        blob,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }
}

// Export singleton instance
export const apiRouter = new ApiRouter();
export default apiRouter;