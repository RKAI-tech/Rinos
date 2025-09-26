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
        for (const action of actions) {
            try {
                console.log('[BROWSER] bao viet type:', action.action_type);
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
                                    page.click(selector, { timeout: 5000 });
                                } catch (error) {
                                    const jsCode = `document.querySelector('${selector}').click()`;
                                    await page.evaluate(jsCode);
                                }
                            });
                        }
                        break;
                    case ActionType.input:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
                                await page.fill(selector, action.value);
                            });
                        }
                        break;
                    case ActionType.select:
                        if (action.elements && action.elements.length === 1) {
                            await this.executeAction(action.elements[0].selector?.map(selector => selector.value) || null, async (selector) => {
                                await page.selectOption(selector, action.value);
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
                    default:
                        continue;
                }
            } catch (error) {
                console.error(`Error executing action ${action.action_type}:`, error);
                throw error;
            }
        }
    }
}