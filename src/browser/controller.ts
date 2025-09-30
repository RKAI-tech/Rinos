import { Action, ActionType } from "./types";
import { Page } from "playwright";

export class Controller {
    async navigate(page: Page, url: string): Promise<void> {
        if (!page) {
            throw new Error('Browser page not found');
        }

        await page.goto(url);
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

    async executeMultipleActions(page: Page, actions: Action[]): Promise<void> {
        if(!Array.isArray(actions) || actions.length === 0) {
            throw new Error('Actions array is required and cannot be empty');
        }
        
        console.log(`[Controller] Executing ${actions.length} actions`);
        
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            console.log(`[Controller] Executing action ${i + 1}/${actions.length}: ${action.action_type}`);
            
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
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
                                try {
                                    await page.click(selector, { timeout: 5000 });
                                } catch (error) {
                                    console.log(`[Controller] Click failed, trying JS fallback for selector: ${selector}`);
                                    const jsCode = `document.querySelector('${selector}').click()`;
                                    await page.evaluate(jsCode);
                                }
                            });
                        }
                        break;
                    case ActionType.input:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
                                await page.fill(selector, action.value || '');
                            });
                        }
                        break;
                    case ActionType.select:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
                                await page.selectOption(selector, action.value || '');
                            });
                        }
                        break;
                    case ActionType.checkbox:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
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
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
                                await page.locator(selector).press(action.value || '');
                            });
                        }
                        break;
                    default:
                        console.log(`[Controller] Skipping unsupported action type: ${action.action_type}`);
                        continue;
                }
                
                // Add small delay between actions to prevent race conditions
                if (i < actions.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error) {
                console.error(`[Controller] Error executing action ${i + 1} (${action.action_type}):`, error);
                // Don't throw error, continue with next action
                // throw error;
            }
        }
        
        console.log(`[Controller] Finished executing ${actions.length} actions`);
    }
}