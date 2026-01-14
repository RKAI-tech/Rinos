import { test, expect } from '@playwright/test';
class BrowserManager {
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
        // if (idleStart) console.log('Pending requests detected, resetting idle timer.');
        idleStart = null;
      }

      if (Date.now() - start > timeout) {
        return;
      }

      await new Promise((r) => setTimeout(r, 100));
    }
  }
}
import { Client as PgClient } from 'pg';
async function resolveUniqueSelector(page, selectors) {
  if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
    throw new Error('Page or selectors is invalid.');
  }
  const toLocator = (s) => { return eval(`page.${s}`); };
  const locators = selectors.map(toLocator);
  await Promise.allSettled(
    locators.map(l => l.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {}))
  );
  let minIndex = -1; let minCount = Infinity;
  for (let i = 0; i < locators.length; i++) {
    const count = await locators[i].count();
    if (count === 1) { return locators[i]; }
    if (count > 0 && count < minCount) {
      minCount = count;
      minIndex = i;
    }
  }
  if (minIndex !== -1) { return locators[minIndex].first(); }
  throw new Error(`Invalid selectors. Please check the selectors and try again.`);
}
async function executeApiRequest(page, apiData = {}) {
  let url = apiData?.url || '';
  try {
    const params = Array.isArray(apiData.params) ? apiData.params : [];
    if (params.length > 0) {
      const valid = params.filter(p => p && p.key && String(p.key).trim() && p.value != null && String(p.value).trim());
      if (valid.length > 0) {
        const search = new URLSearchParams();
        valid.forEach(p => search.append(String(p.key).trim(), String(p.value).trim()));
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}${search.toString()}`;
      }
    }
  } catch (err) {
    try { /* console.warn('[Controller][API] Build params error', err); */ } catch (_) {}
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
    try { /* console.warn('[Controller][API] Build headers error', err); */ } catch (_) {}
  }

  try {
    const auth = apiData.auth;
    if (auth && auth.type === 'bearer') {
      if (auth.token && String(auth.token).trim()) {
        headers['Authorization'] = `Bearer ${String(auth.token).trim()}`;
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
          if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
        }
      }
    } else if (auth && auth.type === 'basic') {
      if (auth.username && auth.password) {
        headers['Authorization'] = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
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
            headers['Authorization'] = 'Basic ' + Buffer.from(`${creds.u}:${creds.p}`).toString('base64');
          }
        }
      }
    }
  } catch (err) {
    try { /* console.warn('[Controller][API] Resolve auth error', err); */ } catch (_) {}
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
    try { /* console.warn('[Controller][API] Build options error', err); */ } catch (_) {}
  }

  const method = (apiData.method || 'get').toLowerCase();
  try { /* console.log('[Controller][API] Sending request', { method, url, hasHeaders: Object.keys(headers).length > 0 }); */ } catch (_) {}
  const client = page.request;
  const requestFn = typeof client[method] === 'function' ? client[method].bind(client) : client.get.bind(client);
  const response = await requestFn(url, options);
  try { /* console.log('[Controller][API] Response status:', await response.status()); */ } catch (_) {}
  return response;
}

async function exportDatabaseToExcel(result, stepIndex, queryString = '', queryIndex = null) {
  // Dynamic imports for ES modules
  const XLSXModule = await import('xlsx');
  const XLSX = XLSXModule.default || XLSXModule;
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const databaseFolder = './test-results/e2abf4190ff748e39946140b1510d2c1/database-execution';
  
  // Ensure database folder exists
  if (!fs.existsSync(databaseFolder)) {
    fs.mkdirSync(databaseFolder, { recursive: true });
  }
  
  // Generate file name
  const fileSuffix = queryIndex !== null && queryIndex !== undefined ? `_${queryIndex}` : '';
  const excelFileName = `${databaseFolder}/Step_${stepIndex}_database${fileSuffix}.xlsx`;
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const dataRows = result.rows || [];
  
  // Create worksheet manually to have:
  // Row 1: Query: <<query string>>
  // Row 2: (empty)
  // Row 3: Column headers (field names)
  // Row 4+: Data rows
  
  // Initialize worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  
  // Row 1: Query row
  XLSX.utils.sheet_add_aoa(worksheet, [[`Query: ${queryString || ''}`]], { origin: 'A1' });
  
  // Row 2: Empty row (skip)
  
  // Get column headers from first data row if available
  let columnHeaders = [];
  if (dataRows.length > 0) {
    columnHeaders = Object.keys(dataRows[0]);
  }
  
  // Row 3: Column headers
  if (columnHeaders.length > 0) {
    XLSX.utils.sheet_add_aoa(worksheet, [columnHeaders], { origin: 'A3' });
    
    // Row 4+: Data rows
    if (dataRows.length > 0) {
      const dataValues = dataRows.map(row => columnHeaders.map(key => row[key] ?? ''));
      XLSX.utils.sheet_add_aoa(worksheet, dataValues, { origin: 'A4' });
    }
  }
  
  // Set column widths: Query column wider, others default
  if (columnHeaders.length > 0) {
    // First column (Query) is wider, rest are default
    const colWidths = [{ wch: 80 }];
    for (let i = 1; i <= columnHeaders.length; i++) {
      colWidths.push({ wch: 15 });
    }
    worksheet['!cols'] = colWidths;
  } else {
    // Only query row, set Query column width
    worksheet['!cols'] = [{ wch: 80 }];
  }
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, excelFileName);
}

async function exportApiToJson(apiResult, stepIndex, requestIndex = null) {
  // Dynamic imports for ES modules
  const fsModule = await import('fs');
  const fs = fsModule.default || fsModule;
  const pathModule = await import('path');
  const path = pathModule.default || pathModule;
  const apiFolder = './test-results/e2abf4190ff748e39946140b1510d2c1/api-execution';
  
  // Ensure API folder exists
  if (!fs.existsSync(apiFolder)) {
    fs.mkdirSync(apiFolder, { recursive: true });
  }
  
  // Generate file name
  const fileSuffix = requestIndex !== null && requestIndex !== undefined ? `_${requestIndex}` : '';
  const jsonFileName = `${apiFolder}/Step_${stepIndex}_api${fileSuffix}.json`;
  
  // Parse URL to extract base_url and path
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
    // If URL parsing fails, use endpoint as-is
    baseUrl = fullUrl;
    apiPath = '';
  }
  
  // Prepare API data object
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
      duration_ms: apiResult.duration_ms || 0
    },
   
  };
  
  // Write JSON file
  fs.writeFileSync(jsonFileName, JSON.stringify(apiData, null, 2), 'utf8');
}


function verifyProjectCount(elements, dbDataList, apiDataList) {
    try {
        if (elements == null) elements = [];
        if (dbDataList == null) dbDataList = [];
        if (apiDataList == null) apiDataList = [];

        if (!Array.isArray(elements) || !Array.isArray(dbDataList) || !Array.isArray(apiDataList)) {
            throw new Error('Invalid input types: elements, dbDataList, and apiDataList must be arrays');
        }

        const statElement = elements.find(el => typeof el === 'string' && el.includes('stat-number'));
        if (!statElement) {
            return false;
        }
        const uiValue = parseInt(statElement.replace(/<[^>]*>/g, '').trim(), 10);

        const dbDataset = dbDataList.find(ds => Array.isArray(ds) && ds.length > 0 && ds[0].hasOwnProperty('count'));
        if (!dbDataset) {
            return false;
        }
        const dbValue = parseInt(dbDataset[0].count, 10);

        const apiResponse = apiDataList.find(api => api && api.payload && api.payload.hasOwnProperty('total_projects'));
        if (!apiResponse) {
            return false;
        }
        const apiValue = parseInt(apiResponse.payload.total_projects, 10);

        if (isNaN(uiValue) || isNaN(dbValue) || isNaN(apiValue)) {
            return false;
        }

        return uiValue === dbValue && dbValue === apiValue;
    } catch (error) {
        throw new Error(`Code execution error: ${error.message}`);
    }
};
test('Generated Test', async ({ context, page}) => {
    const bm = new BrowserManager();
    bm.trackRequests(page);
    page.setDefaultTimeout(30000);
    let result; let cookies; let locator; let element;
    await test.step('1. Navigate to page.', async () => {
      await page.goto('https://testcase-generation.rikkei.org');
    })
    await bm.waitForAppIdle();
    await test.step('2. Click on 🚀Start Create Test Cases.', async () => {
      locator = await resolveUniqueSelector(page, ["getByRole(\'button\', { name: \'🚀Start Create Test Cases\' })", 'locator(\'.hero-cta-wrapper\').locator(\'button\')', 'locator(\'div#root > div.App > div.lp-landing-root > section.hero-section > div.hero-content > div.hero-cta-wrapper > button.hero-cta\')', 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/section[1]/div[2]/div[2]/button[1]\')']);
      await locator.click();
    })
    await bm.waitForAppIdle();
    await test.step('3. Click on Email.', async () => {
      locator = await resolveUniqueSelector(page, ['getByPlaceholder(\'user@example.com\')', "getByRole(\'textbox\', { name: \'Email\' })", 'getByLabel(\'Email\')', 'locator(\'.login-form\').locator(\'input[type=\"email\"]\')', 'locator(\'input#email\')', 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[2]/form[1]/div[1]/input[1]\')']);
      await locator.click();
    })
    await bm.waitForAppIdle();
    await test.step('4. Enter text into Email.', async () => {
      locator = await resolveUniqueSelector(page, ['getByPlaceholder(\'user@example.com\')', "getByRole(\'textbox\', { name: \'Email\' })", 'getByLabel(\'Email\')', 'locator(\'.login-form\').locator(\'input[type=\"email\"]\')', 'locator(\'input#email\')', 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[2]/form[1]/div[1]/input[1]\')']);
      await locator.fill('hoangdinhhung20012003@gmail.com');
    })
    await bm.waitForAppIdle();
    await test.step('5. Press a key.', async () => {
      locator = await resolveUniqueSelector(page, ['getByPlaceholder(\'user@example.com\')', "getByRole(\'textbox\', { name: \'Email\' })", 'getByLabel(\'Email\')', 'locator(\'.login-form\').locator(\'input[type=\"email\"]\')', 'locator(\'input#email\')', 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[2]/form[1]/div[1]/input[1]\')']);
      await locator.press('Enter');
    })
    await bm.waitForAppIdle();
    await test.step('6. Enter text into Password.', async () => {
      locator = await resolveUniqueSelector(page, ['getByPlaceholder(\'********\')', "getByRole(\'textbox\', { name: \'Password\' })", 'getByLabel(\'Password\')', 'locator(\'.password-input-container\').locator(\'input[type=\"password\"]\')', 'locator(\'input#password\')', 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[2]/form[1]/div[2]/div[1]/input[1]\')']);
      await locator.fill('20012003');
    })
    await bm.waitForAppIdle();
    await test.step('7. Press a key.', async () => {
      locator = await resolveUniqueSelector(page, ['getByPlaceholder(\'********\')', "getByRole(\'textbox\', { name: \'Password\' })", 'getByLabel(\'Password\')', 'locator(\'.password-input-container\').locator(\'input[type=\"password\"]\')', 'locator(\'input#password\')', 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[1]/div[2]/div[2]/form[1]/div[2]/div[1]/input[1]\')']);
      await locator.press('Enter');
    })
    await bm.waitForAppIdle();
    await page.screenshot({ path: './test-results/e2abf4190ff748e39946140b1510d2c1/Step_8.png' });
    await test.step('8. Verify element has toHaveText value: count', async () => {
      locator = await resolveUniqueSelector(page, ["locator(\'div#root > div.App > div.projects-container > div.projects-content > div.project-overview > div.project-statistics > div.stats-grid > div:nth-of-type(1) > div.stat-value > span.stat-number\')", 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[2]/div[1]/div[1]/div[2]/span[2]\')']);
      await locator.scrollIntoViewIfNeeded();
            const postgresDB = new PgClient({
        host: '10.1.5.24',
        port: 5432,
        database: 'plane_demo',
        user: 'postgres',
        password: 'postgres',
        ssl: false
      });
      await postgresDB.connect();      var result = await postgresDB.query('select count(*)+1 as count from user');
      await exportDatabaseToExcel(result, 8, 'select count(*)+1 as count from user', null);
      var resultText = result.rows[0]?.count;
      await postgresDB.end();
      await expect(locator).toHaveText(String(resultText));
    })
    await bm.waitForAppIdle();
    await page.screenshot({ path: './test-results/e2abf4190ff748e39946140b1510d2c1/Step_9_0.png' });
    await test.step('9. Compares the count from a UI element, a database record, and an API payload to ensure they are all equal.', async () => {
      let outerHTMLs = [];
      locator = await resolveUniqueSelector(page, ["locator(\'div#root > div.App > div.projects-container > div.projects-content > div.project-overview > div.project-statistics > div.stats-grid > div:nth-of-type(1) > div.stat-value > span.stat-number\')", 'locator(\'//html[1]/body[1]/div[1]/div[1]/div[1]/div[2]/div[1]/div[2]/div[1]/div[1]/div[2]/span[2]\')'], 9);
      await locator.scrollIntoViewIfNeeded();
      outerHTMLs.push(await locator.evaluate((el) => el.outerHTML));
      let databaseResults = [];
            const postgresDB = new PgClient({
        host: '10.1.5.24',
        port: 5432,
        database: 'plane_demo',
        user: 'postgres',
        password: 'postgres',
        ssl: false
      });
      await postgresDB.connect();      var result = await postgresDB.query('select count(*)+1 as count from user');
      await exportDatabaseToExcel(result, 9, 'select count(*)+1 as count from user', 0);
      var records = result.rows
      await postgresDB.end();
      databaseResults.push(records);
      let apiResults = [];
      var apiData = {
    "url": "https://testcase-generation-api.rikkei.org/api/projects/my_projects",
    "method": "get",
    "params": [],
    "headers": [],
    "auth": {
        "type": "bearer",
        "storage_enabled": true,
        "username": null,
        "password": null,
        "token": null,
        "token_storages": [
            {
                "key": "access_token",
                "type": "localStorage"
            }
        ],
        "basic_auth_storages": []
    },
    "body": {
        "type": "none",
        "content": "",
        "formData": []
    }
};
      var response = await executeApiRequest(page, apiData);
      var responseJson = await response.json();
      var apiResult = {endpoint: 'https://testcase-generation-api.rikkei.org/api/projects/my_projects', method: 'get', status: await response.status(), status_text: response.statusText(), headers: response.headers(),payload: responseJson};
      await exportApiToJson(apiResult, 9, 0);
      apiResults.push(apiResult);
      var expected = verifyProjectCount(outerHTMLs,databaseResults,apiResults);
      await expect(expected).toBe(true);
    })
    await bm.waitForAppIdle();
});
