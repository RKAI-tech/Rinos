export interface BrowserVariableCreateRequest {
    project_id: string;
    name: string;
    value: string;
}

export interface BrowserVariableUpdateRequest {
    name?: string;
    value?: string;
}

export interface BrowserVariableResponse {
    browser_variable_id: string;
    project_id: string;
    name: string;
    value: string;
}

export interface BrowserVariableListItem {
    browser_variable_id: string;
    project_id: string;
    name: string;
    updated_at?: string | null;
    value: string;
}

export interface BrowserVariableListResponse {
    items: BrowserVariableListItem[];
    total: number;
}

export interface BrowserVariableSearchRequest {
    project_id: string;
    page: number;
    page_size: number;
    q?: string | null;
    sort_by?: string | null;
    order?: string | null;
}

export interface BrowserVariableSearchResponse {
    browser_variables: BrowserVariableListItem[];
    number_browser_variable: number;
    current_page: number;
    total_pages: number;
}
