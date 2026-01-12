import { Connection, ConnectionType, ConnectionSecurityOptions } from '../types/actions';

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  message?: string;
}


type IpcSecurityOptions = Omit<ConnectionSecurityOptions, 'ca_certificate' | 'client_certificate' | 'client_private_key' | 'ssh_private_key'> & {
  ca_certificate_path?: string;
  client_certificate_path?: string;
  client_private_key_path?: string;
  ssh_private_key_path?: string;
};


export type IpcConnectionParams = Omit<Connection, 'connection_id' | 'db_type' | 'ca_certificate' | 'client_certificate' | 'client_private_key' | 'ssh_private_key'> & 
  IpcSecurityOptions & {
    db_type: 'postgres' | 'mysql' | 'mssql';
  };

export type ConnectionTestParams = IpcConnectionParams;


async function base64ToTempFile(base64Content: string | undefined, filename: string): Promise<string | undefined> {
  if (!base64Content) return undefined;
  
  try {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.fs) {
      /* console.error('Electron API not available'); */
      return undefined;
    }

    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const filePath = `/tmp/rikkei-db-certs-${timestamp}-${random}-${filename}.pem`;
    
    // Write base64 content to file using Electron API
    const result = await electronAPI.fs.writeFile(filePath, base64Content, 'base64');
    if (!result.success) {
      /* console.error(`Failed to write ${filename} to temp file:`, result.error); */
      return undefined;
    }
    
    return filePath;
  } catch (error) {
    /* console.error(`Failed to write ${filename} to temp file:`, error); */
    return undefined;
  }
}

/**
 * Get Electron API for database operations
 */
function getDatabaseAPI(): { 
  testConnection: (params: ConnectionTestParams) => Promise<TestConnectionResult>;
  executeQuery: (params: IpcConnectionParams, query: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
} {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.database) {
    return (window as any).electronAPI.database;
  }
  throw new Error('Electron API not available. Database operations require Electron environment.');
}

/**
 * Convert ConnectionType enum to string
 */
function connectionTypeToString(dbType: ConnectionType): 'postgres' | 'mysql' | 'mssql' {
  switch (dbType) {
    case ConnectionType.postgres:
      return 'postgres';
    case ConnectionType.mysql:
      return 'mysql';
    case ConnectionType.mssql:
      return 'mssql';
    default:
      return 'postgres';
  }
}

// ============================================================================
// Exported Functions
// ============================================================================

/**
 * Convert Connection to IPC params with file paths
 * This function converts base64 encoded certificates to temporary files
 * for IPC communication
 */
export async function connectionToIpcParams(connection: Connection): Promise<IpcConnectionParams> {
  const params: any = {
    db_type: connectionTypeToString(connection.db_type),
    host: connection.host,
    port: connection.port,
    db_name: connection.db_name,
    username: connection.username,
    password: connection.password,
  };

  // Add security options if present
  if (connection.security_type) {
    params.security_type = connection.security_type;
  }

  // SSL/TLS options
  if (connection.security_type === 'ssl') {
    if (connection.ssl_mode) {
      params.ssl_mode = connection.ssl_mode;
    }
    
    // Convert base64 certificates to temp files
    if (connection.ca_certificate) {
      params.ca_certificate_path = await base64ToTempFile(connection.ca_certificate, 'ca-cert');
    }
    if (connection.client_certificate) {
      params.client_certificate_path = await base64ToTempFile(connection.client_certificate, 'client-cert');
    }
    if (connection.client_private_key) {
      params.client_private_key_path = await base64ToTempFile(connection.client_private_key, 'client-key');
    }
    if (connection.ssl_key_passphrase) {
      params.ssl_key_passphrase = connection.ssl_key_passphrase;
    }
  }

  // SSH Tunnel options
  if (connection.security_type === 'ssh') {
    if (connection.ssh_host) {
      params.ssh_host = connection.ssh_host;
    }
    if (connection.ssh_port) {
      params.ssh_port = connection.ssh_port;
    }
    if (connection.ssh_username) {
      params.ssh_username = connection.ssh_username;
    }
    if (connection.ssh_auth_method) {
      params.ssh_auth_method = connection.ssh_auth_method;
    }
    
    // Convert base64 SSH private key to temp file
    if (connection.ssh_private_key) {
      params.ssh_private_key_path = await base64ToTempFile(connection.ssh_private_key, 'ssh-key');
    }
    if (connection.ssh_key_passphrase) {
      params.ssh_key_passphrase = connection.ssh_key_passphrase;
    }
    if (connection.ssh_password) {
      params.ssh_password = connection.ssh_password;
    }
    if (connection.local_port !== undefined) {
      params.local_port = connection.local_port;
    }
  }

  return params;
}

/**
 * Cleanup temporary certificate files using Electron API
 */
export async function cleanupTempFiles(filePaths: (string | undefined)[]): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI?.fs) {
    return;
  }

  for (const filePath of filePaths) {
    if (filePath) {
      try {
        await electronAPI.fs.deleteFile(filePath);
      } catch (error) {
        /* console.error(`Failed to delete temp file ${filePath}:`, error); */
      }
    }
  }
}

/**
 * Test database connection with actual database connectivity
 * Supports PostgreSQL, MySQL, and MSSQL with SSL/TLS and SSH tunnel options
 * 
 * This function communicates with the main process via IPC to test the connection,
 * as Node.js modules (pg, mysql2, mssql, ssh2) are only available in the main process.
 * 
 * @param connectionParams - Database connection parameters including security options
 * @returns Test result containing success status and error message if connection failed
 * 
 * @example
 * ```typescript
 * const result = await testDatabaseConnection({
 *   db_type: 'postgres',
 *   host: 'localhost',
 *   port: 5432,
 *   db_name: 'mydb',
 *   username: 'user',
 *   password: 'password',
 *   security_type: 'ssl',
 *   ssl_mode: 'require',
 *   ca_certificate_path: '/path/to/ca.crt'
 * });
 * 
 * if (result.success) {
 *   console.log('Connection successful!');
 * } else {
 *   console.error('Connection failed:', result.error);
 * }
 * ```
 */
export async function testDatabaseConnection(
  connectionParams: ConnectionTestParams
): Promise<TestConnectionResult> {
  // Basic validation
  if (!connectionParams.db_type) {
    return {
      success: false,
      error: 'Database type is required',
    };
  }

  if (!connectionParams.host || !connectionParams.host.trim()) {
    return {
      success: false,
      error: 'Host is required',
    };
  }
  
  if (!connectionParams.port || connectionParams.port <= 0 || connectionParams.port > 65535) {
    return {
      success: false,
      error: 'Port must be a number between 1 and 65535',
    };
  }

  if (!connectionParams.db_name || !connectionParams.db_name.trim()) {
    return {
      success: false,
      error: 'Database name is required',
    };
  }

  if (!connectionParams.username || !connectionParams.username.trim()) {
    return {
      success: false,
      error: 'Username is required',
    };
  }

  if (connectionParams.password === undefined || connectionParams.password === null) {
    return {
      success: false,
      error: 'Password is required',
    };
  }

  try {
    const databaseAPI = getDatabaseAPI();
    return await databaseAPI.testConnection(connectionParams);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

