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