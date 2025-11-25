import EventEmitter from "events";
import { Browser, chromium, firefox, webkit, Page, BrowserContext, Request } from "playwright";
import { BrowserType } from "./types";
import path, * as pathenv from 'path';
import { app } from "electron";
import { Action, AssertType } from "./types";
import { Controller } from "./controller";
import { readFileSync } from "fs";
import { VariableService } from "./services/variables";
import { DatabaseService } from "./services/database";
import { StatementService } from "./services/statements";
import { apiRouter } from "./services/baseAPIRequest";
import { randomUUID } from "crypto";
let browsersPath: string;

if (!app.isPackaged) {
    browsersPath = pathenv.resolve(process.cwd(), "playwright-browsers");
} else {
    browsersPath = pathenv.join(process.resourcesPath, "playwright-browsers");
}

// Set environment variables before importing playwright
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
// Skip host requirement validation on end-user machines to avoid missing lib errors
process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1';

// console.log('[BrowserManager] Playwright browsers path:', browsersPath);
// console.log('[BrowserManager] Platform:', process.platform);

const variableService = new VariableService();
const databaseService = new DatabaseService();
const statementService = new StatementService();

export class BrowserManager extends EventEmitter {
    private browser: Browser | null = null;
    context: BrowserContext | null = null;
    pages: Map<string, Page> = new Map();
    pages_index: Map<string, number> = new Map();
    activePageId: string | null = null;
    controller: Controller | null = null;
    private isClosingContext=false;
    private pagesClosingWithContext: Set<string> = new Set();
    private isAssertMode: boolean = false;
    private assertType: AssertType | null = null;
    private projectId: string | null = null;
    private isExecuting: boolean = false;
    private currentExecutingIndex: number | null = null;
    private visibilityCheckInterval: NodeJS.Timeout | null = null;
    private contextScriptsPrepared = false;
    constructor() {
        super();
        this.controller = new Controller();
        
        // Set browser manager reference in controller
        this.controller.browserManager = this;
        
        // Set execution callbacks
        this.controller.setExecutionCallbacks(
            (index: number) => {
                if (index === -1) {
                    // All actions completed
                    this.currentExecutingIndex = null;
                    this.emit('action-executing', { index: -1 });
                } else {
                    // Single action executing
                    this.currentExecutingIndex = index;
                    this.emit('action-executing', { index });
                }
            },
            (index: number) => {
                this.emit('action-failed', { index });
            }
        );
    }

    setProjectId(projectId: string): void {
        this.projectId = projectId;
        // console.log('[BrowserManager] Project ID set:', projectId);
    }

    setAuthToken(token: string | null): void {
        apiRouter.setAuthToken(token);
    }

    async start(
        basicAuthentication: { username: string, password: string },
        browserType?: string
    ): Promise<void> {
        try {
            if (this.browser) {
                // console.log('Browser already started');
                return;
            }

            // Map browser type to Playwright browser launcher
            // Default to chrome if not specified or invalid
            const normalizedBrowserType = (browserType || 'chrome').toLowerCase();
            let browserLauncher: typeof chromium | typeof firefox | typeof webkit;
            let launchOptions: any = {
                headless: false,
            };

            switch (normalizedBrowserType) {
                case BrowserType.firefox:
                case 'firefox':
                    browserLauncher = firefox;
                    // Firefox has different launch options
                    launchOptions.args = [
                        '--no-sandbox',
                    ];
                    break;
                case BrowserType.safari:
                case 'safari':
                    browserLauncher = webkit;
                    // WebKit doesn't support Chromium-specific args like --no-sandbox
                    // Use minimal options for WebKit
                    launchOptions.args = [];
                    break;
                case BrowserType.edge:
                case 'edge':
                    browserLauncher = chromium;
                    launchOptions.channel = 'msedge';
                    launchOptions.args = [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-gpu-sandbox',
                        '--disable-gpu',
                        '--disable-dev-shm-usage',
                        '--no-zygote'
                    ];
                    break;
                   
                case BrowserType.chrome:
                case 'chrome':
                default:
                    browserLauncher = chromium;
                    // chromium is default, no channel needed
                    launchOptions.args = [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-gpu-sandbox',
                        '--disable-gpu',
                        '--disable-dev-shm-usage',
                        '--no-zygote'
                    ];
                    break;
            }

            // Launch browser
            this.browser = await browserLauncher.launch(launchOptions);
            // Create context
            this.context = await this.browser.newContext({
                viewport: null,
                httpCredentials: basicAuthentication,
            });
            this.isClosingContext = false;
            // Expose function một lần ở context level (cho tất cả pages)
            await this.context.exposeFunction('sendActionToMain', async (action: Action) => {
                this.emit('action', action);
            });
            await this.ensureContextScripts();
            const newPage = await this.context.newPage();
            const pageId = randomUUID();
            const initialPageIndex = 0;
            this.pages.set(pageId, newPage);
            this.pages_index.set(pageId, initialPageIndex);
            this.activePageId = pageId;
            newPage.setDefaultTimeout(0);
            await newPage.waitForLoadState('domcontentloaded');
            await this.basicSetupPage(pageId)
            await newPage.waitForLoadState('domcontentloaded');
            this.context?.on('close', async () => {
                this.isClosingContext = true;
                console.log('[BrowserManager] Closing context');
                for (const pageId of this.pages.keys()) {
                    await this.pages.get(pageId)?.close();
                }
                this.emit('context-closed', { timestamp: Date.now() });
                this.stop();
            });
            this.context.on('page', async (page: Page) => {
                for (const [pageId, p] of this.pages.entries()) {
                    if (p === page) {
                        console.log('[BrowserManager] Page already in pages', pageId, page.url());
                        return;
                    }
                }

                const pageId = randomUUID();
                const newIndex = Math.max(...this.pages_index.values(), -1) + 1; 
                this.pages.set(pageId, page);
                this.pages_index.set(pageId, newIndex);
                this.activePageId = pageId;
                await page.waitForLoadState('domcontentloaded');
                await this.basicSetupPage(pageId)
                await page.waitForLoadState('domcontentloaded');
                const opener=await page.opener();
                let openerId:string|null=null;
                let openerIndex:number|null=null;
                if (opener) {
                    //get opener page id
                    for (const [pageId, page] of this.pages.entries()) {
                        if (page === opener) {
                            openerId = pageId;
                            break;
                        }
                    }
                    if (openerId) {
                        openerIndex = this.pages_index.get(openerId) || 0;
                    }
                }
                if(opener){
                    this.emit("action", {
                        action_type: 'page_create',
                        elements: [],
                        action_datas: [
                            { value: { page_index: newIndex,  opener_index: openerIndex } },
                            { value: { value: this.pages.get(pageId)?.url() || '' } }
                        ]
                    });
                }
                else{
                    this.emit("action", {
                        action_type: 'page_create',
                        elements: [],
                        action_datas: [
                            { value: { page_index: newIndex } },
                            { value: { value: this.pages.get(pageId)?.url() || 'blank' } }
                        ]
                    });
                }
                this.emit('page-created', { pageId, index: newIndex });
            });
            this.browser?.on('disconnected', () => {
                console.log('[BrowserManager] Browser disconnected');
                this.emit('browser-closed');
            });
            if (this.visibilityCheckInterval) {
                clearInterval(this.visibilityCheckInterval);
            }
        } catch (error) {
            // console.error('Error starting browser:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            this.isClosingContext = true;
            this.contextScriptsPrepared = false;
            console.log('[BrowserManager] Stopping browser');
            //close all pages
            this.emit('browser-stopped');

            if (this.context) {
                for (const pageId of this.pages.keys()) {
                    await this.pages.get(pageId)?.close();
                }
                await this.context.close();
                this.context = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            this.pages.clear();
            this.pages_index.clear();
            this.activePageId = null;
            this.pagesClosingWithContext.clear();
        } catch (error) {
            throw error;
        }
    }
    public async createPage(pageIndex?: number, url?: string): Promise<Page> {
        try {
           
            await this.ensureContextScripts();
            const page = await this.context?.newPage();
            if (!page) {
                throw new Error('Failed to create page');
            }
            await page.waitForLoadState('domcontentloaded');
            if (url) {
                console.log('goto', url);
                await page.goto(url);
                await page.waitForLoadState('domcontentloaded');
            }
            return page;
        }
        catch (error) {
            throw error;
        }
    }
    public async resizeWindow(width: number, height: number): Promise<void> {
        try {
            if (!this.activePageId) return;
                        
            // Use CDP to resize the actual browser window
            const session = await (this.context as any).newCDPSession(this.pages.get(this.activePageId) as Page);
            const { windowId } = await session.send('Browser.getWindowForTarget');
            
            // Set window bounds with the exact requested size
            await session.send('Browser.setWindowBounds', { 
                windowId, 
                bounds: { 
                    width, 
                    height
                } 
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (e) {
        }
    }
 
    public async getAuthValue(
        source: 'local' | 'session' | 'cookie',
        key: string,
        page_index: number,
        options?: { cookieDomainMatch?: string | RegExp }
    ): Promise<string | null> {
        if (!this.activePageId) {
            throw new Error('Page not found');
        }

        if (!key || typeof key !== 'string') return null;
        let pageId = null;
        for (const [idd, index] of this.pages_index.entries()) {
            if (index === page_index) {
                pageId = idd;
                break;
            }
        }
        if (!pageId) {
            pageId = this.activePageId;
        }
        if (!pageId) {
            throw new Error('Page not found');
        }
        if (source === 'local') {
            return await (this.pages.get(pageId) as Page).evaluate((k) => {
                try { return window.localStorage.getItem(k); } catch { return null; }
            }, key);
        }

        if (source === 'session') {
            return await (this.pages.get(pageId) as Page).evaluate((k) => {
                try { return window.sessionStorage.getItem(k); } catch { return null; }
            }, key);
        }

        // cookie
        const context = (this.pages.get(pageId) as Page).context();
        const allCookies = await context.cookies();
        const domainMatch = options?.cookieDomainMatch;
        for (const c of allCookies) {
            if (c.name !== key) continue;
            if (domainMatch) {
                if (typeof domainMatch === 'string') {
                    if (!c.domain || !c.domain.includes(domainMatch)) continue;
                } else {
                    if (!c.domain || !domainMatch.test(c.domain)) continue;
                }
            }
            return c.value || '';
        }
        return null;
    }

    /**
     * Truy vấn Basic Auth từ storage/cookie/custom element theo cấu hình UI
     */
    public async getBasicAuthFromStorage(options: {
        type: 'localStorage' | 'sessionStorage' | 'cookie',
        usernameKey?: string,
        passwordKey?: string,
        page_index?: number,
        cookieDomainMatch?: string | RegExp
    }): Promise<{ username: string | null; password: string | null }> {
        if (!this.activePageId) {
            throw new Error('Page not found');
        }
        let pageId = null;
        for (const [idd, index] of this.pages_index.entries()) {
            if (index === options.page_index) {
                pageId = idd;
                break;
            }
        }
        if (!pageId) {
            pageId = this.activePageId;
        }
        if (!pageId) {
            throw new Error('Page not found');
        }
        const type = options.type;
        if (type === 'localStorage' || type === 'sessionStorage') {
            const keys = { u: options.usernameKey || '', p: options.passwordKey || '' };
            return await (this.pages.get(pageId) as Page).evaluate(({ type, keys }) => {
                try {
                    const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
                    const username = keys.u ? storage.getItem(keys.u) : null;
                    const password = keys.p ? storage.getItem(keys.p) : null;
                    return { username, password };
                } catch {
                    return { username: null, password: null };
                }
            }, { type, keys });
        }

        if (type === 'cookie') {
            const context = (this.pages.get(pageId) as Page).context();
            const allCookies = await context.cookies();
            const domainMatch = options.cookieDomainMatch;
            const pickCookie = (name?: string | null) => {
                if (!name) return null;
                for (const c of allCookies) {
                    if (c.name !== name) continue;
                    if (domainMatch) {
                        if (typeof domainMatch === 'string') {
                            if (!c.domain || !c.domain.includes(domainMatch)) continue;
                        } else {
                            if (!c.domain || !domainMatch.test(c.domain)) continue;
                        }
                    }
                    return c.value || '';
                }
                return null;
            };
            return {
                username: pickCookie(options.usernameKey || null),
                password: pickCookie(options.passwordKey || null)
            };
        }

        return { username: null, password: null };
    }

    private async ensureContextScripts(): Promise<void> {
        if (this.contextScriptsPrepared) {
            return;
        }
        if (!this.context) {
            throw new Error('Context not found');
        }

        const scriptPath = path.join(__dirname, 'renderer', 'browser', 'tracker', 'trackingScript.js');
        const scriptContent = readFileSync(scriptPath, 'utf8');

        await this.context.addInitScript(
            (content) => {
                
                const script = document.createElement('script');
                script.type = 'module';
                script.textContent = content;
                const injectScript = () => {
                    if (document.head) {
                        document.head.appendChild(script);
                    } else {
                        const head = document.createElement('head');
                        document.documentElement.insertBefore(head, document.documentElement.firstChild);
                        head.appendChild(script);
                    }
                    (window as any).__RIKKEI_TRACKER_LOADED__ = true;
                };
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', injectScript);
                } else {
                    injectScript();
                }
            },
            scriptContent
        );

        await this.context.exposeBinding('getVariablesForTracker', async () => {
            try {
                const projectId = this.projectId;
                if (!projectId) {
                    return { success: false, error: 'No project context' };
                }
                const resp = await variableService.getVariablesByProject(projectId);
                return resp;
            } catch (e) {
                return { success: false, error: String(e) };
            }
        });

        await this.context.exposeBinding('getConnection', async () => {
            try {
                const projectId = this.projectId;
                if (!projectId) {
                    return { success: false, error: 'No project context' };
                }
                const resp = await databaseService.getDatabaseConnections({ project_id: projectId });
                return resp;
            } catch (e) {
                return { success: false, error: String(e) };
            }
        });

        await this.context.exposeBinding('runQueryForTracker', async (_source, sql: string, connectionId?: string) => {
            try {
                const projectId = this.projectId;
                if (!projectId) {
                    return { success: false, error: 'No project context' };
                }
                if (!sql || typeof sql !== 'string' || !sql.trim()) {
                    return { success: false, error: 'Query is empty' };
                }

                let useConnId = connectionId;
                if (!useConnId) {
                    const connResp = await databaseService.getDatabaseConnections({ project_id: projectId });
                    const connections = connResp?.data?.connections || [];
                    if (!connections.length) {
                        return { success: false, error: 'No database connections available' };
                    }
                    useConnId = connections[0].connection_id;
                }

                const runResp = await statementService.runWithoutCreate({ connection_id: useConnId, query: sql.trim() });
                return runResp;
            } catch (e) {
                return { success: false, error: String(e) };
            }
        });

        type TrackerApiPayload = {
            method: string;
            url: string;
            headers?: Record<string, string>;
            bodyType?: 'none' | 'json' | 'form';
            body?: string;
            formData?: Array<{ key: string; value: string }>;
        };

        await this.context.exposeBinding('runApiRequestForTracker', async (source, payload: TrackerApiPayload) => {
            try {
                const page = source?.page;
                if (!page) {
                    return { success: false, error: 'No page context' };
                }

                const url = (payload?.url || '').trim();
                if (!url) {
                    return { success: false, error: 'URL is empty' };
                }

                const headers: Record<string, string> = { ...(payload?.headers || {}) };
                const options: any = { headers };

                const bodyType = payload?.bodyType || 'none';
                if (bodyType !== 'none') {
                    if (bodyType === 'json') {
                        options.data = payload?.body || '';
                    } else if (bodyType === 'form') {
                        const body: Record<string, string> = {};
                        (payload?.formData || [])
                            .filter(p => p.key && p.key.trim())
                            .forEach(p => { body[p.key.trim()] = String(p.value ?? ''); });
                        options.data = body;
                    }
                }

                const method = (payload?.method || 'GET').toLowerCase();
                const resp = await (page.request as any)[method](url, options);
                const status = await resp.status();
                let data: any = null;
                try { data = await resp.json(); } catch { try { data = await resp.text(); } catch { data = null; } }
                let respHeaders: Record<string, string> = {};
                try { respHeaders = await resp.headers(); } catch {}
                const ok = status >= 200 && status < 300;
                const error = ok ? undefined : (typeof data === 'string' ? data : (data && (data.error || data.message || data.detail)) || `HTTP ${status}`);
                return { success: ok, status, data, headers: respHeaders, error };
            } catch (e) {
                return { success: false, error: String(e) };
            }
        });

        this.contextScriptsPrepared = true;
    }

    private async injectPageMetadata(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) throw new Error(`Page with id ${pageId} not found`);
        const pageIndex = this.pages_index.get(pageId) || 0;

        await page.addInitScript(
            (index) => {
                (window as any).__PAGE_INDEX__ = index;
            },
            pageIndex
        );

        try {
            await page.evaluate((index) => {
                (window as any).__PAGE_INDEX__ = index;
            }, pageIndex);
        } catch (error) {
        }
    }

    async setAssertMode(enabled: boolean, assertType: AssertType): Promise<void> {
        if (!this.pages) {
            throw new Error('Pages not found');
        }

        this.isAssertMode = enabled;
        this.assertType = assertType;
        //set for all pages
        for (const page of this.pages.values()) {
            if (page.isClosed()) continue;
            try {
                await page.evaluate(({ isAssertMode, type } : { isAssertMode: boolean, type: AssertType }) => {
                    const global : any = globalThis as any;
                    if (typeof global?.setAssertMode === 'function') {
                        global.setAssertMode(isAssertMode, type);
                    } else {
                        global.__PENDING_ASSERT_MODE__ = { enabled: isAssertMode, type };
                    }
                }, { isAssertMode: enabled, type: assertType });
            } catch (error) {
                console.warn('[BrowserManager] Failed to set assert mode on page, will retry when content loads', error);
            }
        }
    }

    private async basicSetupPage(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) throw new Error(`Page with id ${pageId} not found`);
        await this.injectPageMetadata(pageId);
        this.controller?.trackRequests(page);
        
        const pageIndex = this.pages_index.get(pageId) || 0;
        page.on('close', async () => {
            const contextIsClosing = this.isClosingContext || this.pagesClosingWithContext.has(pageId);
            this.pages.delete(pageId);
            //print all pages
            if (this.pages.size === 0) {
                this.emit('browser-stopped');
            }
            if (!contextIsClosing){
                this.emit("action", {
                    action_type: 'page_close',
                    elements: [],
                    action_datas: [
                        { value: { page_index: pageIndex } },
                        { value: { value: page.url() || '' } }
                    ]
                });
            }
            this.pagesClosingWithContext.delete(pageId);
            this.emit('page-closed', { pageId, timestamp: Date.now() });
        });
       
        
    }
    
}
