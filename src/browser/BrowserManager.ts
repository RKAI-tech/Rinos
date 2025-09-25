import EventEmitter from "events";
import { Browser, chromium, Page, BrowserContext, Request } from "playwright";
import path, * as pathenv from 'path';
import { app } from "electron";
import { Action } from "./types";
import { Controller } from "./controller";
import { readFileSync } from "fs";

let browsersPath: string;

if (!app.isPackaged) {
    browsersPath = pathenv.resolve(process.cwd(), "playwright-browsers");
} else {
    browsersPath = pathenv.join(process.resourcesPath, "playwright-browsers");
}
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

export class BrowserManager extends EventEmitter {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    page: Page | null = null;
    private pendingRequests: number;
    controller: Controller | null = null;

    constructor() {
        super();
        this.pendingRequests = 0;
        this.controller = new Controller();
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

    async start(): Promise<void> {
        try {
            if (this.browser) {
                console.log('Browser already started');
                return;
            }

            // Launch browser
            this.browser = await chromium.launch({
                headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
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
            this.trackRequests(this.page);

            // Catch close event
            this.page.on('close', () => {
                this.emit('page-closed', { timestamp: Date.now() });
                this.stop().catch((error) => { console.error('Error stopping browser:', error); });
            });

            // Catch context close event
            this.context?.on('close', () => {
                this.emit('context-closed', { timestamp: Date.now() });
            });

            this.browser?.on('disconnected', () => {
                this.emit('browser-closed', { timestamp: Date.now() });
            });
        } catch (error) {
            console.error('Error starting browser:', error);
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

            console.log('Browser stopped');

            // Emit stopped event to notify main process
            this.emit('browser-stopped');
        } catch (error) {
            console.error('Error stopping browser:', error);
            throw error;
        }
    }

    private async injectingScript(path: string): Promise<void> {
        if (!this.context) {
            throw new Error('Context not found');
            return;
        }

        try {
            const script = readFileSync(path, 'utf8');
            await this.context.addInitScript((script) => {
                try {
                    eval(script);
                    console.log('Script injected successfully');
                } catch (error) {
                    console.error('Error evaluating script:', error);
                }
            }, script);
        } catch (error) {
            console.error('Error injecting script:', error);
            throw error;
        }
    }
}
