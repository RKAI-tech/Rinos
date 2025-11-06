import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { executeApiRequest, validateApiRequest, ApiRequestOptions, formatResponseData, getStatusColorClass, getStatusDescription, convertApiRequestDataToOptions } from '../../utils/api_request';
import { ApiRequestData } from '../../types/actions';
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
  // Initialize with default values or existing data
  const [method, setMethod] = useState<string>(apiRequest?.method || 'GET');
  const [url, setUrl] = useState<string>(apiRequest?.url || 'https://');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    apiRequest?.headers || [{ key: '', value: '' }]
  );
  const [params, setParams] = useState<Array<{ key: string; value: string }>>(
    apiRequest?.params || [{ key: '', value: '' }]
  );
  const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer'>(
    apiRequest?.auth?.type || 'none'
  );
  const [authUsername, setAuthUsername] = useState<string>(apiRequest?.auth?.username || '');
  const [authPassword, setAuthPassword] = useState<string>(apiRequest?.auth?.password || '');
  const [authToken, setAuthToken] = useState<string>(apiRequest?.auth?.token || '');
  const [body, setBody] = useState<string>(apiRequest?.body?.content || '');
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form'>(
    (apiRequest?.body?.type as 'none' | 'json' | 'form') || 'none'
  );
  const [bodyForm, setBodyForm] = useState<Array<{ key: string; value: string }>>(
    apiRequest?.body?.formData || [{ key: '', value: '' }]
  );
  
  // Token storage fields
  const [tokenStorageEnabled, setTokenStorageEnabled] = useState(
    apiRequest?.tokenStorage?.enabled || false
  );
  const [tokenStorageType, setTokenStorageType] = useState<'localStorage' | 'sessionStorage' | 'cookie'>(
    apiRequest?.tokenStorage?.type || 'localStorage'
  );
  const [tokenStorageKey, setTokenStorageKey] = useState(apiRequest?.tokenStorage?.key || '');
  
  // Basic Auth storage fields
  const [basicAuthStorageEnabled, setBasicAuthStorageEnabled] = useState(
    apiRequest?.basicAuthStorage?.enabled || false
  );
  const [basicAuthStorageType, setBasicAuthStorageType] = useState<'localStorage' | 'sessionStorage' | 'cookie'>(
    apiRequest?.basicAuthStorage?.type || 'localStorage'
  );
  const [basicAuthUsernameKey, setBasicAuthUsernameKey] = useState(apiRequest?.basicAuthStorage?.usernameKey || '');
  const [basicAuthPasswordKey, setBasicAuthPasswordKey] = useState(apiRequest?.basicAuthStorage?.passwordKey || '');
  
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
    return JSON.stringify({
      method: req.method,
      url: req.url,
      params: req.params,
      headers: req.headers,
      authType: req.auth?.type,
      bodyType: req.body?.type
    });
  };

  // Sync with prop changes (only when prop actually changes from outside)
  useEffect(() => {
    const currentKey = getApiRequestKey(apiRequest);
    // Only sync if prop actually changed from outside (not from our own onChange)
    if (apiRequest && currentKey !== prevApiRequestRef.current && !isInternalUpdateRef.current) {
      setMethod(apiRequest.method || 'GET');
      setUrl(apiRequest.url || 'https://');
      setHeaders(apiRequest.headers || [{ key: '', value: '' }]);
      setParams(apiRequest.params || [{ key: '', value: '' }]);
      setAuthType(apiRequest.auth?.type || 'none');
      setAuthUsername(apiRequest.auth?.username || '');
      setAuthPassword(apiRequest.auth?.password || '');
      setAuthToken(apiRequest.auth?.token || '');
      setBody(apiRequest.body?.content || '');
      setBodyType(apiRequest.body?.type || 'none');
      setBodyForm(apiRequest.body?.formData || [{ key: '', value: '' }]);
      setTokenStorageEnabled(apiRequest.tokenStorage?.enabled || false);
      setTokenStorageType(apiRequest.tokenStorage?.type || 'localStorage');
      setTokenStorageKey(apiRequest.tokenStorage?.key || '');
      setBasicAuthStorageEnabled(apiRequest.basicAuthStorage?.enabled || false);
      setBasicAuthStorageType(apiRequest.basicAuthStorage?.type || 'localStorage');
      setBasicAuthUsernameKey(apiRequest.basicAuthStorage?.usernameKey || '');
      setBasicAuthPasswordKey(apiRequest.basicAuthStorage?.passwordKey || '');
      prevApiRequestRef.current = currentKey;
    }
    // Reset flag after processing
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
    }
  }, [apiRequest]);

  // Update parent whenever any field changes
  useEffect(() => {
    // Skip initial mount if no apiRequest
    if (!apiRequest) {
      return;
    }

    isInternalUpdateRef.current = true;
    const apiData: ApiRequestData = {
      method,
      url,
      params: params.filter(p => p.key.trim() || p.value.trim()),
      headers: headers.filter(h => h.key.trim() || h.value.trim()),
      auth: {
        type: authType,
        username: authType === 'basic' && !basicAuthStorageEnabled ? authUsername : undefined,
        password: authType === 'basic' && !basicAuthStorageEnabled ? authPassword : undefined,
        token: authType === 'bearer' && !tokenStorageEnabled ? authToken : undefined
      },
      body: {
        type: bodyType,
        content: bodyType === 'json' ? body : 
                bodyType === 'form' ? JSON.stringify(
                  Object.fromEntries(
                    bodyForm
                      .filter(p => p.key.trim())
                      .map(p => [p.key.trim(), p.value])
                  )
                ) : '',
        formData: bodyType === 'form' ? bodyForm.filter(p => p.key.trim() && p.value.trim()) : undefined
      },
      tokenStorage: (tokenStorageEnabled && authType === 'bearer') ? {
        enabled: true,
        type: tokenStorageType,
        key: tokenStorageKey
      } : {
        enabled: false
      },
      basicAuthStorage: (basicAuthStorageEnabled && authType === 'basic') ? {
        enabled: true,
        type: basicAuthStorageType,
        usernameKey: basicAuthUsernameKey,
        passwordKey: basicAuthPasswordKey
      } : {
        enabled: false
      }
    };
    prevApiRequestRef.current = getApiRequestKey(apiData);
    onChange(apiData);
  }, [method, url, headers, params, authType, authUsername, authPassword, authToken, body, bodyType, bodyForm, tokenStorageEnabled, tokenStorageType, tokenStorageKey, basicAuthStorageEnabled, basicAuthStorageType, basicAuthUsernameKey, basicAuthPasswordKey, onChange, apiRequest]);

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
    // Create ApiRequestData for validation (same as ApiRequestModal)
    // When sending, use actual values from inputs (not storage info)
    const apiData: ApiRequestData = {
      method,
      url,
      params,
      headers,
      auth: {
        type: authType,
        username: authUsername,
        password: authPassword,
        token: authToken
      },
      body: {
        type: bodyType,
        content: body,
        formData: bodyForm
      }
    };

    // Convert to ApiRequestOptions for validation
    const options = convertApiRequestDataToOptions(apiData);
    const validation = validateApiRequest(options);

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid request configuration');
      return;
    }

    // Execute request and handle response (same as ApiRequestModal)
    try {
      const response = await executeApiRequest(options);
      
      // Update response state via parent callback
      // Pass the full apiData with storage info for saving, and response data
      const apiDataForSave: ApiRequestData = {
        method,
        url,
        params: params.filter(p => p.key.trim() && p.value.trim()),
        headers: headers.filter(h => h.key.trim() && h.value.trim()),
        auth: {
          type: authType,
          username: authType === 'basic' && !basicAuthStorageEnabled ? authUsername : undefined,
          password: authType === 'basic' && !basicAuthStorageEnabled ? authPassword : undefined,
          token: authType === 'bearer' && !tokenStorageEnabled ? authToken : undefined
        },
        body: {
          type: bodyType,
          content: bodyType === 'json' ? body : 
                  bodyType === 'form' ? JSON.stringify(
                    Object.fromEntries(
                      bodyForm
                        .filter(p => p.key.trim())
                        .map(p => [p.key.trim(), p.value])
                    )
                  ) : '',
          formData: bodyType === 'form' ? bodyForm.filter(p => p.key.trim() && p.value.trim()) : undefined
        },
        tokenStorage: (tokenStorageEnabled && authType === 'bearer') ? {
          enabled: true,
          type: tokenStorageType,
          key: tokenStorageKey
        } : {
          enabled: false
        },
        basicAuthStorage: (basicAuthStorageEnabled && authType === 'basic') ? {
          enabled: true,
          type: basicAuthStorageType,
          usernameKey: basicAuthUsernameKey,
          passwordKey: basicAuthPasswordKey
        } : {
          enabled: false
        }
      };
      
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

