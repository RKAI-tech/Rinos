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
