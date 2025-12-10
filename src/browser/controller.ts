import { Action, ActionType, Selector } from "./types";
import { ApiRequestData } from "./types/api_request";
import { BrowserContext, Locator, Page, Request } from "playwright";
import { BasicAuthentication } from "../renderer/recorder/types/basic_auth";
import { FileService } from "./services/files";
import { StatementService } from "./services/statements";
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
    private statementService: StatementService;
    private onActionExecuting?: (index: number) => void;
    private onActionFailed?: (index: number) => void;
    public browserManager?: any; // Reference to BrowserManager for window operations

    constructor() {
        this.pendingRequests = 0;
        this.fileService = new FileService();
        this.statementService = new StatementService();
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
        console.log('addLocalStorage', localStorageJSON);
        await page.evaluate((data: any) => {
            Object.entries(data).forEach(([key, value]) => {
                const valid_value = typeof value === 'object' ? JSON.stringify(value) : value;
                localStorage.setItem(key, valid_value as any);
            });
        }, JSON.parse(localStorageJSON));
        await page.reload();
    }

    async addSessionStorage(page: Page, sessionStorageJSON: any): Promise<void> {
        await page.evaluate((data: any) => {
            Object.entries(data).forEach(([key, value]) => {
                const valid_value = typeof value === 'object' ? JSON.stringify(value) : value;
                sessionStorage.setItem(key, valid_value as any);
            });
        }, JSON.parse(sessionStorageJSON));
        await page.reload();
    }

    async navigate(page: Page, url: string): Promise<void> {
        if (!page) {
            throw new Error('Browser page not found');
        }
        try {
            await page.goto(url);
        } catch (error) {

        }
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
        } catch { }

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
        } catch { }

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
        } catch {
            try {
                // console.log('[Controller][API] Resolve auth error'); 
            } catch { }
        }

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
        } catch {
            try {
                // console.log('[Controller][API] Build options error'); 
            } catch { }
        }

        // Execute
        const method = ((apiData.method as any) || 'get').toLowerCase();
        try {
            // console.log('[Controller][API] Sending request', { method, url, hasHeaders: Object.keys(headers).length > 0 }); 
        } catch { }
        const resp = await (page.request as any)[method](url, options);
        try {
            // console.log('[Controller][API] Response status:', await resp.status()); 
        } catch { }


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

    async getPage(pageIndex: number): Promise<Page> {
        if (!this.browserManager) {
            throw new Error('Browser manager not available');
        }

        for (const [pageId, index] of this.browserManager.pages_index.entries()) {
            if (index !== pageIndex) continue;
            const page = this.browserManager.pages.get(pageId);
            if (page && !page.isClosed()) {
                return page;
            }
            // remove stale references
            this.browserManager.pages.delete(pageId);
            this.browserManager.pages_index.delete(pageId);
        }
        throw new Error(`Page with index ${pageIndex} not found`);
    }

    async resolveUniqueSelector(page: Page | null, selectors: string[]): Promise<any> {
        if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
            throw new Error('Page or selectors is invalid.');
        }
        const toLocator = (s: string) => {
            return eval(`page.${s}`);
        };
        const locators = selectors.map(toLocator);
        await Promise.allSettled(
            locators.map(l => l.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => { }))
        );
        let minIndex = -1; let minCount = Infinity;
        for (let i = 0; i < locators.length; i++) {
            const count = await locators[i].count();
            console.log(`[Controller] Resolve Unique Selector: ${selectors[i]} count: ${count}`)
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
        throw new Error('No unique selector found.');
    }

    /**
     * Fallback force action using page.evaluate when Playwright locator fails.
     * Supports click, dblclick, input, select.
     */
    private async forceAction(page: Page, selectors: string[], action: 'click' | 'dblclick' | 'input' | 'select', payload?: string): Promise<void> {
        const serializeError = (err: any) => {
            try { return String(err); } catch { return 'unknown error'; }
        };

        const tryOne = async (selector: string) => {
            return page.evaluate(({ sel, type, payload }) => {
                // Traverse shadow roots to find elements
                function queryShadowAll(root: any, selector: string): Element[] {
                    const out: Element[] = [];
                    const stack: any[] = [root];
                    while (stack.length) {
                        const node = stack.pop();
                        if (!node) continue;
                        if (node.querySelectorAll) {
                            out.push(...Array.from(node.querySelectorAll(selector)) as Element[]);
                        }
                        if (node.shadowRoot) stack.push(node.shadowRoot);
                        if (node.children) stack.push(...Array.from(node.children));
                    }
                    return out;
                }

                // Basic text match helper
                const textMatch = (el: Element, target: string) => {
                    if (!target) return false;
                    const text = (el.textContent || '').trim();
                    if (text === target) return true;
                    return text.includes(target);
                };

                // Accessible name fallback (simplified)
                const getAccessibleName = (el: any) => {
                    const aria = el.getAttribute && el.getAttribute('aria-label');
                    if (aria) return aria;
                    const label = el.getAttribute && el.getAttribute('aria-labelledby');
                    if (label) {
                        const ids = label.split(' ');
                        const parts: string[] = [];
                        ids.forEach((id: string) => {
                            const ref = document.getElementById(id);
                            if (ref && ref.textContent) parts.push(ref.textContent.trim());
                        });
                        if (parts.length) return parts.join(' ').trim();
                    }
                    if (el.alt) return el.alt;
                    if (el.title) return el.title;
                    return (el.innerText || '').trim();
                };

                // Resolve selector string (generated by selectorGenerator)
                function resolveElement(sel: string): Element | null {
                    sel = sel.trim();

                    // locator('parent').locator('child')
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

                    // locator('css')
                    const locatorMatch = sel.match(/^locator\('(.+)'\)$/);
                    if (locatorMatch) {
                        const css = locatorMatch[1];
                        return queryShadowAll(document, css)[0] || null;
                    }

                    // getByTestId('value')
                    const testIdMatch = sel.match(/^getByTestId\('(.+)'\)$/);
                    if (testIdMatch) {
                        const v = testIdMatch[1];
                        return queryShadowAll(document, `[data-testid="${v}"]`)[0] || null;
                    }

                    // getByRole('role', { name: 'Name' })
                    const roleMatch = sel.match(/^getByRole\('(.+)'\s*,?\s*(\{.*\})?\)$/);
                    if (roleMatch) {
                        const role = roleMatch[1];
                        let name = '';
                        try {
                            const obj = roleMatch[2] ? JSON.parse(roleMatch[2].replace(/'/g, '"')) : null;
                            name = obj?.name || '';
                        } catch { }
                        const candidates = queryShadowAll(document, `[role="${role}"]`);
                        if (!name) return candidates[0] || null;
                        const exact = candidates.find(el => getAccessibleName(el) === name);
                        if (exact) return exact;
                        return candidates.find(el => (getAccessibleName(el) || '').includes(name)) || null;
                    }

                    // getByText('text')
                    const textMatchSel = sel.match(/^getByText\('(.+)'\)$/);
                    if (textMatchSel) {
                        const t = textMatchSel[1];
                        const candidates = queryShadowAll(document, '*').filter(el => textMatch(el, t));
                        return candidates.find(el => (el.textContent || '').trim() === t) || candidates[0] || null;
                    }

                    // getByLabel('text')
                    const labelMatch = sel.match(/^getByLabel\('(.+)'\)$/);
                    if (labelMatch) {
                        const t = labelMatch[1];
                        const labels = queryShadowAll(document, 'label').filter(el => textMatch(el, t));
                        for (const lb of labels) {
                            const forId = lb.getAttribute('for');
                            if (forId) {
                                const target = document.getElementById(forId);
                                if (target) return target;
                            }
                            // fallback: first control inside label
                            const control = lb.querySelector('input,textarea,select,button');
                            if (control) return control;
                        }
                        return null;
                    }

                    // getByPlaceholder('text')
                    const placeholderMatch = sel.match(/^getByPlaceholder\('(.+)'\)$/);
                    if (placeholderMatch) {
                        const t = placeholderMatch[1];
                        const candidates = queryShadowAll(document, 'input,textarea,select');
                        return candidates.find(el => el.getAttribute && el.getAttribute('placeholder') === t) || null;
                    }

                    // getByAltText / getByTitle
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

                const scrollIntoViewIfNeeded = (node: any) => {
                    try { node.scrollIntoView({ block: 'center', inline: 'center' }); } catch { }
                };

                scrollIntoViewIfNeeded(el);

                const dispatchMouse = (node: Element, eventName: string) => {
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
                        if (!('value' in (el as any))) return { ok: false, reason: 'not_input' };
                        (el as any).value = payload || '';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        return { ok: true };
                    case 'select':
                        if (el.tagName !== 'SELECT') return { ok: false, reason: 'not_select' };
                        const selectEl = el as HTMLSelectElement;
                        const opts = Array.from(selectEl.options);
                        let target = opts.find(o => o.value === payload) || opts.find(o => o.text === payload);
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
            }, { sel: selector, type: action, payload }).catch(err => ({ ok: false, reason: serializeError(err) }));
        };

        for (const sel of selectors) {
            const result: any = await tryOne(sel);
            if (result && result.ok) {
                return;
            }
        }
        throw new Error(`Force action failed for all selectors (action=${action})`);
    }

    async executeMultipleActions(context: BrowserContext, actions: Action[]): Promise<void> {
        if (!context) {
            throw new Error('Context is required');
        }
        if (!Array.isArray(actions) || actions.length === 0) {
            throw new Error('Actions array is required and cannot be empty');
        }
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            let pageIndex = 0;
            for (const action_data of action.action_datas || []) {
                if (action_data.value?.page_index) {
                    pageIndex = action_data.value?.page_index;
                    break;
                }
            }

            this.onActionExecuting?.(i);
            try {
                let activePage: Page | null = null;
                if (action.action_type !== ActionType.page_create) {
                    activePage = await this.getPage(pageIndex);
                    activePage.bringToFront();
                }
                switch (action.action_type) {
                    case ActionType.navigate:
                        let url_navigated = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                url_navigated = action_data.value?.value;
                                break;
                            }
                        }
                        if (!url_navigated) {
                            throw new Error('URL is required for navigate action');
                        }
                        if (activePage) {
                            await this.navigate(activePage, url_navigated);
                        }
                        break;
                    case ActionType.reload: {
                        if (activePage) {
                            await this.reload(activePage);
                        }
                        break;
                    }
                    case ActionType.back: {
                        if (activePage) {
                            await activePage.goBack();
                        }
                        break;
                    }
                    case ActionType.forward: {
                        if (activePage) {
                            await activePage.goForward();
                        }
                        break;
                    }
                    case ActionType.add_browser_storage: {
                        if (activePage && action.action_datas?.[0]?.browser_storage) {
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
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            if (selectors) {
                                try {
                                    console.log('[Controller] Click by Playwright')
                                    const locator = await this.resolveUniqueSelector(activePage, selectors);
                                    await locator.click();
                                } catch (err) {
                                    console.log('[Controller] Click by Force Action')
                                    await this.forceAction(activePage!, selectors, 'click');
                                }
                            }
                        }
                        break;
                    case ActionType.double_click:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            if (selectors) {
                                try {
                                    const locator = await this.resolveUniqueSelector(activePage, selectors);
                                    await locator.dblclick();
                                } catch (err) {
                                    await this.forceAction(activePage!, selectors, 'dblclick');
                                }
                            }
                        }
                        break;
                    case ActionType.input:
                        let value_input = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                value_input = action_data.value?.value;
                                break;
                            }
                        }
                        if (!value_input) {
                            throw new Error('Value is required for input action');
                        }
                        if (action.elements) {
                            const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            if (selectors) {
                                try {
                                    const locator = await this.resolveUniqueSelector(activePage, selectors);
                                    await locator.fill(value_input);
                                } catch (err) {
                                    await this.forceAction(activePage!, selectors, 'input', value_input);
                                }
                            }
                        }
                        break;
                    case ActionType.select:
                        let value_select = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                value_select = action_data.value?.value;
                                break;
                            }
                        }
                        if (!value_select) {
                            throw new Error('Value is required for select action');
                        }
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            if (selectors) {
                                try {
                                    const locator = await this.resolveUniqueSelector(activePage, selectors);
                                    await locator.selectOption(value_select);
                                } catch (err) {
                                    await this.forceAction(activePage!, selectors, 'select', value_select);
                                }
                            }
                        }
                        break;
                    case ActionType.checkbox:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            if (selectors) {
                                const locator = await this.resolveUniqueSelector(activePage, selectors);
                                await locator.check({ force: true });
                            }
                        }
                        break;
                    case ActionType.keydown:
                        let value_keydown = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                value_keydown = action_data.value?.value;
                                break;
                            }
                        }
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            if (selectors) {
                                const locator = await this.resolveUniqueSelector(activePage, selectors);
                                await locator.press(value_keydown);
                            }
                        }
                        break;
                    case ActionType.upload:
                        if (activePage && action.elements && action.elements.length === 1) {
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
                                    const tempFileName = `${file.file_name}`;
                                    const tempFilePath = path.join(tmpDir, tempFileName);
                                    // Write the file content (base64 decoding)
                                    fs.writeFileSync(tempFilePath, Buffer.from(content || '', 'base64'));
                                    const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                                    if (selectors) {
                                        const locator = await this.resolveUniqueSelector(activePage, selectors);
                                        await locator.setInputFiles(tempFilePath);
                                        
                                        await locator.waitForSelector && typeof locator.waitForSelector === 'function'
                                            ? await locator.waitForSelector({ state: 'attached', timeout: 10000 })
                                            : undefined;

                                        await activePage.waitForFunction(
                                            el => !el || (el.files && el.files.length > 0),
                                            await locator.elementHandle(),
                                            { timeout: 10000 }
                                        );
                                    }

                                    // TODO: Delete temp file
                                    fs.unlinkSync(tempFilePath);
                                }
                            }
                        }
                        break;
                    case ActionType.change:
                        if (action.elements && action.elements.length === 1) {
                            try {
                                const selectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                                if (selectors) {
                                    const locator = await this.resolveUniqueSelector(activePage, selectors);
                                    await locator.click();
                                }
                            } catch (error) {
                                // console.error('Error changing', error)
                            }
                        }
                        break;
                    case ActionType.wait:
                        let value_wait = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                value_wait = action_data.value?.value;
                                break;
                            }
                        }
                        if (activePage) {
                            await activePage.waitForTimeout(Number(value_wait) || 0);
                        }
                        break;
                    case ActionType.drag_and_drop:
                        if (activePage && action.elements && action.elements.length === 2) {
                            const sourceSelectors = action.elements[0].selectors?.map((selector: Selector) => selector.value);
                            const targetSelectors = action.elements[1].selectors?.map((selector: Selector) => selector.value);
                            if (sourceSelectors && targetSelectors) {
                                const sourceLocator = await this.resolveUniqueSelector(activePage, sourceSelectors);
                                const targetLocator = await this.resolveUniqueSelector(activePage, targetSelectors);
                                await sourceLocator.dragTo(targetLocator);
                            }
                        } else {
                            throw new Error('Drag and drop requires exactly 2 elements (source and target)');
                        }
                        break;
                    case ActionType.scroll:
                        //Format y X:,y:
                        let x = 0;
                        let y = 0;
                        let value_scroll = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                value_scroll = action_data.value?.value;
                                break;
                            }
                        }
                        const match = value_scroll?.match(/X\s*:\s*(\d+)\s*,\s*Y\s*:\s*(\d+)/i);
                        if (match) {
                            x = Number(match[1]);
                            y = Number(match[2]);
                        }
                        const selectors = action.elements?.[0]?.selectors?.map((selector: Selector) => selector.value);
                        if (selectors) {
                            const locator = await this.resolveUniqueSelector(activePage, selectors);
                            await locator.evaluate((el: any, pos: any) => {
                                    const { x, y } = pos;
                                    const target = (el === document.body || el === document.documentElement)
                                        ? window
                                        : el;
                                    // console.log('target', target)
                                    if (target.scrollTo) {
                                        target.scrollTo({ left: x, top: y, behavior: 'instant' });
                                    }
                                }, { x, y });
                            if (activePage) {
                                await activePage.waitForLoadState('networkidle', { timeout: 10000 });
                            }
                        }
                        break;
                    case ActionType.window_resize:
                        let width = 0;
                        let height = 0;
                        let value_window_resize = ""
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                value_window_resize = action_data.value?.value;
                                break;
                            }
                        }
                        const match_window_resize = value_window_resize?.match(/Width\s*:\s*(\d+)\s*,\s*Height\s*:\s*(\d+)/i);
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

                        if (activePage) {
                            await activePage.waitForLoadState('networkidle', { timeout: 10000 });
                        }
                        break;
                    case ActionType.api_request:
                        {
                            const apiData = (action.action_datas || []).find(d => (d as any).api_request)?.api_request as ApiRequestData | undefined;
                            if (apiData) {
                                console.log('[Controller] Executing API request:', apiData);
                                if (activePage) {
                                    await this.executeApiRequest(activePage, apiData as ApiRequestData);
                                }
                            }
                        }
                        break;
                    case ActionType.database_execution:
                        const statementData = (action.action_datas || []).find(d => d.statement)?.statement;
                        if (!statementData) {
                            throw new Error('Statement is required for database execution action');
                        }

                        const connectionId = statementData.connection?.connection_id;
                        if (!connectionId) {
                            throw new Error('connection_id is required for database execution action');
                        }

                        const query = (statementData as any).statement_text || statementData.query;
                        if (!query) {
                            throw new Error('Query is required for database execution action');
                        }

                        const response = await this.statementService.runWithoutCreate({
                            connection_id: connectionId,
                            query: query
                        });

                        if (!response.success) {
                            throw new Error(response.error || 'Database execution failed');
                        }
                        // Nếu có lỗi trong response data, log warning
                        if (response.data?.error) {
                            console.warn('[Controller] Database execution warning:', response.data.error);
                        }
                        break;
                    case ActionType.page_create:
                        let pageIndex: number | undefined;
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.page_index) {
                                pageIndex = action_data.value?.page_index;
                                break;
                            }
                        }
                        if (!pageIndex) {
                            throw new Error('Page index is required for page create action');
                        }
                        let url: string | undefined;
                        for (const action_data of action.action_datas || []) {
                            if (action_data.value?.value) {
                                url = action_data.value?.value;
                                break;
                            }
                        }
                        let openerPageIndex: number | undefined;
                        for (const action_data of action.action_datas || []) {

                            if (action_data.value?.opener_index !== undefined) {
                                openerPageIndex = action_data.value?.opener_index;
                                break;
                            }
                        }
                        console.log('[Controller] Opener Page Index:', openerPageIndex);
                        if (openerPageIndex === undefined) {

                            const newPage = await this.browserManager?.createPage(pageIndex, url);
                            if (!newPage) throw new Error('Failed to create page');
                            await newPage.bringToFront();
                        }
                        break;
                    case ActionType.page_close:
                        if (activePage) {
                            await activePage.close();
                        }
                        break;

                    default:
                        continue;
                }

                if (activePage) {
                    await activePage.waitForLoadState('domcontentloaded');
                    await activePage.waitForLoadState('networkidle');
                    await activePage.waitForLoadState('load');
                }
                await this.waitForAppIdle();

                if (i < actions.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }


            } catch (error) {
                console.error(`[Controller] Error executing action ${i + 1} (${action.action_type}):`, error);
                this.onActionFailed?.(i);

            }
        }
        this.onActionExecuting?.(-1); // Use -1 to indicate all actions completed
    }
}