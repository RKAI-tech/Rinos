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

export interface DatabaseConnectionSearchRequest {
    project_id: string;
    page: number;
    page_size: number;
    q?: string | null;  // search keyword
    db_type?: string | null;  // filter by database type: postgres, mysql, sql, mssql
    sort_by?: string | null;  // field to sort by: host, db_name, db_type, created_at, updated_at
    order?: string | null;  // asc or desc
}

export interface DatabaseConnectionSearchResponse {
    database_connections: DatabaseConnection[];
    number_database_connection: number;
    current_page: number;
    total_pages: number;
}
