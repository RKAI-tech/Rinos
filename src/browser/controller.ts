import { Action, ActionType } from "./types";
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

    private async executeAction(selectors: string[] | null, action: (selector: string) => Promise<void>): Promise<void> {
        if (!selectors || selectors.length === 0) {
            throw new Error('No selector provided');
        }

        // console.log(`[Controller] executeAction with selectors:`, selectors);

        let lastError: Error | null = null;
        for (const selector of selectors) {
            try {
                // console.log(`[Controller] Trying selector: ${selector}`);
                await action(selector);
                // console.log(`[Controller] Action succeeded with selector: ${selector}`);
                return;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                // console.log(`[Controller] Selector "${selector}" failed:`, errorMessage);
                lastError = error as Error;
            }
        }

        // console.error(`[Controller] All selectors failed:`, selectors);
        throw lastError || new Error('All selectors failed');
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

    async executeMultipleActions(page: Page, context: BrowserContext, actions: Action[]): Promise<void> {
        if (!Array.isArray(actions) || actions.length === 0) {
            throw new Error('Actions array is required and cannot be empty');
        }

        // console.log(`[Controller] Executing ${actions.length} actions`);

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            // console.log(`[Controller] Executing action ${i + 1}/${actions.length}: ${action.action_type}`);

            // Emit executing event
            this.onActionExecuting?.(i);

            try {
                switch (action.action_type) {
                    case ActionType.navigate:
                        if (!action.action_datas?.[0]?.value?.value) {
                            throw new Error('URL is required for navigate action');
                        }
                        await this.navigate(page, action.action_datas?.[0]?.value?.value);
                        break;
                    case ActionType.reload:
                        await page.reload();
                        break;
                    case ActionType.back:
                        await page.goBack();
                        break;
                    case ActionType.forward:
                        await page.goForward();
                        break;
                    case ActionType.add_browser_storage:
                        // console.log('[Controller] Action:', action);
                        if (action.action_datas?.[0]?.browser_storage) {
                            const browser_storage = action.action_datas?.[0]?.browser_storage;
                            if (browser_storage.storage_type === BrowserStorageType.COOKIE) {
                                await this.addCookies(context, page, JSON.stringify(browser_storage.value));
                            } else if (browser_storage.storage_type === BrowserStorageType.LOCAL_STORAGE) {
                                await this.addLocalStorage(page, JSON.stringify(browser_storage.value));
                            } else if (browser_storage.storage_type === BrowserStorageType.SESSION_STORAGE) {
                                await this.addSessionStorage(page, JSON.stringify(browser_storage.value));
                            }
                        }
                        break;
                    case ActionType.click:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            try {
                                await page.click(uniqueSelector, { timeout: 5000 });
                                // console.log(`[Controller] Clicked on unique selector: ${uniqueSelector}`);
                            } catch (error) {
                                // console.log(`[Controller] Click failed, trying JS fallback for unique selector: ${uniqueSelector}`);
                                const jsCode = `document.querySelector('${uniqueSelector}').click()`;
                                await page.evaluate(jsCode);
                                // console.log(`[Controller] Clicked on unique selector: ${uniqueSelector} using JS fallback`);
                            }
                        }
                        break;
                    case ActionType.input:
                        if (action.elements) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            await page.fill(uniqueSelector, action.action_datas?.[0]?.value?.value || '');
                        }
                        break;
                    case ActionType.select:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            await page.selectOption(uniqueSelector, action.action_datas?.[0]?.value?.value || '');
                        }
                        break;
                    case ActionType.checkbox:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            // console.log(uniqueSelector)
                            if (action.action_datas?.[0]?.value?.checked === 'true') {
                                await page.check(uniqueSelector);
                            } else {
                                await page.uncheck(uniqueSelector);
                            }
                        }
                        break;
                    case ActionType.keydown:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            await page.locator(uniqueSelector).press(action.action_datas?.[0]?.value?.value || '');
                        }
                        break;
                    case ActionType.upload:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
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
                                    await page.setInputFiles(uniqueSelector, tempFilePath);

                                    // TODO: Wait for file upload to complete
                                    await page.waitForFunction((selector) => {
                                        const input = document.querySelector(selector) as HTMLInputElement | null;
                                        return !input || (input.files && input.files.length > 0); // or other app-specific completion signal
                                    }, uniqueSelector, { timeout: 10000 });

                                    // TODO: Delete temp file
                                    fs.unlinkSync(tempFilePath);
                                }
                            }
                        }
                        break;
                    case ActionType.change:
                        if (action.elements && action.elements.length === 1) {
                            try {
                                const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                                const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                                // console.log('uniqueSelector', uniqueSelector)
                                await page.locator(uniqueSelector).evaluate((el: HTMLElement) => el.click());
                            } catch (error) {
                                console.error('Error changing', error)
                            }
                        }
                        break;
                    case ActionType.wait:
                        await page.waitForTimeout(Number(action.action_datas?.[0]?.value?.value) || 0);
                        break;
                    case ActionType.drag_and_drop:
                        if (action.elements && action.elements.length === 2) {
                            const sourceCandidates = action.elements[0].selectors?.map(s => s.value) || [];
                            const targetCandidates = action.elements[1].selectors?.map(s => s.value) || [];

                            if (sourceCandidates.length === 0 || targetCandidates.length === 0) {
                                throw new Error('Drag and drop requires valid source and target selectors');
                            }

                            // Resolve unique selectors for both source and target
                            const source = await this.resolveUniqueSelector(page, sourceCandidates);
                            const target = await this.resolveUniqueSelector(page, targetCandidates);

                            // console.log(`[Controller] Drag and drop - source: ${source}, target: ${target}`);

                            // Use unique selectors for both source and target
                            await page.dragAndDrop(source, target, { timeout: 10000 });
                        } else {
                            throw new Error('Drag and drop requires exactly 2 elements (source and target)');
                        }
                        break;
                    case ActionType.scroll:
                        //Format y X:,y:
                        let x = 0;
                        let y = 0;
                        const match = action.action_datas?.[0]?.value?.value?.match(/X\s*:\s*(\d+)\s*,\s*Y\s*:\s*(\d+)/i);
                        if (match) {
                            x = Number(match[1]);
                            y = Number(match[2]);
                        }
                        const selectors = action.elements?.[0]?.selectors?.map(selector => selector.value) || [];
                        const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                        await page.locator(uniqueSelector).evaluate((el, pos) => {
                            const { x, y } = pos;
                            const target = (el === document.body || el === document.documentElement)
                                ? window
                                : el;

                            if (target.scrollTo) {
                                target.scrollTo({ left: x, top: y, behavior: 'instant' });
                            }
                        }, { x, y });
                        await page.waitForLoadState('networkidle', { timeout: 10000 });
                        break;
                    case ActionType.window_resize:
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

                        await page.waitForLoadState('networkidle', { timeout: 10000 });
                        break;
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