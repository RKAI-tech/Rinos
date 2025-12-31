// Variables
export interface Variable {
    variable_id: string;
    project_id: string;
    user_defined_name: string;
    original_name: string;
    value: string;
    statement_id: string;
    database_name: string;
    database_type: string;
    query_name: string;
}

export interface VariableListResponse {
    items: Variable[];
    total: number;
}

export interface VariableCreateRequest {
    project_id: string;
    statement_id: string;
    user_defined_name: string;
    original_name: string;
    value: string;
}

export interface VariableListItem {
    variable_id: string;
    user_defined_name: string;
    original_name?: string | null;
    value?: string | null;
    statement_id?: string | null;
    database_name?: string | null;
    database_type?: string | null;
    query_name?: string | null;
}

export interface VariableSearchRequest {
    project_id: string;
    page: number;
    page_size: number;
    q?: string | null;  // search keyword
    sort_by?: string | null;  // field to sort by: user_defined_name, original_name, created_at, updated_at
    order?: string | null;  // asc or desc
}

export interface VariableSearchResponse {
    variables: VariableListItem[];
    number_variable: number;
    current_page: number;
    total_pages: number;
}