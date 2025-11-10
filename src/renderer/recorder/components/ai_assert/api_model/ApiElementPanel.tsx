import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { executeApiRequest, validateApiRequest, ApiRequestOptions, formatResponseData, getStatusColorClass, getStatusDescription, convertApiRequestDataToOptions } from '../../../utils/api_request';
import { ApiRequestData, ApiRequestTokenStorage, ApiRequestBasicAuthStorage, ApiRequestBody, ApiRequestMethod, ApiRequestAuth } from '../../../types/actions';
import './ApiElementPanel.css';

interface ApiElementPanelProps {
  apiRequest?: ApiRequestData;
  apiResponse?: { status: number; data: any; headers: any };
  onChange: (data: ApiRequestData) => void;
  onSendRequest: (data: ApiRequestData, response?: { status: number; data: any; headers: any }) => Promise<void>;
  isSending?: boolean;
}

const ApiElementPanel: React.FC<ApiElementPanelProps> = ({
  apiRequest,
  apiResponse,
  onChange,
  onSendRequest,
  isSending = false
}) => {
  const getPrimaryAuth = (req?: ApiRequestData) => {
    if (!req) return undefined;
    if (req.auth && req.auth.type) return req.auth;
    return undefined;
  };

  const getPrimaryBody = (req?: ApiRequestData) => {
    if (!req) return undefined;
    if (req.body && req.body.type) return req.body;
    return undefined;
  };

  const getPrimaryTokenStorage = (req?: ApiRequestData) => {
    const auth = getPrimaryAuth(req);
    if (auth?.token_storages && auth.token_storages.length > 0) {
      return auth.token_storages[0];
    }
    return undefined;
  };

  const getPrimaryBasicAuthStorage = (req?: ApiRequestData) => {
    const auth = getPrimaryAuth(req);
    if (auth?.basic_auth_storages && auth.basic_auth_storages.length > 0) {
      return auth.basic_auth_storages[0];
    }
    return undefined;
  };

  const toFormPairs = (formData?: any[]) => {
    if (!formData || formData.length === 0) {
      return [{ key: '', value: '' }];
    }
    return formData.map((item: any) => ({ key: item.name ?? item.key ?? '', value: item.value ?? '' }));
  };

  const primaryAuth = getPrimaryAuth(apiRequest);
  const primaryBody = getPrimaryBody(apiRequest);
  const primaryTokenStorage = getPrimaryTokenStorage(apiRequest);
  const primaryBasicStorage = getPrimaryBasicAuthStorage(apiRequest);

  // Initialize with default values or existing data
  const [method, setMethod] = useState<string>((apiRequest?.method || 'get').toString().toUpperCase());
  const [url, setUrl] = useState<string>(apiRequest?.url || 'https://');
  const initialHeaders = apiRequest?.headers?.map(h => ({ key: h.key, value: h.value })) || [];
  const initialParams = apiRequest?.params?.map(p => ({ key: p.key, value: p.value })) || [];
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    initialHeaders.length > 0 ? initialHeaders : [{ key: '', value: '' }]
  );
  const [params, setParams] = useState<Array<{ key: string; value: string }>>(
    initialParams.length > 0 ? initialParams : [{ key: '', value: '' }]
  );
  const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer'>(
    (primaryAuth?.type as 'none' | 'basic' | 'bearer') || 'none'
  );
  const [authUsername, setAuthUsername] = useState<string>(primaryAuth?.username || '');
  const [authPassword, setAuthPassword] = useState<string>(primaryAuth?.password || '');
  const [authToken, setAuthToken] = useState<string>(primaryAuth?.token || '');
  const [body, setBody] = useState<string>(primaryBody?.content || '');
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form'>(
    (primaryBody?.type as 'none' | 'json' | 'form') || 'none'
  );
  const initialBodyForm = bodyType === 'form' ? toFormPairs(primaryBody?.formData) : [];
  const [bodyForm, setBodyForm] = useState<Array<{ key: string; value: string }>>(
    bodyType === 'form' ? (initialBodyForm.length > 0 ? initialBodyForm : [{ key: '', value: '' }]) : [{ key: '', value: '' }]
  );

  // Token storage fields
  const [tokenStorageEnabled, setTokenStorageEnabled] = useState<boolean>(
    authType === 'bearer' && !!primaryTokenStorage
  );
  const [tokenStorageType, setTokenStorageType] = useState<'localStorage' | 'sessionStorage' | 'cookie'>(
    primaryTokenStorage?.type || 'localStorage'
  );
  const [tokenStorageKey, setTokenStorageKey] = useState(primaryTokenStorage?.key || '');

  // Basic Auth storage fields
  const [basicAuthStorageEnabled, setBasicAuthStorageEnabled] = useState<boolean>(
    authType === 'basic' && !!primaryBasicStorage
  );
  const [basicAuthStorageType, setBasicAuthStorageType] = useState<'localStorage' | 'sessionStorage' | 'cookie'>(
    primaryBasicStorage?.type || 'localStorage'
  );
  const [basicAuthUsernameKey, setBasicAuthUsernameKey] = useState(primaryBasicStorage?.usernameKey || '');
  const [basicAuthPasswordKey, setBasicAuthPasswordKey] = useState(primaryBasicStorage?.passwordKey || '');

  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [fetchedTokenValue, setFetchedTokenValue] = useState<string | null>(null);
  const [fetchedBasicUsername, setFetchedBasicUsername] = useState<string | null>(null);
  const [fetchedBasicPassword, setFetchedBasicPassword] = useState<string | null>(null);
  const [isFetchingBasic, setIsFetchingBasic] = useState(false);

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  // Track if we're updating from internal changes to avoid sync loop
  const isInternalUpdateRef = useRef(false);
  const prevApiRequestRef = useRef<string>('');

  // Helper to create a stable string representation for comparison
  const getApiRequestKey = (req?: ApiRequestData): string => {
    if (!req) return '';
    const auth = getPrimaryAuth(req);
    const bodyData = getPrimaryBody(req);
    return JSON.stringify({
      method: req.method,
      url: req.url,
      params: req.params,
      headers: req.headers,
      authType: auth?.type,
      tokenStorageKey: auth?.token_storages?.[0]?.key,
      basicAuthUsernameKey: auth?.basic_auth_storages?.[0]?.usernameKey,
      bodyType: bodyData?.type
    });
  };

  // Sync with prop changes (only when prop actually changes from outside)
  useEffect(() => {
    const currentKey = getApiRequestKey(apiRequest);
    if (apiRequest && currentKey !== prevApiRequestRef.current && !isInternalUpdateRef.current) {
      const nextPrimaryAuth = getPrimaryAuth(apiRequest);
      const nextPrimaryBody = getPrimaryBody(apiRequest);
      const nextPrimaryTokenStorage = getPrimaryTokenStorage(apiRequest);
      const nextPrimaryBasicStorage = getPrimaryBasicAuthStorage(apiRequest);

      setMethod((apiRequest.method || 'get').toString().toUpperCase());
      setUrl(apiRequest.url || 'https://');
      const nextHeaders = apiRequest.headers?.map(h => ({ key: h.key, value: h.value })) || [];
      setHeaders(nextHeaders.length > 0 ? nextHeaders : [{ key: '', value: '' }]);
      const nextParams = apiRequest.params?.map(p => ({ key: p.key, value: p.value })) || [];
      setParams(nextParams.length > 0 ? nextParams : [{ key: '', value: '' }]);
      setAuthType((nextPrimaryAuth?.type as 'none' | 'basic' | 'bearer') || 'none');
      setAuthUsername(nextPrimaryAuth?.username || '');
      setAuthPassword(nextPrimaryAuth?.password || '');
      setAuthToken(nextPrimaryAuth?.token || '');
      setBody(nextPrimaryBody?.content || '');
      const nextBodyType = (nextPrimaryBody?.type as 'none' | 'json' | 'form') || 'none';
      setBodyType(nextBodyType);
      if (nextBodyType === 'form') {
        const nextBodyForm = toFormPairs(nextPrimaryBody?.formData);
        setBodyForm(nextBodyForm.length > 0 ? nextBodyForm : [{ key: '', value: '' }]);
      } else {
        setBodyForm([{ key: '', value: '' }]);
      }

      const hasTokenStorage = (nextPrimaryAuth?.type === 'bearer' && !!nextPrimaryTokenStorage);
      setTokenStorageEnabled(hasTokenStorage);
      setTokenStorageType(nextPrimaryTokenStorage?.type || 'localStorage');
      setTokenStorageKey(nextPrimaryTokenStorage?.key || '');

      const hasBasicStorage = (nextPrimaryAuth?.type === 'basic' && !!nextPrimaryBasicStorage);
      setBasicAuthStorageEnabled(hasBasicStorage);
      setBasicAuthStorageType(nextPrimaryBasicStorage?.type || 'localStorage');
      setBasicAuthUsernameKey(nextPrimaryBasicStorage?.usernameKey || '');
      setBasicAuthPasswordKey(nextPrimaryBasicStorage?.passwordKey || '');

      prevApiRequestRef.current = currentKey;
    }
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
    }
  }, [apiRequest]);

  const buildApiRequestData = (opts: { forSave: boolean }): ApiRequestData => {
    const { forSave } = opts;
    const normalizedMethod = (method || 'GET').toLowerCase() as ApiRequestMethod;

    const currentPrimaryAuth = getPrimaryAuth(apiRequest);
    const currentPrimaryBody = getPrimaryBody(apiRequest);
    const currentPrimaryTokenStorage = getPrimaryTokenStorage(apiRequest);
    const currentPrimaryBasicStorage = getPrimaryBasicAuthStorage(apiRequest);

    const filteredParams = params
      .filter((p) => p.key.trim() || p.value.trim())
      .map((p, index) => {
        const existing = apiRequest?.params?.[index];
        return {
          api_request_param_id: existing?.api_request_param_id,
          key: p.key.trim(),
          value: p.value,
          orderIndex: index,
        };
      });

    const filteredHeaders = headers
      .filter((h) => h.key.trim() || h.value.trim())
      .map((h, index) => {
        const existing = apiRequest?.headers?.[index];
        return {
          api_request_header_id: existing?.api_request_header_id,
          key: h.key.trim(),
          value: h.value,
          orderIndex: index,
        };
      });

    const bodyEntries = bodyForm
      .filter((p) => p.key.trim())
      .map((p, index) => {
        const existing = currentPrimaryBody?.formData?.[index];
        return {
          api_request_body_form_data_id: existing?.api_request_body_form_data_id,
          name: p.key.trim(),
          value: p.value,
          orderIndex: index,
        };
      });

    const nextBody: ApiRequestBody = {
      ...(currentPrimaryBody || {}),
      type: bodyType,
      content:
        bodyType === 'json'
          ? body
          : bodyType === 'form'
            ? undefined
            : '',
      formData: bodyType === 'form' ? bodyEntries : undefined,
    };

    const includeBearerStorage = authType === 'bearer' && tokenStorageEnabled && tokenStorageKey.trim();
    const includeBasicStorage = authType === 'basic' && basicAuthStorageEnabled && basicAuthUsernameKey.trim() && basicAuthPasswordKey.trim();

    const nextTokenStorage: ApiRequestTokenStorage | undefined = includeBearerStorage
      ? {
          ...(currentPrimaryTokenStorage || {}),
          type: tokenStorageType,
          key: tokenStorageKey.trim(),
        }
      : undefined;

    const nextBasicStorage: ApiRequestBasicAuthStorage | undefined = includeBasicStorage
      ? {
          ...(currentPrimaryBasicStorage || {}),
          type: basicAuthStorageType,
          usernameKey: basicAuthUsernameKey.trim(),
          passwordKey: basicAuthPasswordKey.trim(),
        }
      : undefined;

    const shouldHideBasicCreds = forSave && authType === 'basic' && basicAuthStorageEnabled;
    const shouldHideBearerToken = forSave && authType === 'bearer' && tokenStorageEnabled;

    const nextAuth: ApiRequestAuth = {
      ...(currentPrimaryAuth || {}),
      type: authType,
      storage_enabled: (authType !== 'none') && (tokenStorageEnabled || basicAuthStorageEnabled) ? true : false,
      username: authType === 'basic' && !shouldHideBasicCreds ? authUsername : undefined,
      password: authType === 'basic' && !shouldHideBasicCreds ? authPassword : undefined,
      token: authType === 'bearer' && !shouldHideBearerToken ? authToken : undefined,
      token_storages: nextTokenStorage ? [nextTokenStorage] : [],
      basic_auth_storages: nextBasicStorage ? [nextBasicStorage] : [],
    };

    const data: ApiRequestData = {
      ...(apiRequest || {}),
      method: normalizedMethod,
      url,
      params: filteredParams,
      headers: filteredHeaders,
      createdAt: undefined,
      updatedAt: undefined,
      auth: nextAuth.type === 'none' ? { type: 'none' } : nextAuth,
      body: nextBody,
    } as ApiRequestData;

    return data;
  };

  // Update parent whenever any field changes
  useEffect(() => {
    isInternalUpdateRef.current = true;
    const apiDataForSave = buildApiRequestData({ forSave: true });
    prevApiRequestRef.current = getApiRequestKey(apiDataForSave);
    onChange(apiDataForSave);
  }, [method, url, headers, params, authType, authUsername, authPassword, authToken, body, bodyType, bodyForm, tokenStorageEnabled, tokenStorageType, tokenStorageKey, basicAuthStorageEnabled, basicAuthStorageType, basicAuthUsernameKey, basicAuthPasswordKey, onChange]);

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const handleAddParam = () => {
    setParams([...params, { key: '', value: '' }]);
  };

  const handleRemoveParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const handleParamChange = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...params];
    newParams[index][field] = value;
    setParams(newParams);
  };

  const handleFetchToken = async () => {
    try {
      if (!tokenStorageEnabled) {
        toast.error('Token storage is not enabled');
        return;
      }
      if (!tokenStorageKey || !tokenStorageKey.trim()) {
        toast.error('Please enter a token key');
        return;
      }
      setIsFetchingToken(true);
      setFetchedTokenValue(null);
      const source = tokenStorageType === 'localStorage'
        ? 'local'
        : tokenStorageType === 'sessionStorage'
        ? 'session'
        : 'cookie';
      const api = (window as any)?.browserAPI?.browser;
      if (!api?.getAuthValue) {
        toast.error('IPC getAuthValue is not available');
        setIsFetchingToken(false);
        return;
      }
      const val = await api.getAuthValue(source, tokenStorageKey);
      if (typeof val === 'string') {
        setAuthToken(val);
        setFetchedTokenValue(val);
        toast.success('Fetched token successfully');
      } else {
        toast.warn('Token not found');
      }
    } catch (e) {
      console.error('Fetch token failed:', e);
      toast.error('Fetch token failed');
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleFetchBasicAuth = async () => {
    try {
      if (!basicAuthStorageEnabled) return;
      if (authType !== 'basic') return;
      if (!basicAuthUsernameKey.trim() || !basicAuthPasswordKey.trim()) return;
      setIsFetchingBasic(true);
      const api = (window as any)?.browserAPI?.browser;
      if (!api?.getBasicAuthFromStorage) return;
      const payload: any = {
        type: basicAuthStorageType,
        usernameKey: basicAuthUsernameKey,
        passwordKey: basicAuthPasswordKey
      };
      const result = await api.getBasicAuthFromStorage(payload);
      setFetchedBasicUsername(result?.username ?? '');
      setFetchedBasicPassword(result?.password ?? '');
    } catch (e) {
    } finally {
      setIsFetchingBasic(false);
    }
  };

  const handleSendRequest = async () => {
    const runtimeApiData = buildApiRequestData({ forSave: false });

    const options = convertApiRequestDataToOptions(runtimeApiData);
    const validation = validateApiRequest(options);

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid request configuration');
      return;
    }

    // Execute request and handle response (same as ApiRequestModal)
    try {
      const response = await executeApiRequest(options);

      const apiDataForSave = buildApiRequestData({ forSave: true });
      
      // Call onSendRequest to update parent with apiData and response (same pattern as ApiRequestModal)
      // Pass response so parent can update apiResponse without executing again
      await onSendRequest(apiDataForSave, {
        status: response.status,
        data: response.data,
        headers: response.headers
      });

      if (response.success) {
        toast.success(`Request sent successfully! Status: ${response.status}`);
      } else {
        toast.error(`Request failed! Status: ${response.status}${response.error ? ` - ${response.error}` : ''}`);
      }
    } catch (error) {
      console.error('Request failed:', error);
      toast.error('Request failed: ' + (error as Error).message);
    }
  };

  const isValidUrl = url && url !== 'https://' && url.trim() !== '';

  return (
    <div className="aiam-db-box" style={{ padding: '12px' }}>
      {/* Method and URL */}
      <div className="aep-method-url">
        <select 
          className="aep-method-select" 
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {httpMethods.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          className="aep-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
        />
        <button
          className="aep-send-btn"
          onClick={handleSendRequest}
          disabled={isSending || !isValidUrl}
        >
          {isSending ? 'Sending...' : 'SEND'}
        </button>
      </div>

      {/* Params Section */}
      <div className="aep-section">
        <div className="aep-section-header">
          <span className="aep-section-title">Params</span>
        </div>
        <div className="aep-params">
          {params.map((param, index) => (
            <div key={index} className="aep-param-row">
              <input
                className="aep-param-key"
                type="text"
                placeholder="Key"
                value={param.key}
                onChange={(e) => handleParamChange(index, 'key', e.target.value)}
              />
              <input
                className="aep-param-value"
                type="text"
                placeholder="Value"
                value={param.value}
                onChange={(e) => handleParamChange(index, 'value', e.target.value)}
              />
              <button 
                className="aep-remove-btn"
                onClick={() => handleRemoveParam(index)}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="aep-add-param">
            <button className="aep-add-btn" onClick={handleAddParam}>
              + ADD PARAM
            </button>
          </div>
        </div>
      </div>

      {/* Headers Section */}
      <div className="aep-section">
        <div className="aep-section-header">
          <span className="aep-section-title">Headers</span>
        </div>
        <div className="aep-headers">
          {headers.map((header, index) => (
            <div key={index} className="aep-header-row">
              <input
                className="aep-header-key"
                type="text"
                placeholder="Header name"
                value={header.key}
                onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
              />
              <input
                className="aep-header-value"
                type="text"
                placeholder="Value"
                value={header.value}
                onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
              />
              <button 
                className="aep-remove-btn"
                onClick={() => handleRemoveHeader(index)}
              >
                ✕
              </button>
            </div>
          ))}
          <div className="aep-add-header">
            <button className="aep-add-btn" onClick={handleAddHeader}>
              + ADD HEADER
            </button>
          </div>
        </div>
      </div>

      {/* Authorization Section */}
      <div className="aep-section">
        <div className="aep-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="aep-section-title">Authorization</span>
          {authType !== 'none' && (
            <label className="aep-checkbox-container" style={{ marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={tokenStorageEnabled || basicAuthStorageEnabled}
                onChange={(e) => {
                  if (authType === 'bearer') {
                    setTokenStorageEnabled(e.target.checked);
                  } else if (authType === 'basic') {
                    setBasicAuthStorageEnabled(e.target.checked);
                  }
                }}
              />
              <span className="aep-checkbox-label">Enable storage</span>
            </label>
          )}
        </div>
        <select 
          className="aep-auth-select" 
          value={authType} 
          onChange={(e) => {
            setAuthType(e.target.value as any);
            setTokenStorageEnabled(false);
            setBasicAuthStorageEnabled(false);
          }}
        >
          <option value="none">None</option>
          <option value="basic">Basic Auth</option>
          <option value="bearer">Bearer Token</option>
        </select>
        
        {authType === 'basic' && !basicAuthStorageEnabled && (
          <div className="aep-auth-fields">
            <input
              className="aep-auth-input"
              type="text"
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
            />
            <input
              className="aep-auth-input"
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />
          </div>
        )}
        
        {authType === 'bearer' && !tokenStorageEnabled && (
          <div className="aep-auth-fields">
            <input
              className="aep-auth-input"
              type="text"
              placeholder="Token"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Token Storage Section */}
      {tokenStorageEnabled && authType === 'bearer' && (
        <div className="aep-section">
          <div className="aep-section-header">
            <span className="aep-section-title">Token Storage</span>
          </div>
          <div className="aep-token-storage">
            <div className="aep-storage-type">
              <label className="aep-label">Storage Type</label>
              <select 
                className="aep-storage-select" 
                value={tokenStorageType} 
                onChange={(e) => setTokenStorageType(e.target.value as any)}
              >
                <option value="localStorage">Local Storage</option>
                <option value="sessionStorage">Session Storage</option>
                <option value="cookie">Cookie</option>
              </select>
            </div>
            <div className="aep-storage-key">
              <label className="aep-label">{tokenStorageType === 'cookie' ? 'Cookie Name' : 'Storage Key'} <span style={{ color: 'red' }}>*</span></label>
              <input
                className="aep-storage-input"
                type="text"
                placeholder="e.g., auth_token, access_token"
                value={tokenStorageKey}
                onChange={(e) => setTokenStorageKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tokenStorageKey.trim()) {
                    e.preventDefault();
                    handleFetchToken();
                  }
                }}
                style={{ width: '100%' }}
              />
              {tokenStorageKey.trim() && (
                <button 
                  className="aep-add-btn"
                  onClick={handleFetchToken}
                  disabled={isFetchingToken}
                  style={{ marginTop: 8 }}
                >
                  {isFetchingToken ? 'Fetching...' : 'SEND'}
                </button>
              )}
              {fetchedTokenValue !== null && (
                <div style={{ marginTop: 8 }}>
                  <input
                    className="aep-storage-input"
                    type="text"
                    placeholder="Stored value"
                    value={fetchedTokenValue ?? ''}
                    onChange={() => {}}
                    readOnly
                    tabIndex={-1}
                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', width: '100%' }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Basic Auth Storage Section */}
      {basicAuthStorageEnabled && authType === 'basic' && (
        <div className="aep-section">
          <div className="aep-section-header">
            <span className="aep-section-title">Basic Auth Storage</span>
          </div>
          <div className="aep-token-storage">
            <div className="aep-storage-type">
              <label className="aep-label">Storage Type</label>
              <select 
                className="aep-storage-select" 
                value={basicAuthStorageType} 
                onChange={(e) => setBasicAuthStorageType(e.target.value as any)}
              >
                <option value="localStorage">Local Storage</option>
                <option value="sessionStorage">Session Storage</option>
                <option value="cookie">Cookie</option>
              </select>
            </div>
            {basicAuthStorageType === 'localStorage' || basicAuthStorageType === 'sessionStorage' ? (
              <div className="aep-basic-auth-keys">
                <div className="aep-storage-key">
                  <label className="aep-label">Username Key <span style={{ color: 'red' }}>*</span></label>
                  <input
                    className="aep-storage-input"
                    type="text"
                    placeholder="e.g., basic_username, auth_username"
                    value={basicAuthUsernameKey}
                    onChange={(e) => setBasicAuthUsernameKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && basicAuthUsernameKey.trim() && basicAuthPasswordKey.trim()) {
                        e.preventDefault();
                        handleFetchBasicAuth();
                      }
                    }}
                  />
                </div>
                <div className="aep-storage-key">
                  <label className="aep-label">Password Key <span style={{ color: 'red' }}>*</span></label>
                  <input
                    className="aep-storage-input"
                    type="text"
                    placeholder="e.g., basic_password, auth_password"
                    value={basicAuthPasswordKey}
                    onChange={(e) => setBasicAuthPasswordKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && basicAuthUsernameKey.trim() && basicAuthPasswordKey.trim()) {
                        e.preventDefault();
                        handleFetchBasicAuth();
                      }
                    }}
                  />
                </div>
              </div>
            ) : basicAuthStorageType === 'cookie' ? (
              <div className="aep-basic-auth-keys">
                <div className="aep-storage-key">
                  <label className="aep-label">Username Cookie Name</label>
                  <input
                    className="aep-storage-input"
                    type="text"
                    placeholder="e.g., basic_username, auth_username"
                    value={basicAuthUsernameKey}
                    onChange={(e) => setBasicAuthUsernameKey(e.target.value)}
                  />
                </div>
                <div className="aep-storage-key">
                  <label className="aep-label">Password Cookie Name</label>
                  <input
                    className="aep-storage-input"
                    type="text"
                    placeholder="e.g., basic_password, auth_password"
                    value={basicAuthPasswordKey}
                    onChange={(e) => setBasicAuthPasswordKey(e.target.value)}
                  />
                </div>
              </div>
            ) : null}
            {(basicAuthUsernameKey.trim() && basicAuthPasswordKey.trim()) && (
              <button 
                className="aep-add-btn"
                onClick={handleFetchBasicAuth}
                disabled={isFetchingBasic}
                style={{ marginTop: 8 }}
              >
                {isFetchingBasic ? 'Fetching...' : 'SEND'}
              </button>
            )}
            {(fetchedBasicUsername !== null || fetchedBasicPassword !== null) && (
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input
                  className="aep-storage-input"
                  type="text"
                  placeholder="Username value"
                  value={fetchedBasicUsername ?? ''}
                  onChange={() => {}}
                  readOnly
                  tabIndex={-1}
                  style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', width: '100%' }}
                />
                <input
                  className="aep-storage-input"
                  type="text"
                  placeholder="Password value"
                  value={fetchedBasicPassword ?? ''}
                  onChange={() => {}}
                  readOnly
                  tabIndex={-1}
                  style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', width: '100%' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Body Section */}
      <div className="aep-section">
        <div className="aep-section-header">
          <span className="aep-section-title">Body</span>
        </div>
        <select 
          className="aep-body-type-select" 
          value={bodyType} 
          onChange={(e) => setBodyType(e.target.value as 'none' | 'json' | 'form')}
        >
          <option value="none">None</option>
          <option value="json">JSON</option>
          <option value="form">Form Data</option>
        </select>
        
        {bodyType === 'json' && (
          <textarea
            className="aep-body-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            rows={6}
          />
        )}

        {bodyType === 'form' && (
          <div className="aep-params">
            {bodyForm.map((pair, index) => (
              <div key={index} className="aep-param-row">
                <input
                  className="aep-param-key"
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => {
                    const next = [...bodyForm];
                    next[index] = { ...next[index], key: e.target.value };
                    setBodyForm(next);
                  }}
                />
                <input
                  className="aep-param-value"
                  type="text"
                  placeholder="Value"
                  value={pair.value}
                  onChange={(e) => {
                    const next = [...bodyForm];
                    next[index] = { ...next[index], value: e.target.value };
                    setBodyForm(next);
                  }}
                />
                <button 
                  className="aep-remove-btn"
                  onClick={() => setBodyForm(bodyForm.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="aep-add-param">
              <button className="aep-add-btn" onClick={() => setBodyForm([...bodyForm, { key: '', value: '' }])}>
                + ADD FIELD
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Response Section */}
      {apiResponse && (
        <div className="aep-section">
          <div className="aep-section-header">
            <span className="aep-section-title">Response</span>
          </div>
          <div className="aep-response">
            <div className="aep-response-status">
              Status: <span className={`aep-status-code ${getStatusColorClass(apiResponse.status).replace('arm-', 'aep-')}`}>
                {apiResponse.status} {getStatusDescription(apiResponse.status)}
              </span>
            </div>
            <div className="aep-response-content">
              <pre className="aep-response-data">
                {formatResponseData(apiResponse.data)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiElementPanel;

