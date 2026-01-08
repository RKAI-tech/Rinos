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
  for (const action of actions) {
    if (action.action_datas) {
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
  return `async function executeApiRequest(page, apiData = {}) {
  let url = apiData?.url || '';
  try {
    const params = Array.isArray(apiData.params) ? apiData.params : [];
    if (params.length > 0) {
      const valid = params.filter(p => p && p.key && String(p.key).trim() && p.value != null && String(p.value).trim());
      if (valid.length > 0) {
        const search = new URLSearchParams();
        valid.forEach(p => search.append(String(p.key).trim(), String(p.value).trim()));
        const sep = url.includes('?') ? '&' : '?';
        url = \`\${url}\${sep}\${search.toString()}\`;
      }
    }
  } catch (err) {
    try { console.warn('[Controller][API] Build params error', err); } catch (_) {}
  }

  const headers = {};
  try {
    const hdrs = Array.isArray(apiData.headers) ? apiData.headers : [];
    hdrs.forEach(h => {
      if (h && h.key && String(h.key).trim() && h.value != null && String(h.value).trim()) {
        headers[String(h.key).trim()] = String(h.value).trim();
      }
    });
  } catch (err) {
    try { console.warn('[Controller][API] Build headers error', err); } catch (_) {}
  }

  try {
    const auth = apiData.auth;
    if (auth && auth.type === 'bearer') {
      if (auth.token && String(auth.token).trim()) {
        headers['Authorization'] = \`Bearer \${String(auth.token).trim()}\`;
      } else {
        const ts = Array.isArray(auth.token_storages) && auth.token_storages.length > 0 ? auth.token_storages[0] : undefined;
        if (ts && ts.key && ts.type) {
          let bearer = '';
          if (ts.type === 'localStorage') {
            bearer = await page.evaluate(({ k }) => localStorage.getItem(k) || '', { k: ts.key });
          } else if (ts.type === 'sessionStorage') {
            bearer = await page.evaluate(({ k }) => sessionStorage.getItem(k) || '', { k: ts.key });
          } else if (ts.type === 'cookie') {
            bearer = await page.evaluate(({ name }) => {
              const match = document.cookie.split('; ').find(r => r.startsWith(name + '='));
              return match ? decodeURIComponent(match.split('=')[1]) : '';
            }, { name: ts.key });
          }
          if (bearer) headers['Authorization'] = \`Bearer \${bearer}\`;
        }
      }
    } else if (auth && auth.type === 'basic') {
      if (auth.username && auth.password) {
        headers['Authorization'] = 'Basic ' + Buffer.from(\`\${auth.username}:\${auth.password}\`).toString('base64');
      } else {
        const bs = Array.isArray(auth.basic_auth_storages) && auth.basic_auth_storages.length > 0 ? auth.basic_auth_storages[0] : undefined;
        if (bs && bs.type && bs.usernameKey && bs.passwordKey) {
          let creds = { u: '', p: '' };
          if (bs.type === 'localStorage') {
            creds = await page.evaluate(({ uk, pk }) => ({ u: localStorage.getItem(uk) || '', p: localStorage.getItem(pk) || '' }), { uk: bs.usernameKey, pk: bs.passwordKey });
          } else if (bs.type === 'sessionStorage') {
            creds = await page.evaluate(({ uk, pk }) => ({ u: sessionStorage.getItem(uk) || '', p: sessionStorage.getItem(pk) || '' }), { uk: bs.usernameKey, pk: bs.passwordKey });
          } else if (bs.type === 'cookie') {
            creds = await page.evaluate(({ uk, pk }) => {
              const getCookie = (n) => { const match = document.cookie.split('; ').find(r => r.startsWith(n + '=')); return match ? decodeURIComponent(match.split('=')[1]) : ''; };
              return { u: getCookie(uk), p: getCookie(pk) };
            }, { uk: bs.usernameKey, pk: bs.passwordKey });
          }
          if (creds.u && creds.p) {
            headers['Authorization'] = 'Basic ' + Buffer.from(\`\${creds.u}:\${creds.p}\`).toString('base64');
          }
        }
      }
    }
  } catch (err) {
    try { console.warn('[Controller][API] Resolve auth error', err); } catch (_) {}
  }

  const options = { headers };
  try {
    const body = apiData.body;
    if (body && body.type && body.type !== 'none') {
      if (body.type === 'json') {
        options.data = body.content;
      } else if (body.type === 'form' && Array.isArray(body.formData)) {
        const formBody = {};
        body.formData
          .filter(p => p && p.name && String(p.name).trim())
          .forEach(p => { formBody[String(p.name).trim()] = String(p.value ?? ''); });
        options.data = formBody;
      }
    }
  } catch (err) {
    try { console.warn('[Controller][API] Build options error', err); } catch (_) {}
  }

  const method = (apiData.method || 'get').toLowerCase();
  try { console.log('[Controller][API] Sending request', { method, url, hasHeaders: Object.keys(headers).length > 0 }); } catch (_) {}
  const client = page.request;
  const requestFn = typeof client[method] === 'function' ? client[method].bind(client) : client.get.bind(client);
  const response = await requestFn(url, options);
  try { console.log('[Controller][API] Response status:', await response.status()); } catch (_) {}
  return response;
}
`;
}
