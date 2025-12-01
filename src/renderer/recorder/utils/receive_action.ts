import { Action, ActionData, Element, Selector, ActionType, AssertType, Statement, FileUpload } from "../types/actions";
import { BrowserStorageResponse } from "../types/browser_storage";

export function createDescription(action_received: any): string {
    const type = action_received.action_type;
    let value = action_received.action_datas?.[0]?.value?.value;
    let element = action_received.action_datas?.[0]?.value?.elementText;
    let files = action_received.action_datas?.[0]?.files?.map((f: any) => f.name).join(', ') || '';
    switch (type) {
        case ActionType.navigate:
            return `Navigate to ${value}`;
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
        case ActionType.back:
            return `Go back to previous page`;
        case ActionType.forward:
            return `Go forward to next page`;
        case ActionType.wait:
            return `Wait for ${value} ms`;
        case ActionType.database_execution:
            return `Execute database query: ${action_received.action_datas?.[0]?.statement?.statement_text}`;
        case ActionType.scroll:
                return `Scroll viewport`;
        case ActionType.add_browser_storage:
            return `Add browser storage ${action_received.action_datas?.[0]?.browser_storage?.name}`;
        case ActionType.assert:
            switch (action_received.assert_type) {
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
                // case AssertType.toHaveAccessibleDescription:
                //     return `Verify the element has accessible description ${value}`;
                // case AssertType.toHaveAccessibleName:
                //     return `Verify the element has accessible name ${value}`;
                // case AssertType.toHaveCount:
                //     return `Verify the element has count ${value}`;
                // case AssertType.toHaveRole:
                //     return `Verify the element has role ${value}`;
                case AssertType.pageHasAURL:
                    return `Verify the page has URL ${value}`;
                case AssertType.pageHasATitle:
                    return `Verify the page has title ${value}`;
                case AssertType.ai:
                    return `${action_received.description}`;
                
                
            }
        case ActionType.page_focus:
                const title = action_received.action_datas?.[0]?.value?.title ||action_received.action_datas?.[0]?.value?.url ||'';
    
                return `Focus on page ${title} `;
        case ActionType.page_create:
            let pageUrl = 'blank';
            for (const action_data of action_received.action_datas || []) {
                if (action_data.value?.value) {
                    pageUrl = action_data.value?.value;
                    break;
                }
            }
            return `Create page ${pageUrl}`;
        case ActionType.page_close:
            let pageUrlClose = 'blank';
            for (const action_data of action_received.action_datas || []) {
                if (action_data.value?.value) {
                    pageUrlClose = action_data.value?.value;
                    break;
                }
            }
            return `Close page ${pageUrlClose}`;
        case ActionType.api_request:
            const apiRequest = action_received.action_datas?.[0]?.api_request;
            const method = apiRequest?.method ? apiRequest.method.toUpperCase() : 'GET';
            const url = apiRequest?.url || '';
            return `API Request: ${method} ${url}`;
        default:
            return `Unknown action`;
    }
}

export function receiveAction(
    testcaseId: string, 
    action_recorded: Action[], 
    action_received: any,
    skipIfModalOpen?: boolean
): Action[] {
    // Nếu có flag skip và flag là true, bỏ qua xử lý action
    if (skipIfModalOpen) {
        console.log('[receiveAction] Skipping action - modal is open');
        return action_recorded;
    }
    console.log('[receiveAction] Skipping action - modal is open', skipIfModalOpen);
    
    const receivedAction = {
        action_id: Math.random().toString(36),
        testcase_id: testcaseId,
        action_type: action_received.action_type as ActionType,
        description: action_received.description || createDescription(action_received),
        elements: action_received.elements ? action_received.elements as Element[] : [],
        assert_type: action_received.assert_type? action_received.assert_type as AssertType : undefined,
        action_datas: action_received.action_datas ? action_received.action_datas as ActionData[] : [],        
    } as Action;

    console.log('[Action sent from browser]', action_received);
    console.log('[Received action]', receivedAction);

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
    return [...action_recorded, receivedAction];
}

export function receiveActionWithInsert(
    testcaseId: string,
    actions: Action[],
    action_received: any,
    insertAt?: number | null,
    skipIfModalOpen?: boolean
): Action[] {
    // Nếu có flag skip và flag là true, bỏ qua xử lý action
    if (skipIfModalOpen) {
        console.log('[receiveActionWithInsert] Skipping action - modal is open');
        return actions;
    }

    // Nếu không có vị trí chèn cụ thể, xử lý như bình thường
    if (insertAt === null || insertAt === undefined) {
        return receiveAction(testcaseId, actions, action_received, skipIfModalOpen);
    }

    const safeIndex = Math.max(0, Math.min(insertAt, actions.length));
    const head = actions.slice(0, safeIndex);
    const tail = actions.slice(safeIndex);
    const updatedHead = receiveAction(testcaseId, head, action_received, skipIfModalOpen);
    return [...updatedHead, ...tail];
}