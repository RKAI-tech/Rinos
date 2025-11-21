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
    page: Page | null = null;
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
                // viewport: { width: 1920, height: 1080 },
                httpCredentials: basicAuthentication,
            });

            // Create page
            this.page = await this.context.newPage();
            this.page.setDefaultTimeout(0);

            // Inject script
            await this.injectingScript(path.join(__dirname, 'renderer', 'browser', 'tracker', 'trackingScript.js'));

            console.log('injecting script success');

            // Track requests
            this.controller?.trackRequests(this.page);

            // Catch close event
            this.page.on('close', () => {
                this.emit('page-closed', { timestamp: Date.now() });
                this.stop().catch((error) => { });// console.error('Error stopping browser:', error); });
            });

            // Catch context close event
            this.context?.on('close', () => {
                this.emit('context-closed', { timestamp: Date.now() });
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
            if (this.page && !this.page.isClosed()) {
                await this.page.close();
                this.page = null;
            }

            if (this.context) {
                await this.context.close();
                this.context = null;
            }

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            // console.log('Browser stopped');

            // Emit stopped event to notify main process
            this.emit('browser-stopped');
        } catch (error) {
            // console.error('Error stopping browser:', error);
            throw error;
        }
    }



    public async resizeWindow(width: number, height: number): Promise<void> {
        try {
            if (!this.page) return;
            
            // console.log(`[BrowserManager] Resizing window to ${width}x${height}`);
            
            // Use CDP to resize the actual browser window
            const session = await (this.page.context() as any).newCDPSession(this.page);
            const { windowId } = await session.send('Browser.getWindowForTarget');
            
            // Set window bounds with the exact requested size
            await session.send('Browser.setWindowBounds', { 
                windowId, 
                bounds: { 
                    width, 
                    height
                    // Don't force windowState to avoid sudden resizing
                } 
            });
            
            // Wait for the resize to take effect
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Verify the resize worked
            try {
                const bounds = await session.send('Browser.getWindowBounds', { windowId });
                // console.log(`[BrowserManager] Window resized successfully. Current bounds:`, bounds);
                
                // With viewport: null, viewport should automatically match window size
                const viewportSize = await this.page.viewportSize();
                // console.log(`[BrowserManager] Viewport size (should match window):`, viewportSize);
                
            } catch (e) {
                // console.log(`[BrowserManager] Could not verify window bounds:`, e);
            }
            
        } catch (e) {
            // console.error(`[BrowserManager] Failed to resize window:`, e);
            // Fallback: no-op
        }
    }
 
    public async getAuthValue(
        source: 'local' | 'session' | 'cookie',
        key: string,
        options?: { cookieDomainMatch?: string | RegExp }
    ): Promise<string | null> {
        if (!this.page) {
            throw new Error('Page not found');
        }

        if (!key || typeof key !== 'string') return null;

        if (source === 'local') {
            return await this.page.evaluate((k) => {
                try { return window.localStorage.getItem(k); } catch { return null; }
            }, key);
        }

        if (source === 'session') {
            return await this.page.evaluate((k) => {
                try { return window.sessionStorage.getItem(k); } catch { return null; }
            }, key);
        }

        // cookie
        const context = this.page.context();
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
        if (!this.page) {
            throw new Error('Page not found');
        }

        const type = options.type;
        if (type === 'localStorage' || type === 'sessionStorage') {
            const keys = { u: options.usernameKey || '', p: options.passwordKey || '' };
            return await this.page.evaluate(({ type, keys }) => {
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
            const context = this.page.context();
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

    private async injectingScript(path: string): Promise<void> {
        if (!this.context) {
            throw new Error('Context not found');
            return;
        }

        try {
            await this.context.exposeFunction('sendActionToMain', (action: Action) => {
                // console.log('[BrowserManager] Received action from page:', action);
                this.emit('action', action);
            });
            
            const script = readFileSync(path, 'utf8');
            await this.context.addInitScript((script) => {
                try {
                    eval(script);
                    // console.log('Script injected successfully');
                } catch (error) {
                    // console.error('Error evaluating script:', error);
                }
            }, script);
        } catch (error) {
            // console.error('Error injecting script:', error);
            throw error;
        }

        // Note: CDP navigation detection disabled - using browser_handle.js instead
        // This prevents duplicate navigation events and allows proper type detection

        await this.context.exposeFunction('getVariablesForTracker', async () => {
            try {
              // Get project ID from BrowserManager instance instead of window API
              const projectId = this.projectId;
            //   console.log('[BrowserManager] getVariablesForTracker called, projectId:', projectId);
              if (!projectId) {
                // console.warn('No project context available for variable loading');
                return { success: false, error: 'No project context' };
              }
            //   console.log('[BrowserManager] Loading variables for project:', projectId);
              const resp = await variableService.getVariablesByProject(projectId);
            //   console.log('[BrowserManager] Variables API response:', resp);
              resp.data?.items.forEach((v: any) => {
                // console.log('Variable object:', v);
              })
              return resp;
            } catch (e) {
            //   console.error('[BrowserManager] getVariablesForTracker failed:', e);
              return { success: false, error: String(e) };
            }
          });

        // Expose a lightweight query runner for the assert modal query panel
        await this.context.exposeFunction('getConnection', async () => {
            try {
                const projectId = this.projectId;
                if (!projectId) {
                    // console.log('[BrowserManager] getConnection failed: No project context');
                    return { success: false, error: 'No project context' };
                }
                const resp = await databaseService.getDatabaseConnections({ project_id: projectId });
                // console.log('[BrowserManager] getConnection response:', resp);
                return resp;
            } catch (e) {
                // console.log('[BrowserManager] getConnection failed:', e);
                return { success: false, error: String(e) };
            }
        });

        await this.context.exposeFunction('runQueryForTracker', async (sql: string, connectionId?: string) => {
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

                // 2) Run query without creating a statement
                const runResp = await statementService.runWithoutCreate({ connection_id: useConnId, query: sql.trim() });
                return runResp;
            } catch (e) {
                // console.error('[BrowserManager] runQueryForTracker failed:', e);
                return { success: false, error: String(e) };
            }
        });

        // Expose API request runner for tracker (bypass page's fetch restrictions)
        await this.context.exposeFunction('runApiRequestForTracker', async (payload: {
            method: string,
            url: string,
            headers?: Record<string, string>,
            bodyType?: 'none' | 'json' | 'form',
            body?: string,
            formData?: Array<{ key: string; value: string }>,
        }) => {
            try {
                if (!this.page) {
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
                const resp = await (this.page.request as any)[method](url, options);
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
        if (!this.page) {
            throw new Error('Page not found');
        }

        this.isAssertMode = enabled;
        this.assertType = assertType;

        await this.page.evaluate(({ isAssertMode, type } : { isAssertMode: boolean, type: AssertType }) => {
            const global : any = globalThis as any;
            global.setAssertMode(isAssertMode, type);
        }, { isAssertMode: enabled, type: assertType });
    }
    // get token from browser page
    
}
