export interface Selector {
    value: string;
}

export interface Element {
    name?: string;
    selector?: Selector[];
    query?: string;
    value?: string;
}

export enum ActionTypes {
    click = 'click',
    type = 'type',
    select = 'select',
    checkbox = 'checkbox',
    navigate = 'navigate',
    assert = 'assert',
    ai = 'ai',
    connect_db = 'connect_db',
}

export enum AssertTypes {
    toHaveValue = 'toHaveValue',
    toHaveText = 'toHaveText'
}

export enum ConnectionTypes {
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
    db_type?: ConnectionTypes;
}

export interface Action {
    id?: string;
    type: ActionTypes;
    elements: Element[];
    value: string;
    expected_value?: string;
    assert_type?: AssertTypes;
    description?: string;
    playwright_code?: string;
    checked?: boolean;
    query?: string;
    connection?: Connection;
}
