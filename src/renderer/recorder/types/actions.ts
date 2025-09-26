
export enum ActionType {
    INPUT = '',
    CLICK = 'CLICK',
    SELECT = 'SELECT',
    CHECKBOX = 'CHECKBOX',
    CHANGE = 'CHANGE',
    DRAG_AND_DROP = 'DRAG_AND_DROP',
    DRAG_START = 'DRAG_START',
    DRAG_END = 'DRAG_END',
    DRAG_OVER = 'DRAG_OVER',
    DRAG_LEAVE = 'DRAG_LEAVE',
    DROP = 'DROP',
    ASSERT = 'ASSERT',
    UPDATE_INPUT = 'UPDATE_INPUT',
    CONNECT_DB = 'CONNECT_DB',
    NAVIGATE = 'NAVIGATE',
    DOUBLE_CLICK = 'DOUBLE_CLICK',
    RIGHT_CLICK = 'RIGHT_CLICK',
    SHIFT_CLICK = 'SHIFT_CLICK',
    KEYDOWN = 'KEYDOWN',
    KEYUP = 'KEYUP',
    KEYPRESS = 'KEYPRESS',
    UPLOAD = 'UPLOAD',
    SCROLL = 'SCROLL',
}
export enum AssertTypes {

    toBeAttached = 'toBeAttached',
    toBeDetached = 'toBeDetached',
    toBeChecked = 'toBeChecked',
    toBeUnchecked = 'toBeUnchecked',
    toBeDisabled = 'toBeDisabled',
    toBeEditable = 'toBeEditable',
    toBeReadOnly = 'toBeReadOnly',
    toBeEmpty = 'toBeEmpty',
    toBeEnabled = 'toBeEnabled',
    toBeFocused = 'toBeFocused',
    toBeHidden = 'toBeHidden',
    toBeInViewport = 'toBeInViewport',
    toBeVisible = 'toBeVisible',
    toContainText = 'toContainText',
    toContainClass = 'toContainClass',
    toHaveAccessibleDescription = 'toHaveAccessibleDescription',
    toHaveAccessibleName = 'toHaveAccessibleName',
    toHaveAttribute = 'toHaveAttribute',
    toHaveClass = 'toHaveClass',
    toHaveCount = 'toHaveCount',
    toHaveCSS = 'toHaveCSS',
    toHaveId = 'toHaveId',
    toHaveJSProperty = 'toHaveJSProperty',
    toHaveRole = 'toHaveRole',
    toHaveScreenshot = 'toHaveScreenshot',
    toHaveText = 'toHaveText',
    toHaveValue = 'toHaveValue',
    toHaveValues = 'toHaveValues',
    toMatchAriaSnapshot = 'toMatchAriaSnapshot',
    pageHasAScreenshot = 'pageHasAScreenshot',
    pageHasATitle = 'pageHasATitle',
    pageHasAURL = 'pageHasAURL',
    apiResponseOk = 'apiResponseOk',
    apiResonseNotOk = 'apiResonseNotOk',
}

// Action batch create request types
export interface ElementCreateRequest {
    selector?: string[];
    query?: string;
    value?: string;
    variable_name?: string;
}

export interface Element {
    selector?: string[];
    query?: string;
    value?: string;
    variable_name?: string;
}

export interface ActionCreateRequest {
    action_id?: string; // optional for upsert/update semantics
    testcase_id: string;
    action_type: string;
    description?: string;
    playwright_code?: string;
    elements?: ElementCreateRequest[];
    assert_type?: AssertTypes;
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

export interface Connection {
    connection_id: string;
    username: string;
    password: string;
    host: string;
    port: string;
    db_name: string;
    db_type: string;
}

export interface Statement {
    statement_id: string;
    query: string;
}

// Updated Action response interfaces
export interface ActionGetResponse {
    action_id?: string;
    testcase_id: string;
    action_type: string;
    description: string;
    playwright_code: string;
    elements: Element[];
    assert_type?: AssertTypes;
    value?: string;
    order_index: number;
    // Select-specific fields
    selected_value?: string;
    // Checkbox-specific fields
    checked?: boolean;
    // Connect DB-specific fields
    connection?: Connection;
    statement?: Statement;
    variable_name?: string;
}

export interface ActionGetAllResponse {
    actions: ActionGetResponse[];
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

export interface AssertAction {
    name: string;
    description: string;
}

export interface AssertActionsResponse {
    assert_actions: AssertAction[];
}