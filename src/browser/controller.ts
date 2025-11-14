import { Action, ActionType } from "./types";
import { ApiRequestData } from "./types/api_request";
import { BrowserContext, Page, Request } from "playwright";
import { BasicAuthentication } from "../renderer/recorder/types/basic_auth";
import { FileService } from "./services/files";
const os = require('os');
const fs = require('fs');
const path = require('path');
const tmpDir = os.tmpdir();

export enum BrowserStorageType {
    COOKIE = 'cookie',
    LOCAL_STORAGE = 'localStorage',
    SESSION_STORAGE = 'sessionStorage',
}

export class Controller {
    private pendingRequests: number;
    private fileService: FileService;
    private onActionExecuting?: (index: number) => void;
    private onActionFailed?: (index: number) => void;
    public browserManager?: any; // Reference to BrowserManager for window operations

    constructor() {
        this.pendingRequests = 0;
        this.fileService = new FileService();
    }

    setExecutionCallbacks(onExecuting?: (index: number) => void, onFailed?: (index: number) => void) {
        this.onActionExecuting = onExecuting;
        this.onActionFailed = onFailed;
    }

    async addCookies(context: BrowserContext, page: Page, cookies: any): Promise<void> {
        await context.addCookies(JSON.parse(cookies));
        await page.reload();
    }

    async addLocalStorage(page: Page, localStorageJSON: any): Promise<void> {
        await page.evaluate((data: any) => {
            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, value as any);
            });
        }, JSON.parse(localStorageJSON));
        await page.reload();
    }

    async addSessionStorage(page: Page, sessionStorageJSON: any): Promise<void> {
        await page.evaluate((data: any) => {
            Object.entries(data).forEach(([key, value]) => {
                sessionStorage.setItem(key, value as any);
            });
        }, JSON.parse(sessionStorageJSON));
        await page.reload();
    }

    async navigate(page: Page, url: string): Promise<void> {
        if (!page) {
            throw new Error('Browser page not found');
        }

        await page.goto(url);
    }

    async reload(page: Page): Promise<void> {
        await page.reload();
    }

    async goBack(page: Page): Promise<void> {
        await page.goBack();
    }

    async goForward(page: Page): Promise<void> {
        await page.goForward();
    }

  private async executeApiRequest(page: Page, apiData: ApiRequestData): Promise<void> {
    // Build URL with params (schema mới)
    let url = apiData.url || '';
    try {
      const params = apiData.params || [];
      if (params.length > 0) {
        const valid = params.filter(p => p.key && String(p.key).trim() && p.value != null && String(p.value).trim());
        if (valid.length > 0) {
          const search = new URLSearchParams();
          valid.forEach(p => search.append(String(p.key).trim(), String(p.value).trim()))
          const sep = url.includes('?') ? '&' : '?'
          url = `${url}${sep}${search.toString()}`;
        }
      }
    } catch {}

    // Prepare headers
    const headers: Record<string, string> = {};
    try {
      const hdrs = apiData.headers || [];
      if (hdrs.length > 0) {
        hdrs.forEach(h => {
          if (h.key && String(h.key).trim() && h.value != null && String(h.value).trim()) {
            headers[String(h.key).trim()] = String(h.value).trim();
          }
        })
      }
    } catch {}

    // Authorization from explicit values or storage
    try {
      const auth = apiData.auth;
      if (auth && auth.type === 'bearer') {
        if (auth.token && String(auth.token).trim()) {
          headers['Authorization'] = `Bearer ${String(auth.token).trim()}`;
        } else {
          const ts = auth.token_storages && auth.token_storages.length > 0 ? auth.token_storages[0] : undefined;
          if (ts && ts.key && ts.type) {
            let bearer = '';
            if (ts.type === 'localStorage') {
              bearer = await page.evaluate(({ k }) => localStorage.getItem(k) || '', { k: ts.key });
            } else if (ts.type === 'sessionStorage') {
              bearer = await page.evaluate(({ k }) => sessionStorage.getItem(k) || '', { k: ts.key });
            } else if (ts.type === 'cookie') {
              bearer = await page.evaluate(({ name }) => { const m = document.cookie.split('; ').find(r => r.startsWith(name + '=')); return m ? decodeURIComponent(m.split('=')[1]) : ''; }, { name: ts.key });
            }
            if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
          }
        }
      } else if (auth && auth.type === 'basic') {
        if (auth.username && auth.password) {
          headers['Authorization'] = 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        } else {
          const bs = auth.basic_auth_storages && auth.basic_auth_storages.length > 0 ? auth.basic_auth_storages[0] : undefined;
          if (bs && bs.type && bs.usernameKey && bs.passwordKey) {
            let creds: { u: string; p: string } = { u: '', p: '' };
            if (bs.type === 'localStorage') {
              creds = await page.evaluate(({ uk, pk }) => ({ u: localStorage.getItem(uk) || '', p: localStorage.getItem(pk) || '' }), { uk: bs.usernameKey, pk: bs.passwordKey });
            } else if (bs.type === 'sessionStorage') {
              creds = await page.evaluate(({ uk, pk }) => ({ u: sessionStorage.getItem(uk) || '', p: sessionStorage.getItem(pk) || '' }), { uk: bs.usernameKey, pk: bs.passwordKey });
            } else if (bs.type === 'cookie') {
              creds = await page.evaluate(({ uk, pk }) => { const getC = (n: string) => { const m = document.cookie.split('; ').find(r => r.startsWith(n + '=')); return m ? decodeURIComponent(m.split('=')[1]) : ''; }; return { u: getC(uk), p: getC(pk) }; }, { uk: bs.usernameKey, pk: bs.passwordKey });
            }
            if (creds.u && creds.p) headers['Authorization'] = 'Basic ' + Buffer.from(`${creds.u}:${creds.p}`).toString('base64');
          }
        }
      }
    } catch { try { console.log('[Controller][API] Resolve auth error'); } catch {} }

    // Prepare request options
    const options: any = { headers };
    try {
      const body = apiData.body;
      if (body && body.type !== 'none') {
        if (body.type === 'json') {
          options.data = body.content;
        } else if (body.type === 'form' && body.formData) {
          const formBody: Record<string, string> = {};
          body.formData
            .filter(p => p.name && String(p.name).trim())
            .forEach(p => { formBody[String(p.name).trim()] = String(p.value ?? ''); });
          options.data = formBody;
        }
      }
    } catch { try { console.log('[Controller][API] Build options error'); } catch {} }

    // Execute
    const method = ((apiData.method as any) || 'get').toLowerCase();
    try { console.log('[Controller][API] Sending request', { method, url, hasHeaders: Object.keys(headers).length > 0 }); } catch {}
    const resp = await (page.request as any)[method](url, options);
    try { console.log('[Controller][API] Response status:', await resp.status()); } catch {}
   
      
  }

    trackRequests(page: Page): void {
        page.on('request', (request: Request) => {
            if (['xhr', 'fetch'].includes(request.resourceType())) {
                this.pendingRequests++;
            }
        });

        const decrement = (request: Request) => {
            if (['xhr', 'fetch'].includes(request.resourceType())) {
                this.pendingRequests = Math.max(0, this.pendingRequests - 1);
            }
        };

        page.on('requestfinished', decrement);
        page.on('requestfailed', decrement);
    }

    async waitForAppIdle(timeout: number = 10000, idleTime: number = 500): Promise<void> {
        const start = Date.now();
        let idleStart: number | null = null;

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
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
    async resolveUniqueSelector(page: Page, selectors: string[]): Promise<string> {
        if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
            throw new Error('[Controller] Invalid inputs for resolveUniqueSelector');
        }

        // console.log(`[Controller] Resolving unique selector from candidates:`, selectors);

        for (const raw of selectors) {
            const s = String(raw).trim();
            if (!s) continue;

            try {
                let locator;

                // Handle XPath selectors
                if (s.startsWith('xpath=') || s.startsWith('/')) {
                    const xpathExpr = s.startsWith('xpath=') ? s.substring(6) : s;
                    locator = page.locator(`xpath=${xpathExpr}`);
                } else {
                    // Handle CSS selectors
                    locator = page.locator(s);
                }

                // Wait for element to be attached
                await locator.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => { });

                // Check if selector is unique
                const count = await locator.count();
                // console.log(`[Controller] Selector "${s}" found ${count} elements`);

                if (count === 1) {
                    // Normalize return: if original is raw XPath, prefix with 'xpath='
                    const normalized = (s.startsWith('/') || s.startsWith('(')) ? `xpath=${s}` : s;
                    // console.log(`[Controller] Using unique selector: ${normalized}`);
                    return normalized;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                // console.log(`[Controller] Selector "${s}" failed:`, errorMessage);
                // ignore and try next selector
            }
        }

        console.error(`[Controller] No unique selector found from:`, selectors);
        throw new Error('[Controller] No matching selector found in ' + selectors.join(', '));
    }
    //get page promt page index
    async getPage(pageIndex: number): Promise<Page> {
        let page:Page|null=null;
        for (const [pageId, index] of this.browserManager?.pages_index.entries() || []) {
            if (index === pageIndex) {
                page = this.browserManager?.pages.get(pageId);
                break;
            }
        }
        if (!page) {
            //create new page
            const page = await this.browserManager?.createPage(pageIndex);
            if (!page) throw new Error('Failed to create page');
            return page;
        }
        return page;
    }
    async executeMultipleActions(context: BrowserContext, actions: Action[]): Promise<void> {
        if (!Array.isArray(actions) || actions.length === 0) {
            throw new Error('Actions array is required and cannot be empty');
        }
       
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const pageIndex = action.action_datas?.[0]?.value?.page_index || 0;
            if (this.browserManager) {
                let pageId:string|null=null;
                for (const [idd, index] of this.browserManager.pages_index.entries()) {
                    if (index === pageIndex) {
                        pageId = idd;
                        break;
                    }
                }
                if (pageId) {
                    this.browserManager.activePageId = pageId;
                }else{
                    throw new Error('Page not found');
                }
            }
            // change active page id
            this.onActionExecuting?.(i);
            try {
                switch (action.action_type) {

                    case ActionType.navigate:{
                        if (!action.action_datas?.[0]?.value?.value) {
                            throw new Error('URL is required for navigate action');
                        }
                        const activePage = await this.getPage(pageIndex);
                        await this.navigate(activePage, action.action_datas?.[0]?.value?.value);
                        break;
                    }
                    case ActionType.reload:
                    {
                        const activePage = await this.getPage(pageIndex);
                        await this.reload(activePage);  
                        break;
                    }
                    case ActionType.back:{
                        const activePage = await this.getPage(action.action_datas?.[0]?.value?.pageIndex || 0);
                        await activePage.goBack();
                        break;
                    }
                    case ActionType.add_browser_storage:{
                        const activePage = await this.getPage(pageIndex);
                        // console.log('[Controller] Action:', action);
                        if (action.action_datas?.[0]?.browser_storage) {
                            const browser_storage = action.action_datas?.[0]?.browser_storage;
                            if (browser_storage.storage_type === BrowserStorageType.COOKIE) {
                                await this.addCookies(context, activePage, JSON.stringify(browser_storage.value));
                            } else if (browser_storage.storage_type === BrowserStorageType.LOCAL_STORAGE) {
                                await this.addLocalStorage(activePage, JSON.stringify(browser_storage.value));
                            } else if (browser_storage.storage_type === BrowserStorageType.SESSION_STORAGE) {
                                await this.addSessionStorage(activePage, JSON.stringify(browser_storage.value));
                            }
                        }
                        break;
                    }
                    case ActionType.click:
                        {
                            const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                            try {
                                await activePage.click(uniqueSelector, { timeout: 5000 });
                                // console.log(`[Controller] Clicked on unique selector: ${uniqueSelector}`);
                            } catch (error) {
                                // console.log(`[Controller] Click failed, trying JS fallback for unique selector: ${uniqueSelector}`);
                                const jsCode = `document.querySelector('${uniqueSelector}').click()`;
                                await activePage.evaluate(jsCode);
                                // console.log(`[Controller] Clicked on unique selector: ${uniqueSelector} using JS fallback`);
                            }
                        }
                        break;
                        }
                    case ActionType.input:{
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                            await activePage.fill(uniqueSelector, action.action_datas?.[0]?.value?.value || '');
                            }
                            break;
                        }
                    case ActionType.select:{
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                            await activePage.selectOption(uniqueSelector, action.action_datas?.[0]?.value?.value || '');
                            }
                            break;
                        }
                    case ActionType.checkbox:{
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                            // console.log(uniqueSelector)
                            if (action.action_datas?.[0]?.value?.checked === 'true') {
                                await activePage.check(uniqueSelector);
                            } else {
                                await activePage.uncheck(uniqueSelector);
                            }
                        }
                        break;
                        }
                    case ActionType.keydown:
                    {
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                            await activePage.locator(uniqueSelector).press(action.action_datas?.[0]?.value?.value || '');
                        }
                        break;
                    }
                    case ActionType.upload:{
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                            for (const action_data of action.action_datas || []) {
                                if (action_data.file_upload) {
                                    const file = action_data.file_upload;
                                    let content: string | undefined;
                                    if (file.file_content) {
                                        content = file.file_content;
                                    } else {
                                        // TODO: Call API to get file content
                                        const payload = {
                                            file_path: file.file_path || ''
                                        };
                                        // console.log('[Controller] payload:', payload);
                                        const response = await this.fileService.getFileContent(payload);
                                        // console.log('[Controller] response:', response);
                                        if (response.success) {
                                            content = response.data?.file_content;
                                        }
                                    }
                                    // TODO: Save `content` to temp file
                                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                                    const tempFileName = `upload-${uniqueSuffix}-${file.file_name}`;
                                    const tempFilePath = path.join(tmpDir, tempFileName);
                                    // Write the file content (base64 decoding)
                                    fs.writeFileSync(tempFilePath, Buffer.from(content || '', 'base64'));
                                    // TODO: Upload file
                                    await activePage.setInputFiles(uniqueSelector, tempFilePath);

                                    // TODO: Wait for file upload to complete
                                    await activePage.waitForFunction((selector) => {
                                        const input = document.querySelector(selector) as HTMLInputElement | null;
                                        return !input || (input.files && input.files.length > 0); // or other app-specific completion signal
                                    }, uniqueSelector, { timeout: 10000 });

                                    // TODO: Delete temp file
                                    fs.unlinkSync(tempFilePath);
                                }
                            }
                        }
                        break;
                    }
                    case ActionType.change:{
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 1) {
                            try {
                                const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                                const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                                // console.log('uniqueSelector', uniqueSelector)
                                await activePage.locator(uniqueSelector).evaluate((el: HTMLElement) => el.click());
                            } catch (error) {
                                console.error('Error changing', error)
                            }
                        }
                        break;
                    }
                    case ActionType.wait:{
                        const activePage = await this.getPage(pageIndex);
                        await activePage.waitForTimeout(Number(action.action_datas?.[0]?.value?.value) || 0);
                        break;
                    }
                    case ActionType.drag_and_drop:{
                        const activePage = await this.getPage(pageIndex);
                        if (action.elements && action.elements.length === 2) {
                            const sourceCandidates = action.elements[0].selectors?.map(s => s.value) || [];
                            const targetCandidates = action.elements[1].selectors?.map(s => s.value) || [];

                            if (sourceCandidates.length === 0 || targetCandidates.length === 0) {
                                throw new Error('Drag and drop requires valid source and target selectors');
                            }

                            // Resolve unique selectors for both source and target
                            const source = await this.resolveUniqueSelector(activePage, sourceCandidates);
                            const target = await this.resolveUniqueSelector(activePage, targetCandidates);

                            // console.log(`[Controller] Drag and drop - source: ${source}, target: ${target}`);

                            // Use unique selectors for both source and target
                            await activePage.dragAndDrop(source, target, { timeout: 10000 });
                        } else {
                            throw new Error('Drag and drop requires exactly 2 elements (source and target)');
                        }
                        break;
                    }
                    case ActionType.scroll:{
                        const activePage = await this.getPage(pageIndex);
                        //Format y X:,y:
                        let x = 0;
                        let y = 0;
                        const match = action.action_datas?.[0]?.value?.value?.match(/X\s*:\s*(\d+)\s*,\s*Y\s*:\s*(\d+)/i);
                        if (match) {
                            x = Number(match[1]);
                            y = Number(match[2]);
                        }
                        const selectors = action.elements?.[0]?.selectors?.map(selector => selector.value) || [];
                        const uniqueSelector = await this.resolveUniqueSelector(activePage, selectors);
                        await activePage.locator(uniqueSelector).evaluate((el, pos) => {
                            const { x, y } = pos;
                            const target = (el === document.body || el === document.documentElement)
                                ? window
                                : el;
                            // console.log('target', target)
                            if (target.scrollTo) {
                                target.scrollTo({ left: x, top: y, behavior: 'instant' });
                            }
                        }, { x, y });
                        await activePage.waitForLoadState('networkidle', { timeout: 10000 });
                        break;
                    }
                    case ActionType.window_resize:{
                        const activePage = await this.getPage(pageIndex);
                        let width = 0;
                        let height = 0;
                        const match_window_resize = action.action_datas?.[0]?.value?.value?.match(/Width\s*:\s*(\d+)\s*,\s*Height\s*:\s*(\d+)/i);
                        if (match_window_resize) {
                            width = Number(match_window_resize[1]);
                            height = Number(match_window_resize[2]);
                        }
                        // Apply sensible defaults and bounds
                        const targetWidth = Math.max(width || 1366, 800);
                        const targetHeight = Math.max(height || 768, 600);

                        // Resize browser window via BrowserManager (handles both window and viewport)
                        if (this.browserManager) {
                            await this.browserManager.resizeWindow(targetWidth, targetHeight);
                        }

                        await activePage.waitForLoadState('networkidle', { timeout: 10000 });
                        break;
                    }
                    case ActionType.api_request:{
                        const activePage = await this.getPage(pageIndex);
                        {
                            const apiData = (action.action_datas || []).find(d => (d as any).api_request)?.api_request as ApiRequestData | undefined;
                            if (apiData) {
                                console.log('[Controller] Executing API request:', apiData);
                                await this.executeApiRequest(activePage, apiData as ApiRequestData);
                            }
                        }
                        break;
                    }
                    //nhúng script chạy ngay 1 thao tác gì đó
                    
                    default:
                        continue;
                }
               
                await this.waitForAppIdle();
                // Add small delay between actions to prevent race conditions
                if (i < actions.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

    
            } catch (error) {
                console.error(`[Controller] Error executing action ${i + 1} (${action.action_type}):`, error);
                // Emit failed event
                this.onActionFailed?.(i);
                // Don't throw error, continue with next action
                // throw error;
            }
        }

        // console.log(`[Controller] Finished executing ${actions.length} actions`);

        // Emit execution completed event
        this.onActionExecuting?.(-1); // Use -1 to indicate all actions completed
    }
}