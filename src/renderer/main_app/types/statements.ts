import { DatabaseConnection } from "./databases";

// Statements (Queries)
export interface StatementCreateRequest {
    connection_id: string;
    name: string;
    description: string;
    statement_text: string;
}

export interface RunWithoutCreateRequest {
    connection_id: string;
    query: string;
}

export interface StatementRunResponse {
    status: string;
    elapsed_ms: number;
    data: Array<{ name: string; value: string }>;
    affected_rows: number;
    error: string;
    primary_keys?: any;
}

export interface Statement {
    statement_id: string;
    connection_id: string;
    name: string;
    description: string;
    statement_text: string;
    status: string;
}

export interface StatementResponse {
    statement_id: string;
    connection_id: string;
    name: string;
    description: string;
    statement_text: string;
    status: string;
    connection?: DatabaseConnection;
    primary_keys?: any;
}

export interface GenerateRowQueryRequest {
    original_query: string;
    primary_keys: any;
    row_data: any;
    row_index: number;
}

export interface GenerateRowQueryResponse {
    row_query: string;
    elapsed_ms: number;
    status: string;
}

export interface StatementListResponse {
    items: StatementResponse[];
    total: number;
}

export interface StatementDeleteResponse {
    success: boolean;
    message?: string;
}

export interface StatementRunByIdResponse {
    status: string;
    elapsed_ms: number;
    data: Array<{ name: string; value: string }>;
    affected_rows: number;
    error: string;
}