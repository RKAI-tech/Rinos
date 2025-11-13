import EventEmitter from "events";
import { Browser, chromium, Page, BrowserContext, Request } from "playwright";
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
    private isAssertMode: boolean = false;
    private assertType: AssertType | null = null;
    private projectId: string | null = null;
    private isExecuting: boolean = false;
    private currentExecutingIndex: number | null = null;

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

        this.on('action', (action: Action) => {
            if (action.action_type === 'page_focus') {
                const pageIndex = action.action_datas?.[0]?.value?.page_index;
                if (pageIndex !== undefined && pageIndex !== null) {
                    for (const [pageId, index] of this.pages_index.entries()) {
                        if (index === pageIndex) {
                            const oldActivePageId = this.activePageId;
                            this.activePageId = pageId;
                            
                            // Emit event để thông báo page đã được focus
                            this.emit('page-focused', { 
                                pageId, 
                                pageIndex, 
                                previousPageId: oldActivePageId,
                                timestamp: Date.now() 
                            });
                            
                            console.log(`[BrowserManager] Page focused - ID: ${pageId}, Index: ${pageIndex}`);
                            break;
                        }
                    }
                }
            }
        });

    }

    setProjectId(projectId: string): void {
        this.projectId = projectId;
        // console.log('[BrowserManager] Project ID set:', projectId);
    }

    setAuthToken(token: string | null): void {
        apiRouter.setAuthToken(token);
    }

    async start(
        basicAuthentication: { username: string, password: string }
    ): Promise<void> {
        try {
            if (this.browser) {
                // console.log('Browser already started');
                return;
            }

            // Launch browser
            const { chromium } = await import('playwright');
            this.browser = await chromium.launch({
                headless: false,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-gpu-sandbox',
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--no-zygote'
                ],
            });

            // Create context
            this.context = await this.browser.newContext({
                viewport: null,
                httpCredentials: basicAuthentication,
            });

            // Create page
            const page = await this.context.newPage();
            const pageId = randomUUID();
            this.pages.set(pageId, page);
            this.pages_index.set(pageId, 0);
            this.activePageId = pageId;
            page.setDefaultTimeout(0);

            // Inject script
            await this.basicSetupPage(pageId);

            this.context?.on('close', () => {
                this.emit('context-closed', { timestamp: Date.now() });
            });
            this.context.on('page', async (page: Page) => {
                const pageId = randomUUID();
                //pageindex is always larger than max page index in pages_index
                const newIndex = Math.max(...this.pages_index.values(), -1) + 1; 
                this.pages.set(pageId, page);
                this.pages_index.set(pageId, newIndex);
                this.activePageId = pageId;
                page.setDefaultTimeout(0);
                await this.basicSetupPage(pageId);
                const opener=await page.opener();
                let openerId:string|null=null;
                let openerIndex:number|null=null;
                if (opener) {
                    for (const [pageId, index] of this.pages_index.entries()) {
                        if (opener === page) {
                            openerId = pageId;
                            openerIndex = index;
                            break;
                        }
                    }
                }
                if(opener){
                    this.emit("action", {
                        action_type: 'page_open',
                        elements: [],
                        action_datas: [
                            { value: { page_index: newIndex,  opener_index: openerIndex } }
                        ]
                    });
                }
                else{
                    this.emit("action", {
                        action_type: 'page_create',
                        elements: [],
                        action_datas: [
                            { value: { page_index: newIndex } }
                        ]
                    });
                }
                this.emit('page-created', { pageId, index: newIndex });
                console.log(`[BrowserManager] New page opened - ID: ${pageId}, Index: ${newIndex}`);
            });
            this.browser?.on('disconnected', () => {
                this.emit('browser-closed', { timestamp: Date.now() });
            });
        } catch (error) {
            // console.error('Error starting browser:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        try {
            //close all pages
            for (const pageId of this.pages.keys()) {
                if (this.pages.get(pageId) && !this.pages.get(pageId)?.isClosed()) {
                    await this.pages.get(pageId)?.close();
                    this.pages.delete(pageId);
                    this.pages_index.delete(pageId);
                }
            }
            if (this.context) {
                await this.context.close();
                this.context = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            this.emit('browser-stopped');
        } catch (error) {
            throw error;
        }
    }
    public async createPage(pageIndex?: number): Promise<Page> {
        const page = await this.context?.newPage();
        const pageId = randomUUID();
        if (!page) throw new Error('Failed to create page');
        this.pages.set(pageId, page);
        this.pages_index.set(pageId, pageIndex || this.pages.size);
        this.activePageId = pageId;
        page.setDefaultTimeout(0);
        return page;
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
        options?: { cookieDomainMatch?: string | RegExp }
    ): Promise<string | null> {
        if (!this.activePageId) {
            throw new Error('Page not found');
        }

        if (!key || typeof key !== 'string') return null;

        if (source === 'local') {
            return await (this.pages.get(this.activePageId) as Page).evaluate((k) => {
                try { return window.localStorage.getItem(k); } catch { return null; }
            }, key);
        }

        if (source === 'session') {
            return await (this.pages.get(this.activePageId) as Page).evaluate((k) => {
                try { return window.sessionStorage.getItem(k); } catch { return null; }
            }, key);
        }

        // cookie
        const context = (this.pages.get(this.activePageId) as Page).context();
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
        cookieDomainMatch?: string | RegExp
    }): Promise<{ username: string | null; password: string | null }> {
        if (!this.activePageId) {
            throw new Error('Page not found');
        }

        const type = options.type;
        if (type === 'localStorage' || type === 'sessionStorage') {
            const keys = { u: options.usernameKey || '', p: options.passwordKey || '' };
            return await (this.pages.get(this.activePageId) as Page).evaluate(({ type, keys }) => {
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
            const context = (this.pages.get(this.activePageId) as Page).context();
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

    private async injectingScript(pageId: string, path: string): Promise<void> {
        if (!this.context) throw new Error('Context not found');
        const page = this.pages.get(pageId);
        if (!page) throw new Error(`Page with id ${pageId} not found`);
        try {
          await this.context.exposeFunction('sendActionToMain', (action: Action) => {
            this.emit('action', action);
          });
          const pageIndex = this.pages_index.get(pageId) || 0;
          const script = readFileSync(path, 'utf8');
      
          const page = this.pages.get(pageId);
          if (!page) throw new Error(`Page with id ${pageId} not found`);
      
          await page.addInitScript(
            ({ script, pageId }) => {
              try {
                (window as any).__PAGE_INDEX__ = pageIndex
                eval(script);
              } catch (error) {
                console.error('Inject script failed', error);
              }
            },
            { script, pageId }
          );
          
        } catch (error) {
          console.error('injectingScript error', error);
          throw error;
        }
        

     
        await page.exposeFunction('getVariablesForTracker', async () => {
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

        await page.exposeFunction('getConnection', async () => {
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

        await page.exposeFunction('runQueryForTracker', async (sql: string, connectionId?: string) => {
            try {
                const projectId = this.projectId;
                if (!projectId) {
                    return { success: false, error: 'No project context' };
                }
                if (!sql || typeof sql !== 'string' || !sql.trim()) {
                    return { success: false, error: 'Query is empty' };
                }

                // 1) Determine connection id
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

        await page.exposeFunction('runApiRequestForTracker', async (payload: {
            method: string,
            url: string,
            headers?: Record<string, string>,
            bodyType?: 'none' | 'json' | 'form',
            body?: string,
            formData?: Array<{ key: string; value: string }>,
        }) => {
            try {
                if (!page) {
                    return { success: false, error: 'No page context' };
                }

                const url = (payload?.url || '').trim();
                if (!url) {
                    return { success: false, error: 'URL is empty' };
                }

                const headers: Record<string, string> = { ...(payload?.headers || {}) };
                const options: any = { headers };

                // body
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
    }

    async setAssertMode(enabled: boolean, assertType: AssertType): Promise<void> {
        if (!this.pages) {
            throw new Error('Pages not found');
        }

        this.isAssertMode = enabled;
        this.assertType = assertType;
        //set for all pages
        for (const page of this.pages.values()) {
            await page.evaluate(({ isAssertMode, type } : { isAssertMode: boolean, type: AssertType }) => {
                const global : any = globalThis as any;
                global.setAssertMode(isAssertMode, type);
            }, { isAssertMode: enabled, type: assertType });
        }
    }
    private async basicSetupPage(pageId: string): Promise<void> {
        const page = this.pages.get(pageId);
        if (!page) throw new Error(`Page with id ${pageId} not found`);
        await this.injectingScript(pageId, path.join(__dirname, 'renderer', 'browser', 'tracker', 'trackingScript.js'));
        this.controller?.trackRequests(page);
        
        const pageIndex = this.pages_index.get(pageId) || 0;
        
        page.on('close', async () => {
            this.emit("action", {
                action_type: 'page_close',
                elements: [],
                action_datas: [
                    { value: { page_index: pageIndex } }
                ]
            });
            this.emit('page-closed', { pageId, timestamp: Date.now() });
        });
       
        
    }
}
