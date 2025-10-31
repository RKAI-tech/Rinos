export interface Selector {
    value: string;
}

export interface Element {
    name?: string;
    selectors?: Selector[];
    query?: string;
    value?: string;
}

export enum ActionType {
    input = 'input',
    click = 'click',
    select = 'select',
    checkbox = 'checkbox',
    change = 'change',
    drag_and_drop = 'drag_and_drop',
    drag_start = 'drag_start',
    drag_end = 'drag_end',
    drag_over = 'drag_over',
    drag_leave = 'drag_leave',
    drop = 'drop',
    assert = 'assert',
    update_input = 'update_input',
    connect_db = 'connect_db',
    navigate = 'navigate',
    double_click = 'double_click',
    right_click = 'right_click',
    shift_click = 'shift_click',
    keydown = 'keydown',
    keyup = 'keyup',
    keypress = 'keypress',
    upload = 'upload',
    scroll = 'scroll',
    wait = 'wait',
    database_execution = 'database_execution',
    reload = 'reload',
    back = 'back',
    forward = 'forward',
    window_resize = 'window_resize',
    api_request = 'api_request',
}

export enum AssertType {
    toHaveValue = 'toHaveValue',
    toHaveText = 'toHaveText'
}

export enum ConnectionType {
    postgres = 'postgres',
    mysql = 'mysql',
    mssql = 'mssql',
}

export interface Connection {
    username?: string;
    password?: string;
    host?: string;
    port?: string;
    db_name?: string;
    db_type?: ConnectionType;
}

export interface FileUpload {
    file_name: string;
    file_content: string;
    file_path?: string;
}

// API Request types (aligned with recorder models)
export interface ApiRequestParam {
    key: string;
    value: string;
}

export interface ApiRequestHeader {
    key: string;
    value: string;
}

export interface ApiRequestBody {
    type: 'none' | 'json' | 'form';
    content: string;
    formData?: ApiRequestParam[];
}

export interface ApiRequestAuth {
    type: 'none' | 'basic' | 'bearer';
    username?: string;
    password?: string;
    token?: string;
}

export interface ApiRequestTokenStorage {
    enabled: boolean;
    type?: 'localStorage' | 'sessionStorage' | 'cookie';
    key?: string;
}

export interface ApiRequestBasicAuthStorage {
    enabled: boolean;
    type?: 'localStorage' | 'sessionStorage' | 'cookie';
    usernameKey?: string;
    passwordKey?: string;
}

export interface ApiRequestData {
    method: string;
    url: string;
    params: ApiRequestParam[];
    headers: ApiRequestHeader[];
    auth: ApiRequestAuth;
    body: ApiRequestBody;
    tokenStorage?: ApiRequestTokenStorage;
    basicAuthStorage?: ApiRequestBasicAuthStorage;
}

export interface Action {
    action_type: ActionType;
    elements: Element[];
    value: string;
    expected_value?: string;
    assert_type?: AssertType;
    description?: string;
    playwright_code?: string;
    checked?: boolean;
    query?: string;
    connection?: Connection;
    files?: FileUpload[];
    // API Request
    api_request?: ApiRequestData;
}
