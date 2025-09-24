import { DatabaseConnection } from "./databases";

// Statements (Queries)
export interface StatementCreateRequest {
    connection_id: string;
    name: string;
    description: string;
    statement_text: string;
}

export interface StatementRunResponse {
    status: string;
    elapsed_ms: number;
    data: Array<{ name: string; value: string }>;
    affected_rows: number;
    error: string;
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