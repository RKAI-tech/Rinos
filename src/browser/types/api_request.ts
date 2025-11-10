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
  api_request_param_id?: string;
  key: string;
  value: string;
}

export interface ApiRequestHeader {
  api_request_header_id?: string;
  key: string;
  value: string;
}

export interface ApiRequestBodyFormData {
  api_request_body_form_data_id?: string;
  name: string;
  value: string;
  orderIndex?: number;
}

export interface ApiRequestBody {
  api_request_id?: string;
  type: ApiRequestBodyType;
  content?: string | null;
  formData?: ApiRequestBodyFormData[];
}

export interface ApiRequestTokenStorage {
  api_request_token_storage_id?: string;
  type: ApiRequestStorageType;
  key: string;
}

export interface ApiRequestBasicAuthStorage {
  api_request_basic_auth_storage_id?: string;
  type: ApiRequestStorageType;
  usernameKey: string;
  passwordKey: string;
  enabled?: boolean;
}

export interface ApiRequestAuth {
  api_request_id?: string;
  type: ApiRequestAuthType;
  storage_enabled?: boolean;
  username?: string;
  password?: string;
  token?: string;
  token_storages?: ApiRequestTokenStorage[];
  basic_auth_storages?: ApiRequestBasicAuthStorage[];
}

export interface ApiRequestData {
  api_request_id?: string;
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


