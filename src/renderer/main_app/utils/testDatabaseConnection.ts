import { DatabaseConnectionCreateRequest } from '../types/databases';

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  message?: string;
}

// Extended interface to include security options from CreateConnection component
export interface DatabaseConnectionTestParams extends DatabaseConnectionCreateRequest {
  // SSL/TLS options
  securityType?: 'none' | 'ssl' | 'ssh';
  sslMode?: 'disable' | 'require' | 'verify-ca' | 'verify-full';
  caCertificatePath?: string;
  clientCertificatePath?: string;
  clientPrivateKeyPath?: string;
  sslKeyPassphrase?: string;
  
  // SSH Tunnel options
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshAuthMethod?: 'private_key' | 'password';
  sshPrivateKeyPath?: string;
  sshKeyPassphrase?: string;
  sshPassword?: string;
  localPort?: number | 'Auto';
}

/**
 * Get Electron API for database operations
 */
function getDatabaseAPI(): { testConnection: (params: DatabaseConnectionTestParams) => Promise<TestConnectionResult> } {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.database) {
    return (window as any).electronAPI.database;
  }
  throw new Error('Electron API not available. Database test connection requires Electron environment.');
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
 *   project_id: 'project-id',
 *   securityType: 'ssl',
 *   sslMode: 'require',
 *   caCertificatePath: '/path/to/ca.crt'
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
  connectionParams: DatabaseConnectionTestParams
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
