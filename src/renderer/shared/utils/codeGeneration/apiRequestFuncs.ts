// API request functions for code generation
// Ported from downloads/api_request_funcs.txt

import { ApiRequestData } from '../../types/actions';
import { enumToStr, sanitizeStr } from './base';

export function serializeApiRequest(apiRequest: ApiRequestData | null | undefined): any {
  if (!apiRequest) {
    return {};
  }
  
  const result: any = {
    url: sanitizeStr(apiRequest.url) || '',
    method: enumToStr(apiRequest.method, 'get'),
    params: [],
    headers: [],
    auth: null,
    body: null,
  };

  const params = apiRequest.params || [];
  for (const param of params) {
    const key = sanitizeStr(param.key);
    const value = sanitizeStr(param.value);
    result.params.push({ key, value });
  }

  const headers = apiRequest.headers || [];
  for (const header of headers) {
    const key = sanitizeStr(header.key);
    const value = sanitizeStr(header.value);
    result.headers.push({ key, value });
  }

  const auth = apiRequest.auth;
  if (auth) {
    const authDict: any = {
      type: enumToStr(auth.type, 'none'),
      storage_enabled: Boolean(auth.storage_enabled || auth.storageEnabled || false),
      username: sanitizeStr(auth.username),
      password: sanitizeStr(auth.password),
      token: sanitizeStr(auth.token),
      token_storages: [],
      basic_auth_storages: [],
    };

    const tokenStorages = auth.token_storages || [];
    for (const tokenStorage of tokenStorages) {
      authDict.token_storages.push({
        key: sanitizeStr(tokenStorage.key),
        type: enumToStr(tokenStorage.type, '', false),
      });
    }

    const basicAuthStorages = auth.basic_auth_storages || [];
    for (const basicStorage of basicAuthStorages) {
      authDict.basic_auth_storages.push({
        usernameKey: sanitizeStr(basicStorage.username_key || basicStorage.usernameKey),
        passwordKey: sanitizeStr(basicStorage.password_key || basicStorage.passwordKey),
        type: enumToStr(basicStorage.type, '', false),
      });
    }

    result.auth = authDict;
  }

  const body = apiRequest.body;
  if (body) {
    const bodyDict: any = {
      type: enumToStr(body.type, 'none'),
      content: body.content,
      formData: [],
    };

    const formDatas = body.form_data || body.formData || [];
    for (const formData of formDatas) {
      bodyDict.formData.push({
        name: sanitizeStr(formData.name),
        value: sanitizeStr(formData.value),
        order_index: formData.order_index || formData.orderIndex,
      });
    }

    result.body = bodyDict;
  }

  return result;
}

export function needsApiRequestSupport(actions: any[]): boolean {
  if (!Array.isArray(actions)) {
    return false;
  }
  for (const action of actions) {
    if (action.action_datas && Array.isArray(action.action_datas)) {
      for (const ad of action.action_datas) {
        if (ad.api_request) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getExecuteApiRequestFunctionString(): string {
  return "import { executeApiRequest } from './helpers.js';\n";
}
