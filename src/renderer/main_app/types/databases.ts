// Database connections
export type SupportedDbType = 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'sqlite';

export interface DatabaseConnectionCreateRequest {
    project_id: string | number;
    username: string;
    password: string;
    host: string;
    port: number;
    db_name: string;
    db_type: SupportedDbType;
}

export interface DatabaseConnectionListRequest {
    project_id: string | number;
}

export interface DatabaseConnection {
    connection_id: string;
    project_id: string;
    username: string;
    password: string;
    host: string;
    port: number;
    db_name: string;
    db_type: SupportedDbType;
}

export interface DatabaseConnectionListResponse {
    connections: DatabaseConnection[];
    total_count: number;
}

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
    items: Statement[];
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