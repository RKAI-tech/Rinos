export class BrowserManager {
  constructor() {
    this.pendingRequests = 0;
  }

  trackRequests(page) {
    page.on('request', (request) => {
      if (['xhr', 'fetch'].includes(request.resourceType())) {
        this.pendingRequests++;
      }
    });

    const decrement = (request) => {
      if (['xhr', 'fetch'].includes(request.resourceType())) {
        this.pendingRequests = Math.max(0, this.pendingRequests - 1);
      }
    };

    page.on('requestfinished', decrement);
    page.on('requestfailed', decrement);
  }

  async waitForAppIdle(timeout = 10000, idleTime = 500) {
    const start = Date.now();
    let idleStart = null;

    while (true) {
      if (this.pendingRequests === 0) {
        if (!idleStart) {
          idleStart = Date.now();
        } else if (Date.now() - idleStart >= idleTime) {
          return;
        }
      } else {
        idleStart = null;
      }

      if (Date.now() - start > timeout) {
        return;
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }
}

export async function resolveUniqueSelector(page, selectors) {
  if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('Page or selectors is invalid.');
  }
  const toLocator = (s) => {
    try {
      return eval(`page.${s}`);
    } catch (e) {
      return null;
    }
  };
  const locators = selectors.map(toLocator).filter((l) => !!l);
  await Promise.allSettled(
    locators.map((l) => l.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {}))
  );
  let minIndex = -1;
  let minCount = Infinity;
  for (let i = 0; i < locators.length; i++) {
    const count = await locators[i].count();
    if (count === 1) {
      return locators[i];
    }
    if (count > 0 && count < minCount) {
      minCount = count;
      minIndex = i;
    }
  }
  if (minIndex !== -1) {
    return locators[minIndex].first();
  }
  throw new Error('Invalid selectors. Please check the selectors and try again.');
}

export async function forceAction(page, selectors, action, payload) {
  const serializeError = (err) => {
    try {
      return String(err);
    } catch {
      return 'unknown error';
    }
  };

  const tryOne = async (selector) => {
    return page
      .evaluate(({ sel, type, payload }) => {
        function queryShadowAll(root, selector) {
          const out = [];
          const stack = [root];
          while (stack.length) {
            const node = stack.pop();
            if (!node) continue;
            if (node.querySelectorAll) {
              out.push(...Array.from(node.querySelectorAll(selector)));
            }
            if (node.shadowRoot) stack.push(node.shadowRoot);
            if (node.children) stack.push(...Array.from(node.children));
          }
          return out;
        }

        const textMatch = (el, target) => {
          if (!target) return false;
          const text = (el.textContent || '').trim();
          if (text === target) return true;
          return text.includes(target);
        };

        const getAccessibleName = (el) => {
          const aria = el.getAttribute && el.getAttribute('aria-label');
          if (aria) return aria;
          const label = el.getAttribute && el.getAttribute('aria-labelledby');
          if (label) {
            const ids = label.split(' ');
            const parts = [];
            ids.forEach((id) => {
              const ref = document.getElementById(id);
              if (ref && ref.textContent) parts.push(ref.textContent.trim());
            });
            if (parts.length) return parts.join(' ').trim();
          }
          if (el.alt) return el.alt;
          if (el.title) return el.title;
          return (el.innerText || '').trim();
        };

        function resolveElement(sel) {
          sel = sel.trim();
          const chainMatch = sel.match(/^locator\('(.+)'\)\.locator\('(.+)'\)$/);
          if (chainMatch) {
            const parentSel = chainMatch[1];
            const childSel = chainMatch[2];
            const parents = queryShadowAll(document, parentSel);
            if (parents.length === 1) {
              const child = queryShadowAll(parents[0], childSel);
              return child.length === 1 ? child[0] : child[0] || null;
            }
            return null;
          }

          const locatorMatch = sel.match(/^locator\('(.+)'\)$/);
          if (locatorMatch) {
            const css = locatorMatch[1];
            return queryShadowAll(document, css)[0] || null;
          }

          const testIdMatch = sel.match(/^getByTestId\('(.+)'\)$/);
          if (testIdMatch) {
            const v = testIdMatch[1];
            return queryShadowAll(document, `[data-testid="${v}"]`)[0] || null;
          }

          const roleMatch = sel.match(/^getByRole\('(.+)'\s*,?\s*(\{.*\})?\)$/);
          if (roleMatch) {
            const role = roleMatch[1];
            let name = '';
            try {
              const obj = roleMatch[2] ? JSON.parse(roleMatch[2].replace(/'/g, '"')) : null;
              name = obj?.name || '';
            } catch {}
            const candidates = queryShadowAll(document, `[role="${role}"]`);
            if (!name) return candidates[0] || null;
            const exact = candidates.find((el) => getAccessibleName(el) === name);
            if (exact) return exact;
            return candidates.find((el) => (getAccessibleName(el) || '').includes(name)) || null;
          }

          const textMatchSel = sel.match(/^getByText\('(.+)'\)$/);
          if (textMatchSel) {
            const t = textMatchSel[1];
            const candidates = queryShadowAll(document, '*').filter((el) => textMatch(el, t));
            return candidates.find((el) => (el.textContent || '').trim() === t) || candidates[0] || null;
          }

          const labelMatch = sel.match(/^getByLabel\('(.+)'\)$/);
          if (labelMatch) {
            const t = labelMatch[1];
            const labels = queryShadowAll(document, 'label').filter((el) => textMatch(el, t));
            for (const lb of labels) {
              const forId = lb.getAttribute('for');
              if (forId) {
                const target = document.getElementById(forId);
                if (target) return target;
              }
              const control = lb.querySelector('input,textarea,select,button');
              if (control) return control;
            }
            return null;
          }

          const placeholderMatch = sel.match(/^getByPlaceholder\('(.+)'\)$/);
          if (placeholderMatch) {
            const t = placeholderMatch[1];
            const candidates = queryShadowAll(document, 'input,textarea,select');
            return candidates.find((el) => el.getAttribute && el.getAttribute('placeholder') === t) || null;
          }

          const altMatch = sel.match(/^getByAltText\('(.+)'\)$/);
          if (altMatch) {
            const t = altMatch[1];
            return queryShadowAll(document, `[alt="${t}"]`)[0] || null;
          }
          const titleMatch = sel.match(/^getByTitle\('(.+)'\)$/);
          if (titleMatch) {
            const t = titleMatch[1];
            return queryShadowAll(document, `[title="${t}"]`)[0] || null;
          }

          return null;
        }

        const el = resolveElement(sel);
        if (!el) return { ok: false, reason: 'not_found' };

        const scrollIntoViewIfNeeded = (node) => {
          try {
            node.scrollIntoView({ block: 'center', inline: 'center' });
          } catch {}
        };

        scrollIntoViewIfNeeded(el);

        const dispatchMouse = (node, eventName) => {
          const evt = new MouseEvent(eventName, { bubbles: true, cancelable: true, view: window, buttons: 1 });
          node.dispatchEvent(evt);
        };

        switch (type) {
          case 'click':
            dispatchMouse(el, 'pointerdown');
            dispatchMouse(el, 'mousedown');
            dispatchMouse(el, 'mouseup');
            dispatchMouse(el, 'click');
            return { ok: true };
          case 'dblclick':
            dispatchMouse(el, 'pointerdown');
            dispatchMouse(el, 'mousedown');
            dispatchMouse(el, 'mouseup');
            dispatchMouse(el, 'click');
            dispatchMouse(el, 'mousedown');
            dispatchMouse(el, 'mouseup');
            dispatchMouse(el, 'click');
            dispatchMouse(el, 'dblclick');
            return { ok: true };
          case 'input':
            if (!('value' in el)) return { ok: false, reason: 'not_input' };
            el.value = payload || '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true };
          case 'select':
            if (el.tagName !== 'SELECT') return { ok: false, reason: 'not_select' };
            const selectEl = el;
            const opts = Array.from(selectEl.options);
            let target = opts.find((o) => o.value === payload) || opts.find((o) => o.text === payload);
            if (!target && opts.length && payload === undefined) target = opts[0];
            if (!target) return { ok: false, reason: 'option_not_found' };
            selectEl.value = target.value;
            target.selected = true;
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true };
          default:
            return { ok: false, reason: 'unsupported' };
        }
      }, { sel: selector, type: action, payload })
      .catch((err) => ({ ok: false, reason: serializeError(err) }));
  };

  for (const sel of selectors) {
    const result = await tryOne(sel);
    if (result && result.ok) {
      return;
    }
  }
  throw new Error('This action is failed. Please check the selector or contact support.');
}

export async function executeApiRequest(page, apiData = {}) {
  let url = apiData?.url || '';
  try {
    const params = Array.isArray(apiData.params) ? apiData.params : [];
    if (params.length > 0) {
      const valid = params.filter(
        (p) => p && p.key && String(p.key).trim() && p.value != null && String(p.value).trim()
      );
      if (valid.length > 0) {
        const search = new URLSearchParams();
        valid.forEach((p) => search.append(String(p.key).trim(), String(p.value).trim()));
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}${search.toString()}`;
      }
    }
  } catch (err) {
    try {
      /* console.warn('[Controller][API] Build params error', err); */
    } catch (_) {}
  }

  const headers = {};
  try {
    const hdrs = Array.isArray(apiData.headers) ? apiData.headers : [];
    hdrs.forEach((h) => {
      if (h && h.key && String(h.key).trim() && h.value != null && String(h.value).trim()) {
        headers[String(h.key).trim()] = String(h.value).trim();
      }
    });
  } catch (err) {
    try {
      /* console.warn('[Controller][API] Build headers error', err); */
    } catch (_) {}
  }

  try {
    const auth = apiData.auth;
    if (auth && auth.type === 'bearer') {
      if (auth.token && String(auth.token).trim()) {
        headers['Authorization'] = `Bearer ${String(auth.token).trim()}`;
      } else {
        const ts =
          Array.isArray(auth.token_storages) && auth.token_storages.length > 0 ? auth.token_storages[0] : undefined;
        if (ts && ts.key && ts.type) {
          let bearer = '';
          if (ts.type === 'localStorage') {
            bearer = await page.evaluate(({ k }) => localStorage.getItem(k) || '', { k: ts.key });
          } else if (ts.type === 'sessionStorage') {
            bearer = await page.evaluate(({ k }) => sessionStorage.getItem(k) || '', { k: ts.key });
          } else if (ts.type === 'cookie') {
            bearer = await page.evaluate(({ name }) => {
              const match = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
              return match ? decodeURIComponent(match.split('=')[1]) : '';
            }, { name: ts.key });
          }
          if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
        }
      }
    } else if (auth && auth.type === 'basic') {
      if (auth.username && auth.password) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      } else {
        const bs =
          Array.isArray(auth.basic_auth_storages) && auth.basic_auth_storages.length > 0
            ? auth.basic_auth_storages[0]
            : undefined;
        if (bs && bs.type && bs.usernameKey && bs.passwordKey) {
          let creds = { u: '', p: '' };
          if (bs.type === 'localStorage') {
            creds = await page.evaluate(
              ({ uk, pk }) => ({ u: localStorage.getItem(uk) || '', p: localStorage.getItem(pk) || '' }),
              { uk: bs.usernameKey, pk: bs.passwordKey }
            );
          } else if (bs.type === 'sessionStorage') {
            creds = await page.evaluate(
              ({ uk, pk }) => ({ u: sessionStorage.getItem(uk) || '', p: sessionStorage.getItem(pk) || '' }),
              { uk: bs.usernameKey, pk: bs.passwordKey }
            );
          } else if (bs.type === 'cookie') {
            creds = await page.evaluate(({ uk, pk }) => {
              const getCookie = (n) => {
                const match = document.cookie.split('; ').find((r) => r.startsWith(n + '='));
                return match ? decodeURIComponent(match.split('=')[1]) : '';
              };
              return { u: getCookie(uk), p: getCookie(pk) };
            }, { uk: bs.usernameKey, pk: bs.passwordKey });
          }
          if (creds.u && creds.p) {
            headers['Authorization'] = 'Basic ' + Buffer.from(`${creds.u}:${creds.p}`).toString('base64');
          }
        }
      }
    }
  } catch (err) {
    try {
      /* console.warn('[Controller][API] Resolve auth error', err); */
    } catch (_) {}
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
          .filter((p) => p && p.name && String(p.name).trim())
          .forEach((p) => {
            formBody[String(p.name).trim()] = String(p.value ?? '');
          });
        options.data = formBody;
      }
    }
  } catch (err) {
    try {
      /* console.warn('[Controller][API] Build options error', err); */
    } catch (_) {}
  }

  const method = (apiData.method || 'get').toLowerCase();
  try {
    /* console.log('[Controller][API] Sending request', { method, url, hasHeaders: Object.keys(headers).length > 0 }); */
  } catch (_) {}
  const client = page.request;
  const requestFn = typeof client[method] === 'function' ? client[method].bind(client) : client.get.bind(client);
  const response = await requestFn(url, options);
  try {
    /* console.log('[Controller][API] Response status:', await response.status()); */
  } catch (_) {}
  return response;
}

export async function exportDatabaseToExcel(result, stepIndex, queryString = '', queryIndex = null) {
  const XLSXModule = await import('xlsx');
  const XLSX = XLSXModule.default || XLSXModule;
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const databaseFolder = 'databases';
  if (!fs.existsSync(databaseFolder)) {
    fs.mkdirSync(databaseFolder, { recursive: true });
  }
  const fileSuffix = queryIndex !== null && queryIndex !== undefined ? `_${queryIndex}` : '';
  const excelFileName = `${databaseFolder}/Step_${stepIndex}${fileSuffix}.xlsx`;
  const workbook = XLSX.utils.book_new();
  const dataRows = result.rows || [];
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.sheet_add_aoa(worksheet, [[`Query: ${queryString || ''}`]], { origin: 'A1' });
  let columnHeaders = [];
  if (dataRows.length > 0) {
    columnHeaders = Object.keys(dataRows[0]);
  }
  if (columnHeaders.length > 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A3' });
    if (dataRows.length > 0) {
      const dataValues = dataRows.map((row) => columnHeaders.map((key) => row[key] ?? ''));
      XLSX.utils.sheet_add_aoa(worksheet, dataValues, { origin: 'A4' });
    }
  }
  if (columnHeaders.length > 0) {
    const colWidths = [{ wch: 80 }];
    for (let i = 1; i <= columnHeaders.length; i++) {
      colWidths.push({ wch: 15 });
    }
    worksheet['!cols'] = colWidths;
  } else {
    worksheet['!cols'] = [{ wch: 80 }];
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, excelFileName);
}

export async function exportApiToJson(apiResult, stepIndex, requestIndex = null) {
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const apiFolder = 'apis';
  if (!fs.existsSync(apiFolder)) {
    fs.mkdirSync(apiFolder, { recursive: true });
  }
  const fileSuffix = requestIndex !== null && requestIndex !== undefined ? `_${requestIndex}` : '';
  const jsonFileName = `${apiFolder}/Step_${stepIndex}${fileSuffix}.json`;
  let baseUrl = '';
  let apiPath = '';
  let queryParams = {};
  const fullUrl = apiResult.endpoint || '';
  try {
    const urlObj = new URL(fullUrl);
    baseUrl = urlObj.origin;
    apiPath = urlObj.pathname;
    queryParams = Object.fromEntries(urlObj.searchParams);
  } catch (e) {
    baseUrl = fullUrl;
    apiPath = '';
  }
  const apiData = {
    step_index: stepIndex,
    request_index: requestIndex,
    timestamp: new Date().toISOString(),
    request: {
      method: apiResult.method || 'GET',
      url: fullUrl,
      base_url: baseUrl,
      path: apiPath,
      query_params: queryParams,
      headers: apiResult.headers || {},
    },
    response: {
      status: apiResult.status || 0,
      status_text: apiResult.status_text || '',
      headers: apiResult.response_headers || apiResult.headers || {},
      body: {
        payload: apiResult.payload || null,
      },
      duration_ms: apiResult.duration_ms || 0,
    },
  };
  fs.writeFileSync(jsonFileName, JSON.stringify(apiData, null, 2), 'utf8');
}
