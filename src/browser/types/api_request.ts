// Types for API Request (browser side), aligned with recorder/types/actions.ts

export type ApiRequestMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'patch'
  | 'head'
  | 'options'
  | 'trace';

export type ApiRequestBodyType = 'none' | 'json' | 'form';

export type ApiRequestAuthType = 'none' | 'basic' | 'bearer';

export type ApiRequestStorageType = 'cookie' | 'localStorage' | 'sessionStorage';

export interface ApiRequestParam {
  apiRequestParamId?: string;
  key: string;
  value: string;
}

export interface ApiRequestHeader {
  apiRequestHeaderId?: string;
  key: string;
  value: string;
}

export interface ApiRequestBodyFormData {
  apiRequestBodyFormDataId?: string;
  name: string;
  value: string;
  orderIndex?: number;
}

export interface ApiRequestBody {
  apiRequestId?: string;
  type: ApiRequestBodyType;
  content?: string | null;
  formData?: ApiRequestBodyFormData[];
}

export interface ApiRequestTokenStorage {
  apiRequestTokenStorageId?: string;
  type: ApiRequestStorageType;
  key: string;
}

export interface ApiRequestBasicAuthStorage {
  apiRequestBasicAuthStorageId?: string;
  type: ApiRequestStorageType;
  usernameKey: string;
  passwordKey: string;
  enabled?: boolean;
}

export interface ApiRequestAuth {
  apiRequestId?: string;
  type: ApiRequestAuthType;
  storageEnabled?: boolean;
  username?: string;
  password?: string;
  token?: string;
  tokenStorages?: ApiRequestTokenStorage[];
  basicAuthStorages?: ApiRequestBasicAuthStorage[];
}

export interface ApiRequestData {
  apiRequestId?: string;
  createType?: 'system' | 'user';
  url?: string;
  method?: ApiRequestMethod;
  params?: ApiRequestParam[];
  headers?: ApiRequestHeader[];
  auth?: ApiRequestAuth;
  body?: ApiRequestBody;
}

export interface ApiRunRequestPayload {
  method: string;
  url: string;
  headers?: Record<string, string>;
  bodyType?: ApiRequestBodyType;
  body?: string;
  formData?: Array<{ key: string; value: string }>;
}

export interface ApiRunResponse<T = unknown> {
  success: boolean;
  status?: number;
  data?: T;
  headers?: Record<string, string>;
  error?: string;
}


