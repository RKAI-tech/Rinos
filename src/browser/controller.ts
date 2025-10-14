import { Action, ActionType } from "./types";
import { Page, Request } from "playwright";
import { BasicAuthentication } from "../renderer/recorder/types/basic_auth";
import { FileService } from "./services/files";
const os = require('os');
const fs = require('fs');
const path = require('path');
const tmpDir = os.tmpdir();


export class Controller {
    private pendingRequests: number;
    private fileService: FileService;

    constructor() {
        this.pendingRequests = 0;
        this.fileService = new FileService();
    }
    
    async navigate(page: Page, url: string): Promise<void> {
        if (!page) {
            throw new Error('Browser page not found');
        }

        await page.goto(url);
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
        let lastError: Error | null = null;
        for (const selector of selectors) {
            try {
                await action(selector);
                return;
            } catch (error) {
                lastError = error as Error;
            }
        }
        throw lastError || new Error('All selectors failed');
    }

    async resolveUniqueSelector(page: Page, selectors: string[]): Promise<string> {
        if (!page || !selectors || !Array.isArray(selectors) || selectors.length === 0) {
            throw new Error('[Controller] Invalid inputs for resolveUniqueSelector');
        }
        for (const raw of selectors) {
            const s = String(raw).trim();
            if (!s) continue;
            try {
                const locator = page.locator(s);
                await locator.first().waitFor({ state: 'attached', timeout: 3000 }).catch(() => {});
                const count = await locator.count();
                if (count === 1) {
                    return s;
                }
            } catch (_) {
                // ignore and try next selector
            }
        }
        throw new Error('[Controller] No matching selector found in  ' + selectors);
    }

    async executeMultipleActions(page: Page, actions: Action[]): Promise<void> {
        if(!Array.isArray(actions) || actions.length === 0) {
            throw new Error('Actions array is required and cannot be empty');
        }
        
        // console.log(`[Controller] Executing ${actions.length} actions`);
        
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            // console.log(`[Controller] Executing action ${i + 1}/${actions.length}: ${action.action_type}`);
            try {
                switch (action.action_type) {
                    case ActionType.navigate:
                        if (!action.value) {
                            throw new Error('URL is required for navigate action');
                        }
                        await this.navigate(page, action.value);
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
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            await page.fill(uniqueSelector, action.value || '');
                        }
                        break;
                    case ActionType.select:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selectors?.map(selector => selector.value) || null, async (selector) => {
                                await page.selectOption(selector, action.value || '');
                            });
                        }
                        break;
                    case ActionType.checkbox:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selectors?.map(selector => selector.value) || null, async (selector) => {
                                if (action.checked) {
                                    await page.check(selector);
                                } else {
                                    await page.uncheck(selector);
                                }
                            });
                        }
                        break;
                    case ActionType.keydown:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selectors?.map(selector => selector.value) || null, async (selector) => {
                                await page.locator(selector).press(action.value || '');
                            });
                        }
                        break;
                    case ActionType.upload:
                        if (action.elements && action.elements.length === 1) {
                            const selectors = action.elements[0].selectors?.map(selector => selector.value) || [];
                            const uniqueSelector = await this.resolveUniqueSelector(page, selectors);
                            if (action.files && action.files.length > 0) {
                                for (const file of action.files) {
                                    let content: string | undefined;
                                    if (file.file_content) {
                                        content = file.file_content;
                                    } else {
                                        // TODO: Call API to get file content
                                        const payload = {
                                            file_path: file.file_path || ''
                                        };
                                        console.log('[Controller] payload:', payload);
                                        const response = await this.fileService.getFileContent(payload);
                                        console.log('[Controller] response:', response);
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
                    default:
                        // console.log(`[Controller] Skipping unsupported action type: ${action.action_type}`);
                        continue;
                }

                await this.waitForAppIdle();
                // Add small delay between actions to prevent race conditions
                if (i < actions.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                // console.error(`[Controller] Error executing action ${i + 1} (${action.action_type}):`, error);
                // Don't throw error, continue with next action
                // throw error;
            }
        }
        
        // console.log(`[Controller] Finished executing ${actions.length} actions`);
    }
}