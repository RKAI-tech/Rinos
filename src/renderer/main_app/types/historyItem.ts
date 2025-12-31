export interface HistoryItem {
    history_id: string;
    project_id: string;
    user_id: string;
    user_name?: string;
    action_type: string;
    entity_type: string;
    entity_name?: string;
    entity_id: string;
    old_data?: any;
    new_data?: any;
    created_at: string;
    description?: string;
}

export interface HistoryListResponse {
    items: HistoryItem[];
    total: number;
}

export interface ProjectHistoriesRequest {
    project_id: string;
    limit: number;
    offset: number;
}

export interface ProjectTestcaseHistoriesRequest {
    project_id: string;
    testcase_id: string;
    limit: number;
    offset: number;
}

export interface ProjectTestsuiteHistoriesRequest {
    project_id: string;
    testsuite_id: string;
    limit: number;
    offset: number;
}

export interface DeleteHistoryResponse {
    message: string;
}

export interface DeleteHistoryRequest {
    history_id: string;
    project_id: string;
}

export interface HistorySearchRequest {
    project_id: string;
    page: number;
    page_size: number;
    q?: string | null;  // search keyword
    from_date?: string | null;  // filter from date (format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    to_date?: string | null;  // filter to date (format: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
    entity_type?: string | null;  // filter by entity type: Project, Testcase, Suite
    action_type?: string | null;  // filter by action type: updated, deleted, executed, recorded
    sort_by?: string | null;  // field to sort by: created_at
    order?: string | null;  // asc or desc (default desc for history)
}

export interface HistorySearchResponse {
    histories: HistoryItem[];
    number_history: number;
    current_page: number;
    total_pages: number;
}