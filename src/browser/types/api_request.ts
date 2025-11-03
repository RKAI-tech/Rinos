// Types for API Request (browser side), designed to mirror the style in renderer/recorder/types/actions.ts

export interface ApiRequestParam {
  key: string;
  value: string;
}

export interface ApiRequestHeader {
  key: string;
  value: string;
}

export type ApiRequestBodyType = 'none' | 'json' | 'form';

export interface ApiRequestBody {
  type: ApiRequestBodyType;
  content: string;
  formData?: ApiRequestParam[];
}

export type ApiRequestAuthType = 'none' | 'basic' | 'bearer';

export interface ApiRequestAuth {
  type: ApiRequestAuthType;
  username?: string;
  password?: string;
  token?: string;
}

export interface ApiRequestTokenStorage {
  enabled: boolean;
  type?: 'localStorage' | 'sessionStorage' | 'cookie';
  key?: string;
}

export interface ApiRequestBasicAuthStorage {
  enabled: boolean;
  type?: 'localStorage' | 'sessionStorage' | 'cookie';
  usernameKey?: string;
  passwordKey?: string;
}

export interface ApiRequestData {
  method: string;
  url: string;
  params: ApiRequestParam[];
  headers: ApiRequestHeader[];
  auth: ApiRequestAuth;
  body: ApiRequestBody;
  tokenStorage?: ApiRequestTokenStorage;
  basicAuthStorage?: ApiRequestBasicAuthStorage;
}

export interface ApiRunRequestPayload {
  method: string;
  url: string;
  headers?: Record<string, string>;
  bodyType?: ApiRequestBodyType;
  body?: string;
  formData?: ApiRequestParam[];
}

export interface ApiRunResponse<T = unknown> {
  success: boolean;
  status?: number;
  data?: T;
  headers?: Record<string, string>;
  error?: string;
}


