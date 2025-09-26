export interface Selector {
    value: string;
}

export interface Element {
    name?: string;
    selector?: Selector[];
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
    scroll = 'scroll'
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
}
