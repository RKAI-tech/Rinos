// Action batch create request types
export interface ElementCreateRequest {
    selector: string[];
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