// Database connections
export type SupportedDbType = 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'sqlite';

// Security options for database connections
// Note: These fields use snake_case to match backend API convention (like project_id, db_name)
export interface DatabaseConnectionSecurityOptions {
    // SSL/TLS options
    security_type?: 'none' | 'ssl' | 'ssh';
    ssl_mode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
    ca_certificate?: string; // Base64 encoded CA certificate content (for storage)
    client_certificate?: string; // Base64 encoded client certificate content (for storage)
    client_private_key?: string; // Base64 encoded client private key content (for storage)
    ssl_key_passphrase?: string;
    
    // SSH Tunnel options
    ssh_host?: string;
    ssh_port?: number;
    ssh_username?: string;
    ssh_auth_method?: 'private_key' | 'password';
    ssh_private_key?: string; // Base64 encoded SSH private key content (for storage)
    ssh_key_passphrase?: string;
    ssh_password?: string;
    local_port?: number | 'Auto';
}

export interface DatabaseConnectionCreateRequest extends DatabaseConnectionSecurityOptions {
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

export interface DatabaseConnection extends DatabaseConnectionSecurityOptions {
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
