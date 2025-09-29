// Action batch create request types
export interface ElementCreateRequest {
    // Backend expects an array of objects like { value: string }
    selector: { value: string }[];
}

export interface ActionCreateRequest {
    action_id?: string; // optional for upsert/update semantics
    testcase_id: string;
    action_type: string;
    description?: string;
    playwright_code?: string;
    elements?: ElementCreateRequest[];
    assert_type?: 'VISIBILITY' | 'VALUE' | 'TEXT' | 'ENABLE' | 'DISABLE' | 'URL' | 'AI';
    value: string;
    // Select-specific fields
    selected_value?: string;
    // Checkbox-specific fields
    checked?: boolean;
    // Database-related fields
    connection_id?: string;
    statement_id?: string;
    query?: string;
    variable_name?: string;
}

export interface ActionBatchCreateRequest {
    actions: ActionCreateRequest[];
}

// Updated Action interface to match new API structure
export interface Action {
    action_id: string;
    action_type: string;
    elements: Element[];
    value: string;
}

// Updated Action response interfaces
export interface ActionGetResponse {
    action_id: string;
    testcase_id: string;
    action_type: string;
    description: string;
    playwright_code: string;
    elements: Element[];
    assert_type?: 'VISIBILITY' | 'VALUE' | 'TEXT' | 'ENABLE' | 'DISABLE' | 'URL' | 'AI';
    value: string;
    order_index: number;
    // Select-specific fields
    selected_value?: string;
    // Checkbox-specific fields
    checked?: boolean;
}

export interface ActionGetAllResponse {
    actions: ActionGetResponse[];
}

// UI editing models/enums used by ActionDetailModal in main_app
export enum ActionType {
    navigate = 'navigate',
    input = 'input',
    click = 'click',
    double_click = 'double_click',
    right_click = 'right_click',
    shift_click = 'shift_click',
    select = 'select',
    checkbox = 'checkbox',
    change = 'change',
    drag_and_drop = 'drag_and_drop',
    drag_start = 'drag_start',
    drag_end = 'drag_end',
    drag_over = 'drag_over',
    drag_leave = 'drag_leave',
    drop = 'drop',
    keydown = 'keydown',
    keyup = 'keyup',
    keypress = 'keypress',
    upload = 'upload',
    scroll = 'scroll',
    connect_db = 'connect_db',
    assert = 'assert',
}

export enum AssertType {
    toBeChecked = 'toBeChecked',
    toBeUnchecked = 'toBeUnchecked',
    toBeDisabled = 'toBeDisabled',
    toBeEditable = 'toBeEditable',
    toBeReadOnly = 'toBeReadOnly',
    toBeEmpty = 'toBeEmpty',
    toBeEnabled = 'toBeEnabled',
    toBeFocused = 'toBeFocused',
    toBeHidden = 'toBeHidden',
    toBeVisible = 'toBeVisible',
    toContainText = 'toContainText',
    toHaveAccessibleDescription = 'toHaveAccessibleDescription',
    toHaveAccessibleName = 'toHaveAccessibleName',
    toHaveText = 'toHaveText',
    toHaveValue = 'toHaveValue',
    toHaveValues = 'toHaveValues',
    toHaveCount = 'toHaveCount',
    toHaveRole = 'toHaveRole',
    pageHasATitle = 'pageHasATitle',
    pageHasAURL = 'pageHasAURL',
}

export interface UISelector { value: string }
export interface UIElement { selector?: UISelector[]; query?: string; value?: string; variable_name?: string; }

export interface UIActionDraft {
    action_id?: string;
    testcase_id: string;
    action_type: ActionType | string;
    description?: string;
    playwright_code?: string;
    elements?: UIElement[];
    assert_type?: AssertType | string;
    value?: string;
    selected_value?: string;
    checked?: boolean;
}

// AI Assert Request types
export interface AiAssertDatabaseConnection {
    connection_id: string;
    username: string;
    password: string;
    host: string;
    port: string;
    db_name: string;
    db_type: string; // e.g., 'postgres'
}

export interface AiAssertElement {
    selector?: string;
    value?: string;
    query?: string;
    variable_name?: string;
    database_connection?: AiAssertDatabaseConnection;
}

export interface AiAssertRequest {
    testcase_id: string;
    elements: AiAssertElement[];
    prompt: string;
}

export interface AiAssertResponse {
    success: boolean;
    data?: {
        playwright_code: string;
        description: string;
    };
    error?: string;
}