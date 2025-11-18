import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { executeApiRequest, validateApiRequest, ApiRequestOptions, formatResponseData, getStatusColorClass, getStatusDescription, convertApiRequestDataToOptions } from '../../utils/api_request';
import { ApiRequestData } from '../../types/actions';
import './ApiRequestModal.css';

interface ApiRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ApiRequestData) => void;
  initialData?: Partial<ApiRequestData>;
}

const ApiRequestModal: React.FC<ApiRequestModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialData
}) => {
  const [method, setMethod] = useState<string>(initialData?.method || 'GET');
  const [url, setUrl] = useState<string>(initialData?.url || 'https://');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    initialData?.headers || [{ key: '', value: '' }]
  );
  const [params, setParams] = useState<Array<{ key: string; value: string }>>(
    initialData?.params || [{ key: '', value: '' }]
  );
  const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer'>(
    initialData?.auth?.type || 'none'
  );
  const [authUsername, setAuthUsername] = useState<string>(initialData?.auth?.username || '');
  const [authPassword, setAuthPassword] = useState<string>(initialData?.auth?.password || '');
  const [authToken, setAuthToken] = useState<string>(initialData?.auth?.token || '');
  const [body, setBody] = useState<string>(initialData?.body?.content || '');
  const [bodyType, setBodyType] = useState<'none' | 'json' | 'form'>(
    (initialData?.body?.type as 'none' | 'json' | 'form') || 'none'
  );
  const [bodyForm, setBodyForm] = useState<Array<{ key: string; value: string }>>([]);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<{ status: number; data: any; headers: any } | null>(null);
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [fetchedTokenValue, setFetchedTokenValue] = useState<string | null>(null);
  const [fetchedBasicUsername, setFetchedBasicUsername] = useState<string | null>(null);
  const [fetchedBasicPassword, setFetchedBasicPassword] = useState<string | null>(null);
  const [isFetchingBasic, setIsFetchingBasic] = useState(false);
  
  // Token storage fields
  const [tokenStorageEnabled, setTokenStorageEnabled] = useState(false);
  const [tokenStorageType, setTokenStorageType] = useState<'localStorage' | 'sessionStorage' | 'cookie'>('localStorage');
  const [tokenStorageKey, setTokenStorageKey] = useState('');
  
  // Basic Auth storage fields
  const [basicAuthStorageEnabled, setBasicAuthStorageEnabled] = useState(false);
  const [basicAuthStorageType, setBasicAuthStorageType] = useState<'localStorage' | 'sessionStorage' | 'cookie'>('localStorage');
  const [basicAuthUsernameKey, setBasicAuthUsernameKey] = useState('');
  const [basicAuthPasswordKey, setBasicAuthPasswordKey] = useState('');
  const [basicAuthSelector, setBasicAuthSelector] = useState('');
  const [basicAuthUsernameAttribute, setBasicAuthUsernameAttribute] = useState('');
  const [basicAuthPasswordAttribute, setBasicAuthPasswordAttribute] = useState('');

  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  useEffect(() => {
    if (isOpen && !initialData) {
      // Reset form when opening without initial data
      setMethod('GET');
      setUrl('https://');
      setHeaders([{ key: '', value: '' }]);
      setParams([{ key: '', value: '' }]);
      setAuthType('none');
      setAuthUsername('');
      setAuthPassword('');
      setAuthToken('');
      setBody('');
      setBodyType('none');
      setBodyForm([{ key: '', value: '' }]);
      setResponse(null); // Clear previous response
      setTokenStorageEnabled(false);
      setTokenStorageType('localStorage');
      setTokenStorageKey('');
      setBasicAuthStorageEnabled(false);
      setBasicAuthStorageType('localStorage');
      setBasicAuthUsernameKey('');
      setBasicAuthPasswordKey('');
      setBasicAuthSelector('');
      setBasicAuthUsernameAttribute('');
      setBasicAuthPasswordAttribute('');
    } else if (isOpen && initialData) {
      // Initialize form with existing data
      setMethod(initialData.method || 'GET');
      setUrl(initialData.url || 'https://');
      setHeaders(initialData.headers || [{ key: '', value: '' }]);
      setParams(initialData.params || [{ key: '', value: '' }]);
      setAuthType(initialData.auth?.type || 'none');
      setAuthUsername(initialData.auth?.username || '');
      setAuthPassword(initialData.auth?.password || '');
      setAuthToken(initialData.auth?.token || '');
      setBody(initialData.body?.content || '');
      setBodyType(initialData.body?.type || 'none');
      setBodyForm(initialData.body?.form_data ? initialData.body.form_data.map((fd: any) => ({ key: fd.name, value: fd.value })) : [{ key: '', value: '' }]);
      setResponse(null);
    }
  }, [isOpen, initialData]);

  const handleClose = () => {
    setResponse(null); // Clear response when closing
    onClose();
  };

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

  const handleSendRequest = async () => {
    // Fetch latest token/basic auth from storage if enabled
    let currentToken = authToken;
    let currentUsername = authUsername;
    let currentPassword = authPassword;

    try {
      const api = (window as any)?.browserAPI?.browser;
      
      // Fetch token if storage is enabled for bearer
      if (tokenStorageEnabled && authType === 'bearer' && tokenStorageKey.trim() && api?.getAuthValue) {
        const source = tokenStorageType === 'localStorage'
          ? 'local'
          : tokenStorageType === 'sessionStorage'
          ? 'session'
          : 'cookie';
        const fetchedToken = await api.getAuthValue(source, tokenStorageKey);
        if (typeof fetchedToken === 'string' && fetchedToken) {
          currentToken = fetchedToken;
          setAuthToken(fetchedToken);
          setFetchedTokenValue(fetchedToken);
        }
      }

      // Fetch basic auth if storage is enabled for basic
      if (tokenStorageEnabled && authType === 'basic' && basicAuthUsernameKey.trim() && basicAuthPasswordKey.trim() && api?.getBasicAuthFromStorage) {
        const payload: any = {
          type: basicAuthStorageType,
          usernameKey: basicAuthUsernameKey,
          passwordKey: basicAuthPasswordKey
        };
        const result = await api.getBasicAuthFromStorage(payload);
        if (result?.username) {
          currentUsername = result.username;
          setAuthUsername(result.username);
          setFetchedBasicUsername(result.username);
        }
        if (result?.password) {
          currentPassword = result.password;
          setAuthPassword(result.password);
          setFetchedBasicPassword(result.password);
        }
      }
    } catch (error) {
      // console.error('Failed to fetch auth from storage:', error);
      // Continue with existing values if fetch fails
    }

    // Create ApiRequestData for validation (schema mới)
    const apiData: ApiRequestData = {
      method: (method || 'GET').toLowerCase() as any,
      url,
      params,
      headers,
      auth: {
        type: authType,
        username: currentUsername,
        password: currentPassword,
        token: currentToken,
      },
      body: {
        type: bodyType,
        content: body,
        form_data: bodyType === 'form' ? bodyForm.map((p, i) => ({ name: p.key, value: p.value, orderIndex: i })) : undefined,
      },
    };

    // Convert to ApiRequestOptions for validation
    const options = convertApiRequestDataToOptions(apiData);
    const validation = validateApiRequest(options);

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid request configuration');
      return;
    }

    setIsSending(true);
    
    try {
      const response = await executeApiRequest(options);
      
      setResponse({
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
      // console.error('Request failed:', error);
      toast.error('Request failed: ' + (error as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const handleSave = () => {
    // Nếu dùng storage thì KHÔNG lưu giá trị thật của token/username/password
    const hideBearer = tokenStorageEnabled && authType === 'bearer';
    const hideBasic = tokenStorageEnabled && authType === 'basic';

    const tokenStorages = !tokenStorageEnabled || authType !== 'bearer' || !tokenStorageKey.trim()
      ? []
      : [{ type: tokenStorageType, key: tokenStorageKey }];

    const basicAuthStorages = !tokenStorageEnabled || authType !== 'basic' || !basicAuthUsernameKey.trim() || !basicAuthPasswordKey.trim()
      ? []
      : [{ type: basicAuthStorageType, username_key: basicAuthUsernameKey, password_key: basicAuthPasswordKey }];

    const data: ApiRequestData = {
      method: (method || 'GET').toLowerCase() as any,
      url,
      params: params.filter(p => p.key.trim() && p.value.trim()),
      headers: headers.filter(h => h.key.trim() && h.value.trim()),
      auth: {
        type: authType,
        storage_enabled: tokenStorageEnabled && authType !== 'none' ? true : false,
        username: authType === 'basic' && !hideBasic ? authUsername : undefined,
        password: authType === 'basic' && !hideBasic ? authPassword : undefined,
        token: authType === 'bearer' && !hideBearer ? authToken : undefined,
        token_storages: tokenStorages,
        basic_auth_storages: basicAuthStorages,
      },
      body: {
        type: bodyType,
        content: bodyType === 'json' ? body : bodyType === 'form' ? undefined : '',
        form_data: bodyType === 'form'
          ? bodyForm
              .filter(p => p.key.trim())
              .map((p, i) => ({ name: p.key.trim(), value: p.value, orderIndex: i }))
          : undefined,
      },
    };
    
    onConfirm(data);
    handleClose();
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
      // console.error('Fetch token failed:', e);
      toast.error('Fetch token failed');
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleFetchBasicAuth = async () => {
    try {
      if (!tokenStorageEnabled) return;
      if (authType !== 'basic') return;
      // validate config: require both keys
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


  if (!isOpen) return null;

  const isValidUrl = url && url !== 'https://' && url.trim() !== '';

  return (
    <div className="arm-overlay" onClick={handleClose}>
      <div className="arm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="arm-header">
          <h3 className="arm-title">API Request</h3>
          <button className="arm-close" onClick={handleClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="arm-body">
          {/* Method and URL */}
          <div className="arm-method-url">
            <select 
              className="arm-method-select" 
              value={method} 
              onChange={(e) => setMethod(e.target.value)}
            >
              {httpMethods.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input 
              className="arm-url-input" 
              type="text" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
            />
            <button 
              className="arm-send-btn" 
              onClick={handleSendRequest}
              disabled={isSending || !isValidUrl}
            >
              {isSending ? 'Sending...' : 'SEND'}
            </button>
          </div>

          {/* Params Section */}
          <div className="arm-section">
            <div className="arm-section-header">
              <span className="arm-section-title">Params</span>
            </div>
            <div className="arm-params">
              {params.map((param, index) => (
                <div key={index} className="arm-param-row">
                  <input
                    className="arm-param-key"
                    type="text"
                    placeholder="Key"
                    value={param.key}
                    onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                  />
                  <input
                    className="arm-param-value"
                    type="text"
                    placeholder="Value"
                    value={param.value}
                    onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                  />
                  <button 
                    className="arm-remove-btn"
                    onClick={() => handleRemoveParam(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="arm-add-param">
                <button className="arm-add-btn" onClick={handleAddParam}>
                  + ADD PARAM
                </button>
              </div>
            </div>
          </div>

          {/* Headers Section */}
          <div className="arm-section">
            <div className="arm-section-header">
              <span className="arm-section-title">Headers</span>
            </div>
            <div className="arm-headers">
              {headers.map((header, index) => (
                <div key={index} className="arm-header-row">
                  <input
                    className="arm-header-key"
                    type="text"
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                  />
                  <input
                    className="arm-header-value"
                    type="text"
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                  />
                  <button 
                    className="arm-remove-btn"
                    onClick={() => handleRemoveHeader(index)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="arm-add-header">
                <button className="arm-add-btn" onClick={handleAddHeader}>
                  + ADD HEADER
                </button>
              </div>
            </div>
          </div>

          {/* Authorization Section + Enable Token Storage toggle on the right */}
          <div className="arm-section">
            <div className="arm-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="arm-section-title">Authorization</span>
              <label className="arm-checkbox-container" style={{ marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={tokenStorageEnabled}
                  onChange={(e) => setTokenStorageEnabled(e.target.checked)}
                />
                <span className="arm-checkbox-label">Enable storage</span>
              </label>
            </div>
            <select 
              className="arm-auth-select" 
              value={authType} 
              onChange={(e) => setAuthType(e.target.value as any)}
            >
              <option value="none">None</option>
              <option value="basic">Basic Auth</option>
              <option value="bearer">Bearer Token</option>
            </select>
            
            {authType === 'basic' && !tokenStorageEnabled && (
              <div className="arm-auth-fields">
                <input
                  className="arm-auth-input"
                  type="text"
                  placeholder="Username"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                />
                <input
                  className="arm-auth-input"
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>
            )}
            
            {authType === 'bearer' && !tokenStorageEnabled && (
              <div className="arm-auth-fields">
                <input
                  className="arm-auth-input"
                  type="text"
                  placeholder="Token"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Token Storage Section - show inline when enabled */}
          {tokenStorageEnabled && authType === 'bearer' && (
            <div className="arm-section">
              <div className="arm-section-header">
                <span className="arm-section-title">Token Storage</span>
              </div>
              <div className="arm-token-storage">
                <div className="arm-storage-type">
                  <label className="arm-label">Storage Type</label>
                    <select 
                      className="arm-storage-select" 
                      value={tokenStorageType} 
                      onChange={(e) => setTokenStorageType(e.target.value as any)}
                    >
                      <option value="localStorage">Local Storage</option>
                      <option value="sessionStorage">Session Storage</option>
                      <option value="cookie">Cookie</option>
                    </select>
                </div>

                <div className="arm-storage-key">
                  <label className="arm-label">{tokenStorageType === 'cookie' ? 'Cookie Name' : 'Storage Key'}</label>
                  <input
                    className="arm-storage-input"
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
                  />
                </div>

                <div className="arm-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {tokenStorageKey.trim() && (
                    <button 
                      className="arm-add-btn"
                      onClick={handleFetchToken}
                      disabled={isFetchingToken}
                    >
                      {isFetchingToken ? 'Fetching...' : 'SEND'}
                    </button>
                  )}
                </div>
                {fetchedTokenValue !== null && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      className="arm-storage-input"
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
          )}

          {/* Basic Auth Storage Section - show when general storage enabled and basic selected */}
          {tokenStorageEnabled && authType === 'basic' && (
            <div className="arm-section">
              <div className="arm-section-header">
                <span className="arm-section-title">Basic Auth Storage</span>
              </div>
              <div className="arm-token-storage">
                  <div className="arm-storage-type">
                    <label className="arm-label">Storage Type</label>
                    <select 
                      className="arm-storage-select" 
                      value={basicAuthStorageType} 
                      onChange={(e) => setBasicAuthStorageType(e.target.value as any)}
                    >
                      <option value="localStorage">Local Storage</option>
                      <option value="sessionStorage">Session Storage</option>
                      <option value="cookie">Cookie</option>
                    </select>
                  </div>

                  {basicAuthStorageType === 'localStorage' || basicAuthStorageType === 'sessionStorage' ? (
                    <div className="arm-basic-auth-keys">
                      <div className="arm-storage-key">
                        <label className="arm-label">Username Key</label>
                        <input
                          className="arm-storage-input"
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
                      <div className="arm-storage-key">
                        <label className="arm-label">Password Key</label>
                        <input
                          className="arm-storage-input"
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
                    <div className="arm-basic-auth-keys">
                      <div className="arm-storage-key">
                        <label className="arm-label">Username Cookie Name</label>
                        <input
                          className="arm-storage-input"
                          type="text"
                          placeholder="e.g., basic_username, auth_username"
                          value={basicAuthUsernameKey}
                          onChange={(e) => setBasicAuthUsernameKey(e.target.value)}
                        />
                      </div>
                      <div className="arm-storage-key">
                        <label className="arm-label">Password Cookie Name</label>
                        <input
                          className="arm-storage-input"
                          type="text"
                          placeholder="e.g., basic_password, auth_password"
                          value={basicAuthPasswordKey}
                          onChange={(e) => setBasicAuthPasswordKey(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}
                <div className="arm-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {(basicAuthUsernameKey.trim() && basicAuthPasswordKey.trim()) && (
                    <button 
                      className="arm-add-btn"
                      onClick={handleFetchBasicAuth}
                      disabled={isFetchingBasic}
                    >
                      {isFetchingBasic ? 'Fetching...' : 'SEND'}
                    </button>
                  )}
                </div>
                {(fetchedBasicUsername !== null || fetchedBasicPassword !== null) && (
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <input
                      className="arm-storage-input"
                      type="text"
                      placeholder="Username value"
                      value={fetchedBasicUsername ?? ''}
                      onChange={() => {}}
                      readOnly
                      tabIndex={-1}
                      style={{ backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed', width: '100%' }}
                    />
                    <input
                      className="arm-storage-input"
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
          <div className="arm-section">
            <div className="arm-section-header">
              <span className="arm-section-title">Body</span>
            </div>
            <select 
              className="arm-body-type-select" 
              value={bodyType} 
              onChange={(e) => setBodyType(e.target.value as 'none' | 'json' | 'form')}
            >
              <option value="none">None</option>
              <option value="json">JSON</option>
              <option value="form">Form Data</option>
            </select>
            
            {bodyType === 'json' && (
              <textarea
                className="arm-body-textarea"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                rows={6}
              />
            )}

            {bodyType === 'form' && (
              <div className="arm-params">
                {bodyForm.map((pair, index) => (
                  <div key={index} className="arm-param-row">
                    <input
                      className="arm-param-key"
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
                      className="arm-param-value"
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
                      className="arm-remove-btn"
                      onClick={() => setBodyForm(bodyForm.filter((_, i) => i !== index))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="arm-add-param">
                  <button className="arm-add-btn" onClick={() => setBodyForm([...bodyForm, { key: '', value: '' }])}>
                    + ADD FIELD
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Response Section */}
          {response && (
            <div className="arm-section">
              <div className="arm-section-header">
                <span className="arm-section-title">Response</span>
              </div>
              <div className="arm-response">
                <div className="arm-response-status">
                  Status: <span className={`arm-status-code ${getStatusColorClass(response.status)}`}>
                    {response.status} {getStatusDescription(response.status)}
                  </span>
                </div>
                <div className="arm-response-content">
                  <pre className="arm-response-data">
                    {formatResponseData(response.data)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="arm-footer">
          <div className="arm-actions">
            <button className="arm-btn arm-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button className="arm-btn arm-btn-save" onClick={handleSave}>
              SAVE
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ApiRequestModal;
