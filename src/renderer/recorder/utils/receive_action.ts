import { Action, Element, Selector, ActionType, AssertType } from "../types/actions";
import { actionToCode, generateConnectDBCode, processSelector } from "./action_to_code";

export function createDescription(action_received: any): string {
    const type = action_received.type;
    let value = action_received.value;
    // Truncate value if it's too long
    // if (typeof value === 'string' && value.length > 15) {
    //     value = value.substring(0, 15) + '...';
    // }
    let url = action_received.url;
    // if (typeof url === 'string' && url.length > 15) {
    //     url = url.substring(0, 15) + '...';
    // }
    let element = action_received.elementText;
    // if (typeof element === 'string' && element.length > 15) {
    //     element = element.substring(0, 15) + '...';
    // }
    let files = action_received.files?.map((f: any) => f.name).join(', ') || '';
    switch (type) {
        case ActionType.navigate:
            return `Navigate to ${url}`;
        case ActionType.click:
            return `Click on ${element}`;
        case ActionType.input:
            return `Enter ${value} into ${element}`;
        case ActionType.select:
            return `Select ${value} from ${element}`;
        case ActionType.checkbox:
            return `Check ${element}`;
        case ActionType.double_click:
            return `Double click on ${element}`;
        case ActionType.right_click:
            return `Right click on ${element}`;
        case ActionType.shift_click:
            return `Shift click on ${element}`;
        case ActionType.keydown:
            return `Press ${value}`;
        case ActionType.keyup:
            return `Key up ${value}`;
        case ActionType.keypress:
            return `Key press ${value}`;
        case ActionType.upload:
            return `Upload file ${files}`;
        case ActionType.scroll:
            return `Scroll ${value}`;
        case ActionType.window_resize:
            return `Window resize`;
        case ActionType.connect_db:
            return `Connect to database ${value}`;
        case ActionType.change:
            return `Change ${value}`;
        case ActionType.drag_and_drop:
            return `Drag and drop ${element}`;
        case ActionType.drag_start:
            return `Drag start ${element}`;
        case ActionType.drag_end:
            return `Drag end ${element}`;
        case ActionType.drop:
            return `Drop ${element}`;
        case ActionType.reload:
            return `Reload page`;
        case ActionType.scroll:
            return `Scroll viewport`;
        case ActionType.assert:
            switch (action_received.assertType) {
                case AssertType.toHaveText:
                    return `Verify the element has text ${value}`;
                case AssertType.toContainText:
                    return `Verify the element contains text ${value}`;
                case AssertType.toHaveValue:
                    return `Verify the element has value ${value}`;
                case AssertType.toBeVisible:
                    return `Verify the element is visible`;
                case AssertType.toBeDisabled:
                    return `Verify the element is disabled`;
                case AssertType.toBeEnabled:
                    return `Verify the element is enabled`;
                case AssertType.toBeFocused:
                    return `Verify the element is focused`;
                case AssertType.toBeHidden:
                    return `Verify the element is hidden`;
                case AssertType.toBeChecked:
                    return `Verify the element is checked`;
                case AssertType.toBeUnchecked:
                    return `Verify the element is unchecked`;
                case AssertType.toBeEmpty:
                    return `Verify the element is empty`;
                case AssertType.toBeEditable:
                    return `Verify the element is editable`;
                case AssertType.toBeReadOnly:
                    return `Verify the element is read only`;
                case AssertType.toHaveAccessibleDescription:
                    return `Verify the element has accessible description ${value}`;
                case AssertType.toHaveAccessibleName:
                    return `Verify the element has accessible name ${value}`;
                case AssertType.toHaveCount:
                    return `Verify the element has count ${value}`;
                case AssertType.toHaveRole:
                    return `Verify the element has role ${value}`;
                case AssertType.pageHasAURL:
                    return `Verify the page has URL ${value}`;
                case AssertType.pageHasATitle:
                    return `Verify the page has title ${value}`;
                case AssertType.ai:
                    return `${action_received.description}`;
            }
        default:
            return `Unknown action`;
    }
}

export function createScriptForAiAssert(receivedAction: any, action_received: any): string {
    let script = "    " + receivedAction.playwright_code;
    if (receivedAction.connection) {
        script += '\n' + generateConnectDBCode(receivedAction);
    }
    script += '\n' + `    let outerHTMLs = [];\n` + `  let databaseResults = [];\n`;
    receivedAction.elements?.forEach((element: Element) => {
        if (element.selectors) {
            const candidatesLiteral = processSelector([element]);
            // TODO: script to get outerHTML of the element
            script += '\n' + `    candidates = ${candidatesLiteral};\n` +
                `    sel = await resolveUniqueSelector(page, candidates);\n` +
                `    const outerHTML = await page.locator(sel).evaluate((el) => el.outerHTML);\n` +
                `    var str = String(outerHTML);\n` +   // ép về string
                `    outerHTMLs.push(str);\n`;

        }
        if (element.query) {
            const dbVar = receivedAction.connection?.db_type?.toLowerCase();
            script += '\n' + `    var result = await ${dbVar}.query('${element.query}');\n` +
                `    databaseResults=[result.rows];\n` + 
                `    await ${dbVar}.end();\n`;
        }
    });
    const function_name = action_received.function_name;
    // TODO: script to call the function, the function is used to verify the assert, it return True or False
    script += '\n' + `    var result = await ${function_name}(outerHTMLs, databaseResults);\n` +
        `    await expect(result).toBe(true);\n`;
        
    return script;
}

export function receiveAction(testcaseId: string, action_recorded: Action[], action_received: any): Action[] {
    // console.log('[rawAction]', action_received);
    const normalizedType = (action_received?.action_type ?? action_received?.type) as ActionType | undefined;
    const normalizedDescription = (action_received?.description ?? createDescription(action_received)) as string | undefined;

    const receivedAction = {
        action_id: Math.random().toString(36),
        testcase_id: testcaseId,
        action_type: normalizedType as ActionType,
        description: normalizedDescription,
        playwright_code: action_received.playwright_code,
        elements: action_received.selector ? [{
            selectors: action_received.selector.map((sel: string) => ({ value: sel } as Selector)),
            query: action_received.query,
            value: action_received.value,
            variable_name: action_received.variable_name,
        } as Element] : action_received.elements ? action_received.elements.map((element: Element) => ({
            query: element.query,
        } as Element)) : [],
        assert_type: action_received.assertType,
        value: action_received.value || action_received.files?.[0]?.name || action_received.url || undefined,
        connection_id: action_received.connection_id,
        connection: action_received.connection ? {
            connection_id: action_received.connection_id,
            username: action_received.connection.username,
            password: action_received.connection.password,
            host: action_received.connection.host,
            port: action_received.connection.port,
            db_name: action_received.connection.db_name,
            db_type: action_received.connection.db_type,
        } : undefined,
        statement_id: action_received.statement_id,
        query: action_received.query,
        statement: (action_received.statement && action_received.statement.query)
            ? { query: action_received.statement.query }
            : (action_received.query ? { query: action_received.query } : undefined),
        files: action_received.files ? action_received.files.map((file: any) => ({
            file_name: file.name,
            file_content: file.content.split(',')[1],
            file_path: undefined,
        })) : [],
        // Browser events
        url: action_received.url,
        timestamp: action_received.timeStamp || action_received.timestamp,
    } as Action;

    // console.log('[receiveAction]', receivedAction);

    const last_action = action_recorded[action_recorded.length - 1];

    if (last_action && last_action.action_type === ActionType.input && receivedAction.action_type === ActionType.input) {
        // Compare elements content instead of object reference
        const lastElements = last_action.elements || [];
        const newElements = receivedAction.elements || [];

        //check if elements are the same least one selector is the same
        const elementsMatch = lastElements.some((lastElement) => newElements.some((newElement) => lastElement.selectors?.some((lastSelector) => newElement.selectors?.some((newSelector) => lastSelector.value === newSelector.value))));

        if (elementsMatch) {
            const updatedActions = [...action_recorded];
            updatedActions[updatedActions.length - 1] = receivedAction;
            return updatedActions;
        }
    }
    //check click or double click
    if(receivedAction.action_type === ActionType.double_click) {
        const last_action = action_recorded[action_recorded.length - 1];
    
        if (last_action && last_action.action_type === ActionType.click) {
            //replace last action with double click
            var updatedActions = [...action_recorded];
            updatedActions[updatedActions.length - 1] = receivedAction;
            return updatedActions;
        }
    }
    if (receivedAction.action_type === ActionType.click) {
        const last = action_recorded[action_recorded.length - 1];
        if (last && (last.action_type === ActionType.click || last.action_type === ActionType.right_click || last.action_type === ActionType.double_click)) {
            const lastSel = last.elements?.[0]?.selectors?.map(s => s.value)?.join('|') || '';
            const newSel = receivedAction.elements?.[0]?.selectors?.map(s => s.value)?.join('|') || '';
            if (lastSel === newSel) {
                return action_recorded; // same target → dedupe
            }
        }
    }
    if ( last_action && last_action.action_type===ActionType.drag_start) {
        if (receivedAction.action_type!==ActionType.drop){
            //remove last action if any
            var updatedActions = [...action_recorded];
            updatedActions.pop();
            return updatedActions;
        }
    }
    if (last_action && last_action.action_type===ActionType.drop) {
        if (receivedAction.action_type!==ActionType.drag_end){
            //remove last action if any
            var updatedActions = [...action_recorded];
            updatedActions.pop();
            updatedActions.pop();
            return updatedActions;
        }
    }
    if(receivedAction.action_type===ActionType.drop) {
        if (last_action && last_action.action_type!==ActionType.drag_start) {
            return action_recorded;
        }
        var updatedActions = [...action_recorded];
        var update_last_action = updatedActions[updatedActions.length - 1];
        update_last_action.action_type = ActionType.drag_and_drop;
        update_last_action.description = update_last_action.description?.replace('Drag start', 'Drag and drop');
        if (receivedAction.elements?.[0]) {

        update_last_action.elements?.push(receivedAction.elements?.[0]);}
        updatedActions[updatedActions.length - 1] = update_last_action;
        return updatedActions;
    }
    if (receivedAction.action_type===ActionType.scroll) {
        const lastElements = last_action.elements || [];
        const newElements = receivedAction.elements || [];

        //check if elements are the same least one selector is the same
        const elementsMatch = lastElements.some((lastElement) => newElements.some((newElement) => lastElement.selectors?.some((lastSelector) => newElement.selectors?.some((newSelector) => lastSelector.value === newSelector.value))));

        if (elementsMatch && last_action.action_type===ActionType.scroll) {
            var updatedActions = [...action_recorded];
            updatedActions[updatedActions.length - 1] = receivedAction;
            return updatedActions;
        }
        if (last_action && last_action.action_type===ActionType.window_resize) {
            return action_recorded;
        }
        
    }
    if (receivedAction.action_type===ActionType.window_resize) {
        if (last_action && last_action.action_type===ActionType.window_resize) {
            const updatedActions = [...action_recorded];
            updatedActions[updatedActions.length - 1] = receivedAction; // replace last resize with latest
            return updatedActions;
        }
        // else fall through to append below
    }
    // if (receivedAction.action_type===ActionType.drag_end) {
    //     if (last_action && last_action.action_type!==ActionType.drop) {
    //         return action_recorded;
    //     }
    // }
    // if (receivedAction.action_type === ActionType.assert && receivedAction.assert_type === AssertType.ai) {
    //      receivedAction.playwright_code = createScriptForAiAssert(receivedAction, action_received);
    // }
    return [...action_recorded, receivedAction];
}

export function receiveActionWithInsert(
    testcaseId: string,
    actions: Action[],
    action_received: any,
    insertAt?: number | null
): Action[] {
    // Nếu không có vị trí chèn cụ thể, xử lý như bình thường
    if (insertAt === null || insertAt === undefined) {
        return receiveAction(testcaseId, actions, action_received);
    }

    const safeIndex = Math.max(0, Math.min(insertAt, actions.length));
    const head = actions.slice(0, safeIndex);
    const tail = actions.slice(safeIndex);
    const updatedHead = receiveAction(testcaseId, head, action_received);
    return [...updatedHead, ...tail];
}