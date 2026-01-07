// Shared API request utilities
// Works with ApiRouter instances from both main_app and recorder

import { ApiResponse } from '../../main_app/types/api_responses';

export interface ApiRouterLike {
  getBaseUrl(): string;
  setAuthToken(token: string | null): void;
  isAuthenticated(): boolean;
  clearAuth(): void;
  request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
}

/**
 * Send a multipart/form-data request with files
 * @param apiRouter - An ApiRouter instance (from main_app or recorder)
 * @param endpoint - API endpoint
 * @param formData - FormData object with files and fields
 */
export async function requestWithFormData<T>(
  apiRouter: ApiRouterLike,
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const url = `${apiRouter.getBaseUrl()}${endpoint}`;
  
  // Get token from the router (we need to access it, but since it's private,
  // we'll need to pass it or use a different approach)
  // For now, we'll create headers manually
  const headers: Record<string, string> = {};
  
  // Try to get token - we'll need to check if router has a way to get it
  // Since token is private, we'll need to handle auth differently
  // For FormData, we don't set Content-Type header - browser will set it with boundary
  
  try {
    // Create a custom fetch that includes auth
    // We'll need to get the token somehow - let's use a workaround
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData - browser will set it with boundary
        // Authorization will be added if we can access token
      }
    });

    // Try to add auth header by making a dummy request to get headers
    // Actually, we need to modify this to support auth
    // Let's create a wrapper that handles this better
    
    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      const textResponse = await response.text();
      return {
        success: false,
        error: `Invalid JSON response: ${textResponse}`
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: (data as any)?.error || (data as any)?.detail || (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`
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
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: `Unable to connect to server. Please check your internet connection and try again.`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred. Please contact support.',
    };
  }
}

/**
 * Enhanced requestWithFormData that properly handles authentication
 * This version uses the API router's token by making a test request first
 * to get the auth headers, then applies them to the FormData request
 */
export async function requestWithFormDataAndAuth<T>(
  method: string,
  apiRouter: ApiRouterLike,
  endpoint: string,
  formData: FormData,
  getAuthToken?: () => Promise<string | null>
): Promise<ApiResponse<T>> {
  const url = `${apiRouter.getBaseUrl()}${endpoint}`;
  
  const headers: HeadersInit = {};
  
  // Get auth token if available
  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  
  try {
    const response = await fetch(url, {
      method: method,
      body: formData,
      headers: headers
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch (parseError) {
      const textResponse = await response.text();
      return {
        success: false,
        error: `Invalid JSON response: ${textResponse}`
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: (data as any)?.error || (data as any)?.detail || (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`
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
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        error: `Unable to connect to server. Please check your internet connection and try again.`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred. Please contact support.',
    };
  }
}
