/**
 * API Request Panel component
 * Builds an API request runner panel, renders results, exposes selection to consumer
 */

import { closeAssertInputModal } from '../modals/assertInputModal.js';

export function createApiRequestPanel(assertType, onConfirm) {
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: absolute; top: 44px; right: 10px; z-index: 100003; background: #fff; border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15); border-radius: 8px; padding: 10px; min-width: 360px; display: none;
    max-height: 320px; overflow: auto;
  `;

  panel.id = 'rikkei-api-request-panel';

  // Hide scrollbars while keeping scroll (like queryPanel)
  try {
    if (!document.getElementById('rk-api-panel-scroll-style')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'rk-api-panel-scroll-style';
      styleEl.textContent = `
        #rikkei-api-request-panel { scrollbar-width: none; -ms-overflow-style: none; }
        #rikkei-api-request-panel::-webkit-scrollbar { width: 0; height: 0; }
      `;
      document.head.appendChild(styleEl);
    }
  } catch {}

  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:12px;margin-bottom:6px;';
  const headerTitle = document.createElement('span');
  headerTitle.textContent = 'API Request';
  headerTitle.style.cssText = 'display:inline-flex;align-items:center;gap:6px;';
  const headerClose = document.createElement('button');
  headerClose.innerHTML = '<i class="fas fa-times"></i>';
  headerClose.title = 'Close panel';
  headerClose.style.cssText = 'width:20px;height:20px;border:none;border-radius:4px;background:transparent;color:#9ca3af;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
  headerClose.addEventListener('click', (ev) => { ev.stopPropagation(); close(); });
  header.appendChild(headerTitle);
  header.appendChild(headerClose);

  // Method and URL Section
  const methodUrlWrap = document.createElement('div');
  methodUrlWrap.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;border:1px solid #e6ebee;border-radius:8px;overflow:hidden;background:#fff;';
  
  const methodSelect = document.createElement('select');
  methodSelect.style.cssText = 'padding:6px 8px;border:none;border-right:1px solid #e6ebee;font-size:12px;background:#fff;min-width:70px;width:70px;cursor:pointer;outline:none;';
  ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    methodSelect.appendChild(opt);
  });

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'https://api.example.com/endpoint';
  urlInput.value = 'https://';
  urlInput.style.cssText = 'flex:1;padding:6px 10px;border:none;font-size:12px;background:#fff;outline:none;';

  const sendBtn = document.createElement('button');
  sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
  sendBtn.title = 'Send request';
  sendBtn.style.cssText = 'width:28px;height:28px;border:none;border-radius:6px;background:#8b5cf6;color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
  sendBtn.onmouseover = () => { sendBtn.style.background = '#7c3aed'; };
  sendBtn.onmouseout = () => { sendBtn.style.background = '#8b5cf6'; };

  methodUrlWrap.appendChild(methodSelect);
  methodUrlWrap.appendChild(urlInput);
  methodUrlWrap.appendChild(sendBtn);

  // Params Section
  const paramsSection = createKeyValueSection('Params', 'arm-param');
  // Headers Section
  const headersSection = createKeyValueSection('Headers', 'arm-header');
  
  // Authorization Section
  const authSection = document.createElement('div');
  authSection.style.cssText = 'margin-bottom:8px;';
  const authHeader = document.createElement('div');
  authHeader.style.cssText = 'margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;';
  const authTitle = document.createElement('span');
  authTitle.textContent = 'Authorization';
  authTitle.style.cssText = 'font-size:12px;font-weight:600;color:#374151;';
  authHeader.appendChild(authTitle);
  // Token storage toggle (right side)
  const storageToggleWrap = document.createElement('label');
  storageToggleWrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#374151;';
  const storageToggle = document.createElement('input');
  storageToggle.type = 'checkbox';
  storageToggle.style.cssText = 'width:14px;height:14px;cursor:pointer;';
  const storageToggleText = document.createElement('span');
  storageToggleText.textContent = 'Enable storage';
  storageToggleWrap.appendChild(storageToggle);
  storageToggleWrap.appendChild(storageToggleText);
  authHeader.appendChild(storageToggleWrap);
  
  const authSelect = document.createElement('select');
  authSelect.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;cursor:pointer;box-sizing:border-box;margin-bottom:6px;';
  ['none', 'basic', 'bearer'].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (t === 'none') opt.textContent = 'None';
    if (t === 'basic') opt.textContent = 'Basic Auth';
    if (t === 'bearer') opt.textContent = 'Bearer Token';
    authSelect.appendChild(opt);
  });

  const authFields = document.createElement('div');
  authFields.style.cssText = 'display:none;flex-direction:row;gap:8px;';
  
  const authUsernameInput = document.createElement('input');
  authUsernameInput.type = 'text';
  authUsernameInput.placeholder = 'Username';
  authUsernameInput.style.cssText = 'flex:1;padding:6px 10px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;box-sizing:border-box;';
  
  const authPasswordInput = document.createElement('input');
  authPasswordInput.type = 'password';
  authPasswordInput.placeholder = 'Password';
  authPasswordInput.style.cssText = 'flex:1;padding:6px 10px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;box-sizing:border-box;';
  
  const authTokenInput = document.createElement('input');
  authTokenInput.type = 'text';
  authTokenInput.placeholder = 'Token';
  authTokenInput.style.cssText = 'flex:1;padding:6px 10px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;box-sizing:border-box;display:none;';

  authSelect.addEventListener('change', () => {
    const val = authSelect.value;
    authFields.style.display = 'none';
    authUsernameInput.style.display = 'none';
    authPasswordInput.style.display = 'none';
    authTokenInput.style.display = 'none';
    if (val === 'basic' && !storageToggle.checked) {
      authFields.style.display = 'flex';
      authUsernameInput.style.display = 'block';
      authPasswordInput.style.display = 'block';
    } else if (val === 'bearer' && !storageToggle.checked) {
      authFields.style.display = 'flex';
      authTokenInput.style.display = 'block';
    }
  });

  authFields.appendChild(authUsernameInput);
  authFields.appendChild(authPasswordInput);
  authFields.appendChild(authTokenInput);
  
  authSection.appendChild(authHeader);
  authSection.appendChild(authSelect);
  authSection.appendChild(authFields);

  // Token Storage Section (only when enabled and bearer)
  const tokenStorageSection = document.createElement('div');
  tokenStorageSection.style.cssText = 'margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;display:none;';
  const tokenStorageTypeWrap = document.createElement('div');
  tokenStorageTypeWrap.style.cssText = 'margin-bottom:8px;';
  const tokenStorageTypeLabel = document.createElement('label');
  tokenStorageTypeLabel.innerHTML = 'Storage Type <span style="color:#dc2626">*</span>';
  tokenStorageTypeLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;';
  const tokenStorageTypeSelect = document.createElement('select');
  tokenStorageTypeSelect.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;';
  ;['localStorage','sessionStorage','cookie'].forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=t==='cookie'?'Cookie':(t==='localStorage'?'Local Storage':'Session Storage');tokenStorageTypeSelect.appendChild(opt);});
  tokenStorageTypeWrap.appendChild(tokenStorageTypeLabel);
  tokenStorageTypeWrap.appendChild(tokenStorageTypeSelect);

  const tokenKeyWrap = document.createElement('div');
  tokenKeyWrap.style.cssText = 'margin-bottom:8px;';
  const tokenKeyLabel = document.createElement('label');
  tokenKeyLabel.innerHTML = 'Storage Key <span style="color:#dc2626">*</span>';
  tokenKeyLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;';
  const tokenKeyInput = document.createElement('input');
  tokenKeyInput.type = 'text';
  tokenKeyInput.placeholder = 'e.g., auth_token, access_token';
  tokenKeyInput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;';
  tokenKeyWrap.appendChild(tokenKeyLabel);
  tokenKeyWrap.appendChild(tokenKeyInput);

  const tokenActions = document.createElement('div');
  tokenActions.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const tokenFetchBtn = document.createElement('button');
  tokenFetchBtn.textContent = 'SEND';
  tokenFetchBtn.style.cssText = 'background:none;border:none;color:#8b5cf6;cursor:pointer;font-size:12px;font-weight:600;padding:4px 8px;border-radius:6px;';
  tokenFetchBtn.onmouseover = () => { tokenFetchBtn.style.background = '#f3f4f6'; };
  tokenFetchBtn.onmouseout = () => { tokenFetchBtn.style.background = 'transparent'; };
  tokenActions.appendChild(tokenFetchBtn);

  const tokenValueOutput = document.createElement('input');
  tokenValueOutput.type = 'text';
  tokenValueOutput.placeholder = 'Stored value';
  tokenValueOutput.readOnly = true;
  tokenValueOutput.tabIndex = -1;
  tokenValueOutput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;background:#f3f4f6;color:#6b7280;cursor:not-allowed;margin-top:6px;';

  tokenStorageSection.appendChild(tokenStorageTypeWrap);
  tokenStorageSection.appendChild(tokenKeyWrap);
  tokenStorageSection.appendChild(tokenActions);
  tokenStorageSection.appendChild(tokenValueOutput);
  authSection.appendChild(tokenStorageSection);

  // Basic Auth Storage Section
  const basicStorageSection = document.createElement('div');
  basicStorageSection.style.cssText = 'margin-top:8px;padding:8px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;display:none;';

  const basicStorageTypeWrap = document.createElement('div');
  basicStorageTypeWrap.style.cssText = 'margin-bottom:8px;';
  const basicStorageTypeLabel = document.createElement('label');
  basicStorageTypeLabel.innerHTML = 'Storage Type <span style="color:#dc2626">*</span>';
  basicStorageTypeLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;';
  const basicStorageTypeSelect = document.createElement('select');
  basicStorageTypeSelect.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;';
  ;['localStorage','sessionStorage','cookie'].forEach(t=>{const opt=document.createElement('option');opt.value=t;opt.textContent=t==='cookie'?'Cookie':(t==='localStorage'?'Local Storage':'Session Storage');basicStorageTypeSelect.appendChild(opt);});
  basicStorageTypeWrap.appendChild(basicStorageTypeLabel);
  basicStorageTypeWrap.appendChild(basicStorageTypeSelect);

  const basicKeysWrap = document.createElement('div');
  basicKeysWrap.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;';

  const basicUsernameKeyWrap = document.createElement('div');
  const basicUsernameKeyLabel = document.createElement('label');
  basicUsernameKeyLabel.innerHTML = 'Username Key <span style="color:#dc2626">*</span>';
  basicUsernameKeyLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;';
  const basicUsernameKeyInput = document.createElement('input');
  basicUsernameKeyInput.type = 'text';
  basicUsernameKeyInput.placeholder = 'e.g., basic_username, auth_username';
  basicUsernameKeyInput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;';
  basicUsernameKeyWrap.appendChild(basicUsernameKeyLabel);
  basicUsernameKeyWrap.appendChild(basicUsernameKeyInput);

  const basicPasswordKeyWrap = document.createElement('div');
  const basicPasswordKeyLabel = document.createElement('label');
  basicPasswordKeyLabel.innerHTML = 'Password Key <span style="color:#dc2626">*</span>';
  basicPasswordKeyLabel.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:4px;';
  const basicPasswordKeyInput = document.createElement('input');
  basicPasswordKeyInput.type = 'text';
  basicPasswordKeyInput.placeholder = 'e.g., basic_password, auth_password';
  basicPasswordKeyInput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;';
  basicPasswordKeyWrap.appendChild(basicPasswordKeyLabel);
  basicPasswordKeyWrap.appendChild(basicPasswordKeyInput);

  basicKeysWrap.appendChild(basicUsernameKeyWrap);
  basicKeysWrap.appendChild(basicPasswordKeyWrap);

  const basicActions = document.createElement('div');
  basicActions.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:6px;';
  const basicFetchBtn = document.createElement('button');
  basicFetchBtn.textContent = 'SEND';
  basicFetchBtn.style.cssText = 'background:none;border:none;color:#8b5cf6;cursor:pointer;font-size:12px;font-weight:600;padding:4px 8px;border-radius:6px;';
  basicFetchBtn.onmouseover = () => { basicFetchBtn.style.background = '#f3f4f6'; };
  basicFetchBtn.onmouseout = () => { basicFetchBtn.style.background = 'transparent'; };
  basicActions.appendChild(basicFetchBtn);

  const basicOutputs = document.createElement('div');
  basicOutputs.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;';
  const basicUsernameOutput = document.createElement('input');
  basicUsernameOutput.type = 'text';
  basicUsernameOutput.placeholder = 'Username value';
  basicUsernameOutput.readOnly = true;
  basicUsernameOutput.tabIndex = -1;
  basicUsernameOutput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;background:#f3f4f6;color:#6b7280;cursor:not-allowed;';
  const basicPasswordOutput = document.createElement('input');
  basicPasswordOutput.type = 'text';
  basicPasswordOutput.placeholder = 'Password value';
  basicPasswordOutput.readOnly = true;
  basicPasswordOutput.tabIndex = -1;
  basicPasswordOutput.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;background:#f3f4f6;color:#6b7280;cursor:not-allowed;';

  basicOutputs.appendChild(basicUsernameOutput);
  basicOutputs.appendChild(basicPasswordOutput);

  basicStorageSection.appendChild(basicStorageTypeWrap);
  basicStorageSection.appendChild(basicKeysWrap);
  basicStorageSection.appendChild(basicActions);
  basicStorageSection.appendChild(basicOutputs);
  authSection.appendChild(basicStorageSection);

  function syncTokenStorageVisibility() {
    const enabled = !!storageToggle.checked;
    const isBearer = authSelect.value === 'bearer';
    const isBasic = authSelect.value === 'basic';
    tokenStorageSection.style.display = enabled && isBearer ? 'block' : 'none';
    basicStorageSection.style.display = enabled && isBasic ? 'block' : 'none';
    // Hide direct input fields when storage enabled
    if (enabled) {
      authFields.style.display = 'none';
      authUsernameInput.style.display = 'none';
      authPasswordInput.style.display = 'none';
      authTokenInput.style.display = 'none';
    } else {
      // Restore according to current auth type
      const val = authSelect.value;
      authFields.style.display = 'none';
      authUsernameInput.style.display = 'none';
      authPasswordInput.style.display = 'none';
      authTokenInput.style.display = 'none';
      if (val === 'basic') {
        authFields.style.display = 'flex';
        authUsernameInput.style.display = 'block';
        authPasswordInput.style.display = 'block';
      } else if (val === 'bearer') {
        authFields.style.display = 'flex';
        authTokenInput.style.display = 'block';
      }
    }
  }
  storageToggle.addEventListener('change', syncTokenStorageVisibility);
  authSelect.addEventListener('change', syncTokenStorageVisibility);

  // Dynamic enable/visibility for SEND buttons based on required fields
  function updateTokenSendState() {
    const storageOn = !!storageToggle.checked;
    const isBearer = authSelect.value === 'bearer';
    const keyFilled = (tokenKeyInput.value || '').trim().length > 0;
    const shouldShow = storageOn && isBearer;
    tokenFetchBtn.style.display = shouldShow ? 'inline-block' : 'none';
    tokenFetchBtn.disabled = !(shouldShow && keyFilled);
    tokenFetchBtn.style.opacity = tokenFetchBtn.disabled ? '0.6' : '1';
    tokenFetchBtn.style.cursor = tokenFetchBtn.disabled ? 'not-allowed' : 'pointer';
  }
  function updateBasicSendState() {
    const storageOn = !!storageToggle.checked;
    const isBasic = authSelect.value === 'basic';
    const uFilled = (basicUsernameKeyInput.value || '').trim().length > 0;
    const pFilled = (basicPasswordKeyInput.value || '').trim().length > 0;
    const shouldShow = storageOn && isBasic;
    basicFetchBtn.style.display = shouldShow ? 'inline-block' : 'none';
    basicFetchBtn.disabled = !(shouldShow && uFilled && pFilled);
    basicFetchBtn.style.opacity = basicFetchBtn.disabled ? '0.6' : '1';
    basicFetchBtn.style.cursor = basicFetchBtn.disabled ? 'not-allowed' : 'pointer';
  }

  // Hook events to update states
  storageToggle.addEventListener('change', () => { updateTokenSendState(); updateBasicSendState(); });
  authSelect.addEventListener('change', () => { updateTokenSendState(); updateBasicSendState(); });
  tokenStorageTypeSelect.addEventListener('change', updateTokenSendState);
  tokenKeyInput.addEventListener('input', updateTokenSendState);
  basicStorageTypeSelect.addEventListener('change', updateBasicSendState);
  basicUsernameKeyInput.addEventListener('input', updateBasicSendState);
  basicPasswordKeyInput.addEventListener('input', updateBasicSendState);

  // Initialize states
  setTimeout(() => { updateTokenSendState(); updateBasicSendState(); syncTokenStorageVisibility(); }, 0);

  async function fetchTokenFromStorage() {
    const type = tokenStorageTypeSelect.value; // localStorage | sessionStorage | cookie
    const key = (tokenKeyInput.value || '').trim();
    if (!key) return;
    let val = '';
    try {
      if (type === 'localStorage') {
        try { val = window.localStorage.getItem(key) || ''; } catch {}
      } else if (type === 'sessionStorage') {
        try { val = window.sessionStorage.getItem(key) || ''; } catch {}
      } else {
        // cookie
        try {
          const cookies = document.cookie ? document.cookie.split(';') : [];
          for (const c of cookies) {
            const [k, ...rest] = c.split('=');
            if (k && k.trim() === key) { val = decodeURIComponent(rest.join('=') || ''); break; }
          }
        } catch {}
      }
    } catch {}
    tokenValueOutput.value = val;
    if (val) {
      authTokenInput.value = val; // fill token input for immediate use
    }
  }
  tokenFetchBtn.addEventListener('click', (ev) => { ev.stopPropagation(); fetchTokenFromStorage(); });
  // Allow Enter to trigger token fetch when enabled and valid
  tokenKeyInput.addEventListener('keydown', (e) => {
    try {
      if (e.key === 'Enter') {
        e.preventDefault();
        const storageOn = !!storageToggle.checked;
        const isBearer = authSelect.value === 'bearer';
        const keyFilled = (tokenKeyInput.value || '').trim().length > 0;
        if (storageOn && isBearer && keyFilled) {
          fetchTokenFromStorage();
        }
      }
    } catch {}
  });

  // Adjust token label based on type
  tokenStorageTypeSelect.addEventListener('change', () => {
    tokenKeyLabel.textContent = tokenStorageTypeSelect.value === 'cookie' ? 'Cookie Name' : 'Storage Key';
  });
  // Also keep save state in sync with endpoint edits
  urlInput.addEventListener('input', updateSaveState);

  async function fetchBasicAuthFromStorage() {
    const type = basicStorageTypeSelect.value;
    const uKey = (basicUsernameKeyInput.value || '').trim();
    const pKey = (basicPasswordKeyInput.value || '').trim();
    if (!uKey || !pKey) return;
    let uVal = '';
    let pVal = '';
    try {
      if (type === 'localStorage') {
        try { uVal = window.localStorage.getItem(uKey) || ''; } catch {}
        try { pVal = window.localStorage.getItem(pKey) || ''; } catch {}
      } else if (type === 'sessionStorage') {
        try { uVal = window.sessionStorage.getItem(uKey) || ''; } catch {}
        try { pVal = window.sessionStorage.getItem(pKey) || ''; } catch {}
      } else {
        const pickCookie = (k) => {
          const cookies = document.cookie ? document.cookie.split(';') : [];
          for (const c of cookies) {
            const [name, ...rest] = c.split('=');
            if (name && name.trim() === k) return decodeURIComponent(rest.join('=') || '');
          }
          return '';
        };
        uVal = pickCookie(uKey);
        pVal = pickCookie(pKey);
      }
    } catch {}
    basicUsernameOutput.value = uVal;
    basicPasswordOutput.value = pVal;
    if (uVal) authUsernameInput.value = uVal;
    if (pVal) authPasswordInput.value = pVal;
  }
  basicFetchBtn.addEventListener('click', (ev) => { ev.stopPropagation(); fetchBasicAuthFromStorage(); });
  // Allow Enter to trigger basic auth fetch when enabled and valid
  const handleBasicEnter = (e) => {
    try {
      if (e.key === 'Enter') {
        e.preventDefault();
        const storageOn = !!storageToggle.checked;
        const isBasic = authSelect.value === 'basic';
        const uFilled = (basicUsernameKeyInput.value || '').trim().length > 0;
        const pFilled = (basicPasswordKeyInput.value || '').trim().length > 0;
        if (storageOn && isBasic && uFilled && pFilled) {
          fetchBasicAuthFromStorage();
        }
      }
    } catch {}
  };
  basicUsernameKeyInput.addEventListener('keydown', handleBasicEnter);
  basicPasswordKeyInput.addEventListener('keydown', handleBasicEnter);

  // Body Section
  const bodySection = document.createElement('div');
  bodySection.style.cssText = 'margin-bottom:8px;';
  const bodyHeader = document.createElement('div');
  bodyHeader.style.cssText = 'margin-bottom:6px;';
  const bodyTitle = document.createElement('span');
  bodyTitle.textContent = 'Body';
  bodyTitle.style.cssText = 'font-size:12px;font-weight:600;color:#374151;';
  bodyHeader.appendChild(bodyTitle);
  
  const bodyTypeSelect = document.createElement('select');
  bodyTypeSelect.style.cssText = 'width:100%;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;cursor:pointer;box-sizing:border-box;margin-bottom:6px;';
  ['none', 'json', 'form'].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    if (t === 'none') opt.textContent = 'None';
    if (t === 'json') opt.textContent = 'JSON';
    if (t === 'form') opt.textContent = 'Form Data';
    bodyTypeSelect.appendChild(opt);
  });

  const bodyTextarea = document.createElement('textarea');
  bodyTextarea.placeholder = '{"key": "value"}';
  bodyTextarea.style.cssText = 'width:100%;padding:8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;font-family:Monaco,Menlo,Ubuntu Mono,monospace;background:#fff;resize:vertical;min-height:80px;box-sizing:border-box;display:none;';
  
  const bodyFormSection = createKeyValueSection('', 'arm-form');
  bodyFormSection.element.style.cssText = 'display:none;margin-bottom:0;';

  bodyTypeSelect.addEventListener('change', () => {
    const val = bodyTypeSelect.value;
    bodyTextarea.style.display = 'none';
    bodyFormSection.element.style.display = 'none';
    if (val === 'json') {
      bodyTextarea.style.display = 'block';
    } else if (val === 'form') {
      bodyFormSection.element.style.display = 'block';
    }
  });

  bodySection.appendChild(bodyHeader);
  bodySection.appendChild(bodyTypeSelect);
  bodySection.appendChild(bodyTextarea);
  bodySection.appendChild(bodyFormSection.element);

  // Response Section
  const responseSection = document.createElement('div');
  responseSection.style.cssText = 'margin-bottom:8px;display:none;';
  const responseHeader = document.createElement('div');
  responseHeader.style.cssText = 'margin-bottom:6px;';
  const responseTitle = document.createElement('span');
  responseTitle.textContent = 'Response';
  responseTitle.style.cssText = 'font-size:12px;font-weight:600;color:#374151;';
  responseHeader.appendChild(responseTitle);
  
  const responseStatus = document.createElement('div');
  responseStatus.style.cssText = 'padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:12px;font-weight:600;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px 8px 0 0;';
  
  const responseContent = document.createElement('div');
  responseContent.style.cssText = 'background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;';
  
  const responseData = document.createElement('pre');
  responseData.style.cssText = 'margin:0;padding:10px;font-family:Monaco,Menlo,Ubuntu Mono,monospace;font-size:12px;line-height:1.5;color:#374151;white-space:pre-wrap;word-wrap:break-word;max-height:260px;overflow:auto;background:#f9fafb;';
  
  responseContent.appendChild(responseData);
  responseSection.appendChild(responseHeader);
  responseSection.appendChild(responseStatus);
  responseSection.appendChild(responseContent);

  // Result Box for table display
  const resultBox = document.createElement('div');
  resultBox.style.cssText = 'border:1px solid #e6ebee;border-radius:8px;padding:8px;min-height:48px;font-size:12px;color:#111827;background:#fafafa;margin-top:8px;display:none;';
  resultBox.setAttribute('data-empty', 'true');
  resultBox.textContent = 'Result will appear here…';

  // Primitive extraction controls (2xx) – only offer concrete primitive values (no arrays/objects)
  const extractWrap = document.createElement('div');
  extractWrap.style.cssText = 'display:none;align-items:center;gap:8px;margin-top:8px;width:100%;';
  const extractLabel = document.createElement('span');
  extractLabel.textContent = 'Select value:';
  extractLabel.style.cssText = 'font-size:12px;color:#374151;font-weight:600;flex:0 0 auto;';
  const extractSelect = document.createElement('select');
  extractSelect.style.cssText = 'flex:1;width:100%;min-width:0;box-sizing:border-box;border:1px solid #e6ebee;border-radius:6px;padding:6px 8px;font-size:12px;background:#fff;color:#111827;';
  extractWrap.appendChild(extractLabel);
  extractWrap.appendChild(extractSelect);

  // Store mapping from option index to primitive value
  let primitiveCandidates = [];

  // Legacy Use button (kept for compatibility, hidden)
  const useBtn = document.createElement('button');
  useBtn.style.cssText = 'display:none;';

  // Keep last run context
  let lastRun = {
    method: '',
    url: '',
    params: [],
    headers: [],
    auth: { type: 'none' },
    body: { type: 'none', content: '' },
    response: null
  };

  function createKeyValueSection(title, className) {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom:8px;';
    
    if (title) {
      const sectionHeader = document.createElement('div');
      sectionHeader.style.cssText = 'margin-bottom:6px;';
      const sectionTitle = document.createElement('span');
      sectionTitle.textContent = title;
      sectionTitle.style.cssText = 'font-size:12px;font-weight:600;color:#374151;';
      sectionHeader.appendChild(sectionTitle);
      section.appendChild(sectionHeader);
    }
    
    const container = document.createElement('div');
    container.className = className + '-container';
    container.style.cssText = 'border:1px solid #e6ebee;border-radius:8px;overflow:hidden;';
    
    const items = [];
    
    function addItem() {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;padding:8px;border-bottom:1px solid #f3f4f6;align-items:center;min-height:44px;';
      
      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.placeholder = 'Key';
      keyInput.style.cssText = 'flex:1;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;box-sizing:border-box;min-width:0;';
      
      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.placeholder = 'Value';
      valueInput.style.cssText = 'flex:2;padding:6px 8px;border:1px solid #e6ebee;border-radius:6px;font-size:12px;background:#fff;box-sizing:border-box;min-width:0;';
      
      const removeBtn = document.createElement('button');
      removeBtn.innerHTML = '✕';
      removeBtn.style.cssText = 'width:24px;height:24px;border:none;background:#fef2f2;color:#dc2626;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all 0.2s ease;flex-shrink:0;';
      removeBtn.onmouseover = () => { removeBtn.style.background = '#fee2e2'; };
      removeBtn.onmouseout = () => { removeBtn.style.background = '#fef2f2'; };
      removeBtn.addEventListener('click', () => {
        row.remove();
        const idx = items.indexOf(row);
        if (idx > -1) items.splice(idx, 1);
      });
      
      row.appendChild(keyInput);
      row.appendChild(valueInput);
      row.appendChild(removeBtn);
      container.appendChild(row);
      items.push(row);
      return { row, keyInput, valueInput };
    }
    
    const addBtnWrap = document.createElement('div');
    addBtnWrap.style.cssText = 'padding:6px;border-top:1px dashed #e6ebee;text-align:center;';
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ ADD ' + (title.toUpperCase() || 'ITEM');
    addBtn.style.cssText = 'background:none;border:none;color:#8b5cf6;cursor:pointer;font-size:12px;font-weight:500;padding:4px 8px;border-radius:4px;transition:all 0.2s ease;';
    addBtn.onmouseover = () => { addBtn.style.background = '#f3f4f6'; };
    addBtn.onmouseout = () => { addBtn.style.background = 'transparent'; };
    addBtn.addEventListener('click', () => addItem());
    addBtnWrap.appendChild(addBtn);
    
    container.appendChild(addBtnWrap);
    section.appendChild(container);
    
    // Add initial item
    addItem();
    
    return {
      element: section,
      getItems: () => items.map(r => {
        const keyInp = r.querySelector('input[placeholder="Key"]');
        const valInp = r.querySelector('input[placeholder="Value"]');
        return {
          key: keyInp ? keyInp.value : '',
          value: valInp ? valInp.value : ''
        };
      })
    };
  }

  function renderResultAsTable(data) {
    try {
      resultBox.innerHTML = '';
      resultBox.style.display = 'block';
      resultBox.setAttribute('data-empty', 'false');
      
      if (!Array.isArray(data) || !data.length || typeof data[0] !== 'object') {
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;';
        pre.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        resultBox.appendChild(pre);
        return;
      }

      const allKeysSet = new Set();
      data.forEach((row) => {
        if (row && typeof row === 'object') {
          Object.keys(row).forEach((k) => allKeysSet.add(k));
        }
      });
      const columns = Array.from(allKeysSet);

      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;background:#fff;';
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.textContent = col;
        th.style.cssText = 'text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px;color:#374151;background:#f9fafb;position:sticky;top:0;';
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      const tbody = document.createElement('tbody');
      data.forEach((row) => {
        const tr = document.createElement('tr');
        columns.forEach((col) => {
          const td = document.createElement('td');
          const cell = row && typeof row === 'object' ? row[col] : undefined;
          const cellText = cell === null || cell === undefined ? '' : String(cell);
          td.setAttribute('data-col', col);
          td.style.cssText = 'border-bottom:1px solid #f3f4f6;padding:6px 8px;color:#111827;cursor:default;vertical-align:top;';

          const wrap = document.createElement('div');
          wrap.style.cssText = 'display:flex;align-items:center;gap:6px;justify-content:space-between;';

          const textSpan = document.createElement('span');
          textSpan.className = 'rk-cell-text';
          textSpan.textContent = cellText;
          textSpan.style.cssText = 'display:inline-block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

          const plusBtn = document.createElement('button');
          plusBtn.className = 'rk-assert-btn';
          plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
          plusBtn.title = 'Assert this cell value';
          plusBtn.style.cssText = 'flex:0 0 auto;width:20px;height:20px;border:none;border-radius:4px;background:#e5e7eb;color:#111827;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';

          wrap.appendChild(textSpan);
          wrap.appendChild(plusBtn);
          td.appendChild(wrap);
          tr.appendChild(td);

          plusBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addSelectedCell(row, col);
          });
        });
        tbody.appendChild(tr);
      });
      table.appendChild(thead);
      table.appendChild(tbody);
      
      if (data.length > 1) {
        const warn = document.createElement('div');
        warn.textContent = 'More than one rows can not be verified';
        warn.style.cssText = 'margin-bottom:8px;padding:6px 8px;border-radius:6px;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;';
        resultBox.insertBefore(warn, table);
      }
      
      resultBox.appendChild(table);
    } catch (e) {
      resultBox.textContent = 'Failed to render result';
    }
  }

  function renderObjectAsTable(obj) {
    try {
      resultBox.innerHTML = '';
      resultBox.style.display = 'block';
      resultBox.setAttribute('data-empty', 'false');
      if (!obj || typeof obj !== 'object') {
        const pre = document.createElement('pre');
        pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word;';
        pre.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
        resultBox.appendChild(pre);
        return;
      }
      const columns = Object.keys(obj);
      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;background:#fff;';
      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.textContent = col;
        th.style.cssText = 'text-align:left;border-bottom:1px solid #e5e7eb;padding:6px 8px;color:#374151;background:#f9fafb;position:sticky;top:0;';
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      const tbody = document.createElement('tbody');
      const tr = document.createElement('tr');
      columns.forEach((col) => {
        const td = document.createElement('td');
        const cell = obj[col];
        const cellText = cell === null || cell === undefined ? '' : (typeof cell === 'object' ? JSON.stringify(cell) : String(cell));
        td.setAttribute('data-col', col);
        td.style.cssText = 'border-bottom:1px solid #f3f4f6;padding:6px 8px;color:#111827;cursor:default;vertical-align:top;';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;align-items:center;gap:6px;justify-content:space-between;';
        const textSpan = document.createElement('span');
        textSpan.className = 'rk-cell-text';
        textSpan.textContent = cellText;
        textSpan.style.cssText = 'display:inline-block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        const plusBtn = document.createElement('button');
        plusBtn.className = 'rk-assert-btn';
        plusBtn.innerHTML = '<i class="fas fa-plus"></i>';
        plusBtn.title = 'Assert this cell value';
        plusBtn.style.cssText = 'flex:0 0 auto;width:20px;height:20px;border:none;border-radius:4px;background:#e5e7eb;color:#111827;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
        wrap.appendChild(textSpan);
        wrap.appendChild(plusBtn);
        td.appendChild(wrap);
        tr.appendChild(td);
        plusBtn.addEventListener('click', (e) => { e.stopPropagation(); addSelectedCell(obj, col); });
      });
      tbody.appendChild(tr);
      table.appendChild(thead);
      table.appendChild(tbody);
      resultBox.appendChild(table);
    } catch (e) {
      resultBox.textContent = 'Failed to render object';
    }
  }

  function findPrimitivePaths(root, maxDepth = 4) {
    const result = [];
    try {
      // If root is array, only inspect the first element
      const start = Array.isArray(root) ? (root.length ? root[0] : undefined) : root;
      if (!start || typeof start !== 'object') {
        if (start === null || ['string','number','boolean'].includes(typeof start)) {
          result.push({ path: '', value: start });
        }
        return result;
      }
      const stack = [{ value: start, path: [] }];
      while (stack.length) {
        const { value, path } = stack.pop();
        if (path.length > maxDepth) continue;
        if (value === null || ['string','number','boolean'].includes(typeof value)) {
          result.push({ path: path.join('.'), value });
          continue;
        }
        if (Array.isArray(value)) {
          // Do not traverse arrays further (skip)
          continue;
        }
        if (value && typeof value === 'object') {
          for (const k of Object.keys(value)) {
            stack.push({ value: value[k], path: path.concat(k) });
          }
        }
      }
    } catch {}
    return result;
  }

  function getStatusColorClass(status) {
    if (status >= 200 && status < 300) return 'arm-success';
    if (status >= 300 && status < 400) return 'arm-warning';
    if (status >= 400) return 'arm-error';
    return 'arm-error';
  }

  function getStatusDescription(status) {
    const desc = {
      200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
      301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
      400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found',
      500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable'
    };
    return desc[status] || 'Unknown Status';
  }

  function formatResponseData(data) {
    if (data === null || data === undefined) return 'null';
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }
    return String(data);
  }

  async function runApiRequest() {
    // reset extraction UI each run
    try { extractWrap.style.display = 'none'; extractSelect.innerHTML = ''; } catch {}
    primitiveCandidates = [];
    const method = methodSelect.value;
    const url = (urlInput.value || '').trim();
    
    if (!url || url === 'https://') {
      resultBox.textContent = 'Please enter a valid URL.';
      resultBox.style.display = 'block';
      resultBox.setAttribute('data-empty', 'false');
      return;
    }

    try {
      new URL(url);
    } catch {
      resultBox.textContent = 'Please enter a valid URL format.';
      resultBox.style.display = 'block';
      resultBox.setAttribute('data-empty', 'false');
      return;
    }

    responseSection.style.display = 'block';
    responseStatus.textContent = 'Sending…';
    responseData.textContent = '';
    // Auto scroll to response status area when sending
    try {
      setTimeout(() => {
        try { responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
      }, 0);
    } catch {}
    
    // Build URL with params
    const params = paramsSection.getItems().filter(p => p.key.trim() && p.value.trim());
    let requestUrl = url;
    if (params.length) {
      const urlParams = new URLSearchParams();
      params.forEach(p => urlParams.append(p.key.trim(), p.value.trim()));
      const separator = url.includes('?') ? '&' : '?';
      requestUrl = `${url}${separator}${urlParams.toString()}`;
    }

    // Build headers
    const headers = {};
    headersSection.getItems().filter(h => h.key.trim() && h.value.trim()).forEach(h => {
      headers[h.key.trim()] = h.value.trim();
    });

    // Add authorization
    const authType = authSelect.value;
    if (authType === 'basic' && authUsernameInput.value && authPasswordInput.value) {
      const credentials = btoa(`${authUsernameInput.value}:${authPasswordInput.value}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (authType === 'bearer' && authTokenInput.value) {
      headers['Authorization'] = `Bearer ${authTokenInput.value}`;
    }

    // Build body
    let requestBody = undefined;
    const bodyType = bodyTypeSelect.value;
    if (bodyType === 'json' && bodyTextarea.value) {
      headers['Content-Type'] = 'application/json';
      requestBody = bodyTextarea.value;
    } else if (bodyType === 'form') {
      const formItems = bodyFormSection.getItems().filter(f => f.key.trim() && f.value.trim());
      if (formItems.length) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        const formParams = new URLSearchParams();
        formItems.forEach(f => formParams.append(f.key.trim(), f.value.trim()));
        requestBody = formParams.toString();
      }
    }

    // Prepare request options
    const requestOptions = {
      method,
      headers
    };

    if (['POST', 'PUT', 'PATCH'].includes(method) && requestBody !== undefined) {
      requestOptions.body = requestBody;
    }

    try {
      let status, parsedData, responseHeaders;
      if (typeof window.runApiRequestForTracker === 'function') {
        // Prefer backend runner to avoid assert-mode fetch restrictions
        const payload = {
          method,
          url: requestUrl,
          headers,
          bodyType,
          body: bodyType === 'json' ? (bodyTextarea.value || '') : undefined,
          formData: bodyType === 'form' ? bodyFormSection.getItems() : undefined,
        };
        const resp = await window.runApiRequestForTracker(payload);
        if (!resp || resp.success === false) {
          // Show status/body even on failure if available
          status = resp?.status || 0;
          parsedData = resp?.data;
          responseHeaders = resp?.headers || {};
          const msg = resp?.error || (typeof parsedData === 'string' ? parsedData : (parsedData && (parsedData.error || parsedData.message || parsedData.detail))) || 'Failed to run API request';
          throw new Error(msg);
        } else {
          status = resp.status || 0;
          parsedData = resp.data;
          responseHeaders = resp.headers || {};
        }
      } else {
        const timeoutMs = 30000;
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), timeoutMs));
        const response = await Promise.race([ fetch(requestUrl, requestOptions), timeoutPromise ]);
        const responseText = await response.text();
        try { parsedData = JSON.parse(responseText); } catch { parsedData = responseText; }
        status = response.status;
        responseHeaders = {};
        response.headers.forEach((value, key) => { responseHeaders[key] = value; });
      }

      lastRun.method = method;
      lastRun.url = url;
      lastRun.params = params;
      lastRun.headers = headersSection.getItems().filter(h => h.key.trim() && h.value.trim());
      lastRun.auth = { type: authType };
      lastRun.body = { type: bodyType, content: bodyTextarea.value };
      lastRun.response = {
        status: status,
        data: parsedData,
        headers: responseHeaders,
        success: status >= 200 && status < 300
      };

      // Display response
      const statusClass = getStatusColorClass(status);
      const statusDesc = getStatusDescription(status);
      responseStatus.innerHTML = `Status: <span style="padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;background:${
        statusClass === 'arm-success' ? '#dcfce7' : statusClass === 'arm-warning' ? '#fef3c7' : '#fef2f2'
      };color:${
        statusClass === 'arm-success' ? '#166534' : statusClass === 'arm-warning' ? '#d97706' : '#dc2626'
      };">${status} ${statusDesc}</span>`;
      
      responseData.textContent = formatResponseData(parsedData);

      // Auto scroll to response after displaying result
      try {
        setTimeout(() => {
          try {
            // Scroll within the panel container to show response section
            if (panel && responseSection) {
              // responseSection is a direct child of panel, so offsetTop is relative to panel
              const responseTop = responseSection.offsetTop;
              const targetTop = Math.max(0, responseTop - 10);
              if (typeof panel.scrollTo === 'function') {
                panel.scrollTo({ top: targetTop, behavior: 'smooth' });
              } else if (typeof panel.scroll === 'function') {
                panel.scroll({ top: targetTop, behavior: 'smooth' });
              } else {
                panel.scrollTop = targetTop;
              }
            }
          } catch {}
        }, 200);
      } catch {}

      // For 2xx: provide primitive extraction via combobox
      extractWrap.style.display = 'none';
      if (status >= 200 && status < 300) {
        // Build primitive candidates list
        primitiveCandidates = findPrimitivePaths(parsedData);
        // Keep only primitives
        primitiveCandidates = primitiveCandidates.filter(it => (it.value === null) || ['string','number','boolean'].includes(typeof it.value));
        if (primitiveCandidates.length) {
          extractSelect.innerHTML = '';
          primitiveCandidates.forEach((it, idx) => {
            const opt = document.createElement('option');
            opt.value = String(idx);
            const valPreview = it.value === null ? 'null' : (typeof it.value === 'string' ? (it.value.length > 32 ? it.value.slice(0,32)+'…' : it.value) : String(it.value));
            opt.textContent = it.path ? `${it.path} = ${valPreview}` : `${valPreview}`;
            if (idx === 0) opt.selected = true;
            extractSelect.appendChild(opt);
          });
          extractWrap.style.display = 'flex';
          // Sync save state when options created
          extractSelect.onchange = (e) => { e.stopPropagation(); updateSaveState(); };
          updateSaveState();
        }
        // Hide table/object view per requirement
        resultBox.style.display = 'none';
      } else {
        // Non-2xx: hide extraction
        extractWrap.style.display = 'none';
        resultBox.style.display = 'none';
        updateSaveState();
      }
    } catch (error) {
      let message = 'Unknown error occurred';
      try {
        const em = String(error && error.message ? error.message : error);
        if (em === 'Request timeout') message = 'Request timeout - please try again';
        else if (/Failed to fetch/i.test(em)) message = 'Network error - please check your connection';
        else if (/CORS/i.test(em)) message = 'CORS error - the server may not allow requests from this origin';
        else message = em;
      } catch {}
      // Render status if we captured it
      if (typeof status === 'number') {
        const statusClass = getStatusColorClass(status);
        const statusDesc = getStatusDescription(status);
        responseStatus.innerHTML = `Status: <span style="padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700;background:${
          statusClass === 'arm-success' ? '#dcfce7' : statusClass === 'arm-warning' ? '#fef3c7' : '#fef2f2'
        };color:${
          statusClass === 'arm-success' ? '#166534' : statusClass === 'arm-warning' ? '#d97706' : '#dc2626'
        };">${status} ${statusDesc}</span>`;
      } else {
        responseStatus.textContent = `Error`;
      }
      // Show body if we captured it; else show message
      if (typeof parsedData !== 'undefined') {
        responseData.textContent = formatResponseData(parsedData);
      } else {
        responseData.textContent = message;
      }
      // Auto scroll to response after displaying error
      try {
        setTimeout(() => {
          try {
            // Scroll within the panel container to show response section
            if (panel && responseSection) {
              // responseSection is a direct child of panel, so offsetTop is relative to panel
              const responseTop = responseSection.offsetTop;
              const targetTop = Math.max(0, responseTop - 10);
              if (typeof panel.scrollTo === 'function') {
                panel.scrollTo({ top: targetTop, behavior: 'smooth' });
              } else if (typeof panel.scroll === 'function') {
                panel.scroll({ top: targetTop, behavior: 'smooth' });
              } else {
                panel.scrollTop = targetTop;
              }
            }
          } catch {}
        }, 200);
      } catch {}
      extractWrap.style.display = 'none';
      resultBox.style.display = 'none';
    }
  }

  function addSelectedCell(row, col) {
    if (onConfirm) {
      const value = row && typeof row === 'object' ? row[col] : '';
      const cellValue = value === null || value === undefined ? '' : String(value);
      onConfirm(cellValue, undefined, undefined, undefined, undefined);
    }
  }

  function getTextResult() {
    // Prefer selected primitive from combobox if visible
    if (extractWrap.style.display !== 'none' && extractSelect.options.length) {
      const idx = Number(extractSelect.value || '');
      if (!Number.isNaN(idx) && primitiveCandidates[idx]) {
        const v = primitiveCandidates[idx].value;
        return v === null ? 'null' : String(v);
      }
    }
    if (resultBox.style.display === 'none' || resultBox.getAttribute('data-empty') === 'true') {
      return '';
    }
    return resultBox.textContent || '';
  }

  sendBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    runApiRequest();
  });

  useBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const txt = getTextResult();
    if (txt && onConfirm) {
      onConfirm(txt, undefined, undefined, undefined, undefined);
      close();
    }
  });

  // Footer actions: Cancel / Save (bottom-right)
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:8px;';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = 'height:28px;padding:0 10px;border:1px solid #e6ebee;border-radius:6px;background:#fff;color:#374151;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
  cancelBtn.addEventListener('click', (ev) => { ev.stopPropagation(); close(); });
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.style.cssText = 'height:28px;padding:0 12px;border:none;border-radius:6px;background:#3b82f6;color:#fff;font-weight:600;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;';
  saveBtn.disabled = true;
  saveBtn.style.opacity = '0.6';
  saveBtn.style.cursor = 'not-allowed';
  function updateSaveState() {
    const hasEndpoint = (() => { const u = (urlInput.value || '').trim(); return !!u && u !== 'https://'; })();
    const hasSelection = (extractWrap.style.display !== 'none' && extractSelect.options.length > 0);
    const enable = hasEndpoint && hasSelection;
    saveBtn.disabled = !enable;
    saveBtn.style.opacity = enable ? '1' : '0.6';
    saveBtn.style.cursor = enable ? 'pointer' : 'not-allowed';
  }
  saveBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    // Guard: require endpoint and a selected value
    updateSaveState();
    if (saveBtn.disabled) return;
    // finalValue: field name (JSON path) selected in combobox
    let finalValue = '';
    if (extractWrap.style.display !== 'none' && extractSelect.options.length) {
      const idx = Number(extractSelect.value || '');
      if (!Number.isNaN(idx) && primitiveCandidates[idx]) {
        finalValue = primitiveCandidates[idx].path || '';
      }
    }
    // Fallback: if no combobox selection, use empty string
    if (onConfirm) {
      // Build API request data per new schema
      const builtParams = paramsSection.getItems().filter(p => p.key && p.key.trim()).map(p => ({ key: p.key, value: p.value }));
      const builtHeaders = headersSection.getItems().filter(h => h.key && h.key.trim()).map(h => ({ key: h.key, value: h.value }));
      const authType = authSelect.value;
      const storageEnabled = !!storageToggle.checked;

      // Auth with storage embedded
      const tokenStorages = (storageEnabled && authType === 'bearer' && (tokenKeyInput.value || '').trim()) ? [
        { type: tokenStorageTypeSelect.value, key: (tokenKeyInput.value || '').trim() }
      ] : [];
      const basicAuthStorages = (storageEnabled && authType === 'basic' && (basicUsernameKeyInput.value || '').trim() && (basicPasswordKeyInput.value || '').trim()) ? [
        { type: basicStorageTypeSelect.value, usernameKey: (basicUsernameKeyInput.value || '').trim(), passwordKey: (basicPasswordKeyInput.value || '').trim() }
      ] : [];

      const auth  = {
        type: authType,
        storage_enabled: storageEnabled && authType !== 'none' ? true : false,
        username: authType === 'basic' && !storageEnabled ? (authUsernameInput.value || '') : undefined,
        password: authType === 'basic' && !storageEnabled ? (authPasswordInput.value || '') : undefined,
        token: authType === 'bearer' && !storageEnabled ? (authTokenInput.value || '') : undefined,
        token_storages: tokenStorages,
        basic_auth_storages: basicAuthStorages,
      };

      const bodyType = bodyTypeSelect.value;
      const body = {
        type: bodyType,
        content: bodyType === 'json' ? (bodyTextarea.value || '') : (bodyType === 'form' ? undefined : ''),
        formData: bodyType === 'form' ? bodyFormSection.getItems().filter(f => f.key && f.key.trim()).map((f, i) => ({ name: f.key, value: f.value, orderIndex: i })) : undefined,
      };

      const apiRequest = {
        method: String(methodSelect.value || 'GET').toLowerCase(),
        url: (urlInput.value || '').trim(),
        params: builtParams,
        headers: builtHeaders,
        auth,
        body,
      };

      // Gửi kết quả assert: (valuePath, connectionId, connection, query, apiRequest)
      // Với API không có connection/query → truyền undefined cho 3 tham số giữa
      // console.log('[apiRequestPanel] Save button clicked, calling onConfirm:', {
        finalValue,
        hasApiRequest: !!apiRequest,
        apiRequest: apiRequest
      });
      if (onConfirm) {
        try { 
          onConfirm(finalValue, undefined, undefined, undefined, apiRequest);
          // console.log('[apiRequestPanel] onConfirm called successfully');
        } catch (e) {
          // console.error('[apiRequestPanel] Error calling onConfirm:', e);
        }
      } else {
        // console.warn('[apiRequestPanel] onConfirm is not defined!');
      }
      // Close panel and modal (same behavior as confirm button in assertInputModal)
      try { close(); } catch {}
      try { closeAssertInputModal(); } catch {}
    }
  });
  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  function open() {
    panel.style.display = 'block';
    try {
      const margin = 10;
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const rect = panel.getBoundingClientRect();
      let top = rect.top;
      let left = rect.left;

      // Ensure within right/bottom bounds
      if (rect.right > vw - margin) {
        left = Math.max(margin, vw - rect.width - margin);
        panel.style.left = left + 'px';
        panel.style.right = 'auto';
      }
      if (rect.left < margin) {
        left = margin;
        panel.style.left = left + 'px';
        panel.style.right = 'auto';
      }
      if (rect.bottom > vh - margin) {
        top = Math.max(margin, vh - rect.height - margin);
        panel.style.top = top + 'px';
      }
      if (rect.top < margin) {
        top = margin;
        panel.style.top = top + 'px';
      }
    } catch {}
  }

  function close() {
    panel.style.display = 'none';
  }

  function isOpen() {
    return panel.style.display !== 'none';
  }

  panel.appendChild(header);
  panel.appendChild(methodUrlWrap);
  panel.appendChild(paramsSection.element);
  panel.appendChild(headersSection.element);
  panel.appendChild(authSection);
  panel.appendChild(bodySection);
  panel.appendChild(responseSection);
  panel.appendChild(extractWrap);
  panel.appendChild(resultBox);
  panel.appendChild(useBtn);
  panel.appendChild(footer);

  return { element: panel, open, close, isOpen, getTextResult, useBtn };
}

