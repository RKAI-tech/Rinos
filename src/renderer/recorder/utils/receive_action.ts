import { Action, Element, Selector, ActionType, AssertType } from "../types/actions";

export function createDescription(action_received: any): string {
    console.log('action_received', action_received);
    const type = action_received.type;
    let value = action_received.value;
    // Truncate value if it's too long
    if (typeof value === 'string' && value.length > 15) {
        value = value.substring(0, 15) + '...';
    }
    let url = action_received.url;
    if (typeof url === 'string' && url.length > 15) {
        url = url.substring(0, 15) + '...';
    }
    let element = action_received.elementText;
    if (typeof element === 'string' && element.length > 15) {
        element = element.substring(0, 15) + '...';
    }
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
            }
        default:
            return `Unknown action`;
    }
}

export function receiveAction(testcaseId: string, action_recorded: Action[], action_received: any): Action[] {
    const receivedAction = {
        action_id: Math.random().toString(36),
        testcase_id: testcaseId,
        action_type: action_received.type,
        description: createDescription(action_received),
        elements: [{
            selector: action_received.selector.map((sel: string) => ({ value: sel } as Selector)),
            query: action_received.query,
            value: action_received.value,
            variable_name: action_received.variable_name,
        } as Element],
        assert_type: action_received.assertType,
        value: action_received.value,
        connection_id: action_received.connection_id,
        connection: action_received.connection,
        statement_id: action_received.statement_id,
        statement: action_received.statement,
    } as Action;

    const last_action = action_recorded[action_recorded.length - 1];

    if (last_action && last_action.action_type === ActionType.input && receivedAction.action_type === ActionType.input) {
        // Compare elements content instead of object reference
        const lastElements = last_action.elements || [];
        const newElements = receivedAction.elements || [];

        // Check if elements are the same (same selectors)
        const elementsMatch = lastElements.length === newElements.length &&
            lastElements.every((lastEl, index) => {
                const newEl = newElements[index];
                if (!newEl) return false;

                const lastSelectors = lastEl.selector || [];
                const newSelectors = newEl.selector || [];

                return lastSelectors.length === newSelectors.length &&
                    lastSelectors.every((lastSel, selIndex) =>
                        lastSel.value === newSelectors[selIndex]?.value
                    );
            });

        if (elementsMatch) {
            const updatedActions = [...action_recorded];
            updatedActions[updatedActions.length - 1] = receivedAction;
            return updatedActions;
        }
    }

    return [...action_recorded, receivedAction];
}