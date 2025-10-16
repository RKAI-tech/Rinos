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

console.log('[BrowserManager] Playwright browsers path:', browsersPath);
console.log('[BrowserManager] Platform:', process.platform);

const variableService = new VariableService();
const databaseService = new DatabaseService();
const statementService = new StatementService();

export class BrowserManager extends EventEmitter {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
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

    async start(): Promise<void> {
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
            this.context = await this.browser.newContext(
                { viewport: null }
            );

            // Create page
            this.page = await this.context.newPage();
            this.page.setDefaultTimeout(0);

            // Inject script
            await this.injectingScript(path.join(__dirname, 'renderer', 'browser', 'tracker', 'trackingScript.js'));

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
            if (this.page) {
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

    private async resizeWindow(width: number, height: number): Promise<void> {
        try {
            if (!this.page) return;
            // Use CDP to resize top-level browser window since context viewport is null
            const session = await (this.page.context() as any).newCDPSession(this.page);
            const { windowId } = await session.send('Browser.getWindowForTarget');
            await session.send('Browser.setWindowBounds', { windowId, bounds: { width, height } });
        } catch (e) {
            // Fallback: no-op
        }
    }

    private async injectingScript(path: string): Promise<void> {
        if (!this.context) {
            throw new Error('Context not found');
            return;
        }

        try {
            await this.context.exposeFunction('sendActionToMain', (action: Action) => {
                console.log('[BrowserManager] Received action from page:', action);
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
                    console.log('[BrowserManager] getConnection failed: No project context');
                    return { success: false, error: 'No project context' };
                }
                const resp = await databaseService.getDatabaseConnections({ project_id: projectId });
                console.log('[BrowserManager] getConnection response:', resp);
                return resp;
            } catch (e) {
                console.log('[BrowserManager] getConnection failed:', e);
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
}
