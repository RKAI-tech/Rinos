import { ApiRequestData, ApiResponse, ApiRequestParam, ApiRequestHeader, ApiRequestAuth, ApiRequestBody } from '../types/actions';

export interface ApiRequestOptions {
  method: string;
  url: string;
  params: Array<{ key: string; value: string }>;
  headers: Array<{ key: string; value: string }>;
  authType: 'none' | 'basic' | 'bearer';
  authUsername?: string;
  authPassword?: string;
  authToken?: string;
  body: string;
  bodyType: 'none' | 'json' | 'form';
  bodyForm?: Array<{ key: string; value: string }>;
}

/**
 * Build URL with query parameters
 */
function buildUrlWithParams(baseUrl: string, params: Array<{ key: string; value: string }>): string {
  const validParams = params.filter(p => p.key.trim() && p.value.trim());
  if (validParams.length === 0) {
    return baseUrl;
  }

  const urlParams = new URLSearchParams();
  validParams.forEach(param => {
    urlParams.append(param.key.trim(), param.value.trim());
  });

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${urlParams.toString()}`;
}

/**
 * Build request headers
 */
function buildRequestHeaders(
  headers: Array<{ key: string; value: string }>,
  authType: 'none' | 'basic' | 'bearer',
  authUsername?: string,
  authPassword?: string,
  authToken?: string,
  bodyType?: 'none' | 'json' | 'form'
): Record<string, string> {
  const requestHeaders: Record<string, string> = {};

  // Add custom headers
  headers.forEach(header => {
    if (header.key.trim() && header.value.trim()) {
      requestHeaders[header.key.trim()] = header.value.trim();
    }
  });

  // Add authorization header
  if (authType === 'basic' && authUsername && authPassword) {
    const credentials = btoa(`${authUsername}:${authPassword}`);
    requestHeaders['Authorization'] = `Basic ${credentials}`;
  } else if (authType === 'bearer' && authToken) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // Add content-type header for body
  if (bodyType === 'json') {
    requestHeaders['Content-Type'] = 'application/json';
  } else if (bodyType === 'form') {
    requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  return requestHeaders;
}

/**
 * Build request body
 */
function buildRequestBody(
  bodyType: 'none' | 'json' | 'form',
  body: string,
  bodyForm?: Array<{ key: string; value: string }>
): string | undefined {
  if (bodyType === 'none') {
    return undefined;
  }

  if (bodyType === 'json') {
    return body || '';
  }

  if (bodyType === 'form' && bodyForm) {
    const validForm = bodyForm.filter(p => p.key.trim() && p.value.trim());
    const formParams = new URLSearchParams();
    validForm.forEach(p => formParams.append(p.key.trim(), p.value.trim()));
    return formParams.toString();
  }

  return undefined;
}

/**
 * Parse response data
 */
function parseResponseData(responseText: string): any {
  try {
    return JSON.parse(responseText);
  } catch {
    return responseText;
  }
}

/**
 * Execute API request with timeout
 */
export async function executeApiRequest(options: ApiRequestOptions, timeoutMs: number = 30000): Promise<ApiResponse> {
  try {
    // Build URL with params
    const requestUrl = buildUrlWithParams(options.url, options.params);

    // Build headers
    const requestHeaders = buildRequestHeaders(
      options.headers,
      options.authType,
      options.authUsername,
      options.authPassword,
      options.authToken,
      options.bodyType
    );

    // Build request body
    const requestBody = buildRequestBody(options.bodyType, options.body, options.bodyForm);

    // Prepare request options
    const requestOptions: RequestInit = {
      method: options.method,
      headers: requestHeaders,
    };

    // Add body for POST, PUT, PATCH methods
    if (['POST', 'PUT', 'PATCH'].includes(options.method) && requestBody !== undefined) {
      requestOptions.body = requestBody;
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
    });

    // Execute request with timeout
    const response = await Promise.race([
      fetch(requestUrl, requestOptions),
      timeoutPromise
    ]);

    const responseText = await response.text();
    
    // Parse response data
    const parsedData = parseResponseData(responseText);

    // Build response headers object
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      data: parsedData,
      headers: responseHeaders,
      success: response.status >= 200 && response.status < 300,
    };

  } catch (error) {
    let errorMessage = 'Unknown error occurred';
    
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        errorMessage = 'Request timeout - please try again';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS error - the server may not allow requests from this origin';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      status: 0,
      data: null,
      headers: {},
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Validate API request options
 */
export function validateApiRequest(options: ApiRequestOptions): { valid: boolean; error?: string } {
  // Check URL
  if (!options.url || options.url === 'https://' || options.url.trim() === '') {
    return { valid: false, error: 'Please enter a valid URL' };
  }

  // Check if URL is properly formatted
  try {
    new URL(options.url);
  } catch {
    return { valid: false, error: 'Please enter a valid URL format' };
  }

  // Check authorization for basic auth
  if (options.authType === 'basic') {
    if (!options.authUsername || !options.authPassword) {
      return { valid: false, error: 'Username and password are required for Basic Auth' };
    }
  }

  // Check authorization for bearer token
  if (options.authType === 'bearer') {
    if (!options.authToken) {
      return { valid: false, error: 'Token is required for Bearer Auth' };
    }
  }

  // Check JSON body format
  if (options.bodyType === 'json' && options.body) {
    try {
      JSON.parse(options.body);
    } catch {
      return { valid: false, error: 'Invalid JSON format in body' };
    }
  }

  return { valid: true };
}

/**
 * Format response data for display
 */
export function formatResponseData(data: any): string {
  if (data === null || data === undefined) {
    return 'null';
  }
  
  if (typeof data === 'string') {
    return data;
  }
  
  if (typeof data === 'object') {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
  
  return String(data);
}

/**
 * Get status code color class
 */
export function getStatusColorClass(status: number): string {
  if (status >= 200 && status < 300) {
    return 'arm-success';
  } else if (status >= 300 && status < 400) {
    return 'arm-warning';
  } else if (status >= 400 && status < 500) {
    return 'arm-error';
  } else if (status >= 500) {
    return 'arm-error';
  } else {
    return 'arm-error';
  }
}

/**
 * Get status code description
 */
export function getStatusDescription(status: number): string {
  const statusDescriptions: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  
  return statusDescriptions[status] || 'Unknown Status';
}

/**
 * Convert ApiRequestData to ApiRequestOptions for execution
 */
export function convertApiRequestDataToOptions(apiData: ApiRequestData): ApiRequestOptions {
  return {
    method: apiData.method,
    url: apiData.url,
    params: apiData.params,
    headers: apiData.headers,
    authType: apiData.auth.type,
    authUsername: apiData.auth.username,
    authPassword: apiData.auth.password,
    authToken: apiData.auth.token,
    body: apiData.body.content,
    bodyType: apiData.body.type,
    bodyForm: apiData.body.formData
  };
}

/**
 * Convert ApiRequestOptions to ApiRequestData for storage
 */
export function convertApiRequestOptionsToData(options: ApiRequestOptions): ApiRequestData {
  return {
    method: options.method,
    url: options.url,
    params: options.params,
    headers: options.headers,
    auth: {
      type: options.authType,
      username: options.authUsername,
      password: options.authPassword,
      token: options.authToken
    },
    body: {
      type: options.bodyType,
      content: options.body,
      formData: options.bodyForm
    }
  };
}

/**
 * Create ApiResponse from execution result
 */
export function createApiResponse(
  status: number,
  data: any,
  headers: Record<string, string>,
  success: boolean,
  error?: string
): ApiResponse {
  return {
    status,
    data,
    headers,
    success,
    error,
    timestamp: Date.now()
  };
}

/**
 * Execute API request using ApiRequestData
 */
export async function executeApiRequestFromData(apiData: ApiRequestData, timeoutMs: number = 30000): Promise<ApiResponse> {
  const options = convertApiRequestDataToOptions(apiData);
  const result = await executeApiRequest(options, timeoutMs);
  return createApiResponse(
    result.status,
    result.data,
    result.headers,
    result.success,
    result.error
  );
}
