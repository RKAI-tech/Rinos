import { ipcMain } from 'electron';
import { executeQuery, ConnectionParams } from '../services/databaseService.js';
// @ts-ignore - Type definitions may not be available
import { Client as PgClient } from 'pg';
// @ts-ignore - Type definitions may not be available
import mysql from 'mysql2/promise';
// @ts-ignore - Type definitions may not be available
import sql from 'mssql';
// @ts-ignore - Type definitions may not be available
import { Client as SshClient } from 'ssh2';
import { readFileSync } from 'fs';
import * as net from 'net';

// ============================================================================
// Types
// ============================================================================

export interface DatabaseConnectionTestParams {
  db_type: 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'sqlite';
  host: string;
  port: number;
  db_name: string;
  username: string;
  password: string;
  project_id: string | number;
  
  // SSL/TLS options (snake_case to match backend convention)
  security_type?: 'none' | 'ssl' | 'ssh';
  ssl_mode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  ca_certificate_path?: string;
  client_certificate_path?: string;
  client_private_key_path?: string;
  ssl_key_passphrase?: string;
  
  // SSH Tunnel options (snake_case to match backend convention)
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_auth_method?: 'private_key' | 'password';
  ssh_private_key_path?: string;
  ssh_key_passphrase?: string;
  ssh_password?: string;
  local_port?: number | 'Auto';
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  message?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Read file content from file path
 */
function readFileContent(filePath: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function readFileBuffer(filePath: string): Buffer {
  try {
    return readFileSync(filePath);
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${
      error instanceof Error ? error.message : 'Unknown error'
    }`);
  }
}

/**
 * Create SSH tunnel and return local port
 */
async function createSshTunnel(
  sshHost: string,
  sshPort: number,
  sshUsername: string,
  sshAuthMethod: 'private_key' | 'password',
  dbHost: string,
  dbPort: number,
  localPort?: number | 'Auto',
  sshPrivateKeyPath?: string,
  sshKeyPassphrase?: string,
  sshPassword?: string
): Promise<{ tunnel: SshClient; localPort: number; cleanup: () => void }> {
  /* console.log('[Database Test] Creating SSH tunnel...'); */
  /* console.log('[Database Test] SSH config:', {
    sshHost,
    sshPort,
    sshUsername,
    sshAuthMethod,
    dbHost,
    dbPort,
    localPort,
  }); */

  return new Promise((resolve, reject) => {
    const sshClient = new SshClient();
    const connectionConfig: any = {
      host: sshHost,
      port: sshPort,
      username: sshUsername,
    };

    // Setup authentication
    if (sshAuthMethod === 'private_key') {
      if (!sshPrivateKeyPath) {
        reject(new Error('SSH private key path is required for private key authentication'));
        return;
      }
      try {
        const privateKey = readFileContent(sshPrivateKeyPath);
        connectionConfig.privateKey = privateKey;
        if (sshKeyPassphrase) {
          connectionConfig.passphrase = sshKeyPassphrase;
        }
      } catch (error) {
        reject(new Error(`Failed to read SSH private key: ${error instanceof Error ? error.message : 'Unknown error'}`));
        return;
      }
    } else if (sshAuthMethod === 'password') {
      if (!sshPassword) {
        reject(new Error('SSH password is required for password authentication'));
        return;
      }
      connectionConfig.password = sshPassword;
    } else {
      reject(new Error(`Unsupported SSH auth method: ${sshAuthMethod}`));
      return;
    }

    sshClient.on('error', (err: Error) => {
      /* console.error('[Database Test] SSH connection error:', err); */
      reject(new Error(`SSH connection error: ${err.message}`));
    });

    sshClient.on('ready', () => {
      /* console.log('[Database Test] SSH connection established'); */
      // Create a local TCP server that forwards connections through SSH
      const assignedLocalPort = localPort === 'Auto' || !localPort ? 0 : localPort;
      const localServer = net.createServer((localSocket: net.Socket) => {
        sshClient.forwardOut(
          localSocket.remoteAddress || '127.0.0.1',
          localSocket.remotePort || 0,
          dbHost,
          dbPort,
          (err: Error | null, stream: any) => {
            if (err) {
              localSocket.end();
              return;
            }
            localSocket.pipe(stream);
            stream.pipe(localSocket);
          }
        );
      });

      localServer.listen(assignedLocalPort, '127.0.0.1', () => {
        const address = localServer.address();
        const actualPort = (address && typeof address === 'object') ? address.port : assignedLocalPort;
        /* console.log('[Database Test] Local TCP server started on port:', actualPort); */
        /* console.log('[Database Test] SSH tunnel ready, forwarding to:', `${dbHost}:${dbPort}`); */
        resolve({
          tunnel: sshClient,
          localPort: actualPort as number,
          cleanup: () => {
            /* console.log('[Database Test] Cleaning up SSH tunnel (closing local server and SSH connection)...'); */
            try {
              localServer.close();
              sshClient.end();
              /* console.log('[Database Test] SSH tunnel cleanup completed'); */
            } catch (cleanupError) {
              /* console.error('[Database Test] Error during SSH tunnel cleanup:', cleanupError); */
            }
          },
        });
      });

      localServer.on('error', (err: Error) => {
        /* console.error('[Database Test] Local TCP server error:', err); */
        sshClient.end();
        reject(new Error(`Local server error: ${err.message}`));
      });
    });

    /* console.log('[Database Test] Connecting to SSH server...'); */
    sshClient.connect(connectionConfig);
  });
}

// ============================================================================
// Database Connection Test Functions
// ============================================================================

async function testPostgresConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  let client: PgClient | null = null;
  let sshCleanup: (() => void) | null = null;

  try {
    let actualHost = params.host;
    let actualPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      if (!params.ssh_host || !params.ssh_username || !params.ssh_auth_method) {
        return {
          success: false,
          error: 'SSH host, username, and auth method are required for SSH tunnel',
        };
      }

      const sshPort = params.ssh_port || 22;
      const tunnel = await createSshTunnel(
        params.ssh_host,
        sshPort,
        params.ssh_username,
        params.ssh_auth_method,
        params.host,
        params.port,
        params.local_port,
        params.ssh_private_key_path,
        params.ssh_key_passphrase,
        params.ssh_password
      );

      actualHost = '127.0.0.1';
      actualPort = tunnel.localPort;
      sshCleanup = tunnel.cleanup;
    }

    // Build SSL configuration if needed
    const sslConfig: any = {};
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      if (params.ca_certificate_path) {
        sslConfig.ca = readFileBuffer(params.ca_certificate_path);
      }
      if (params.client_certificate_path) {
        sslConfig.cert = readFileBuffer(params.client_certificate_path);
      }
      if (params.client_private_key_path) {
        sslConfig.key = readFileBuffer(params.client_private_key_path);
        if (params.ssl_key_passphrase) {
          sslConfig.passphrase = params.ssl_key_passphrase;
        }
      }

      // Map ssl_mode to rejectUnauthorized
      if (params.ssl_mode === 'require' || params.ssl_mode === 'verify-ca' || params.ssl_mode === 'verify-full') {
        sslConfig.rejectUnauthorized = true;
      } else {
        sslConfig.rejectUnauthorized = false;
      }
    }

    const clientConfig: any = {
      host: actualHost,
      port: actualPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
    };

    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      clientConfig.ssl = sslConfig;
      /* console.log('[Database Test] SSL configuration applied'); */
    } else if (params.security_type !== 'ssl') {
      clientConfig.ssl = false;
      /* console.log('[Database Test] SSL disabled'); */
    }

    /* console.log('[Database Test] Creating PostgreSQL client with config:', { 
      host: clientConfig.host,
      port: clientConfig.port,
      database: clientConfig.database,
      user: clientConfig.user,
      hasPassword: !!clientConfig.password,
      hasSsl: !!clientConfig.ssl,
    }); */

    client = new PgClient(clientConfig);

    // Connect and test
    /* console.log('[Database Test] Attempting to connect to PostgreSQL...'); */
    await client.connect();
    /* console.log('[Database Test] PostgreSQL connection established successfully'); */

    /* console.log('[Database Test] Executing test query: SELECT 1'); */
    await client.query('SELECT 1');
    /* console.log('[Database Test] Test query executed successfully'); */

    /* console.log('[Database Test] PostgreSQL connection test completed successfully'); */
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    /* console.error('[Database Test] PostgreSQL connection test failed:', error); */
    /* console.error('[Database Test] Error details:', { 
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }); */
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (client) {
      try {
        await client.end();
        /* console.log('[Database Test] PostgreSQL client closed'); */
      } catch (err) {
        /* console.error('[Database Test] Error closing PostgreSQL client:', err); */
      }
    }
    if (sshCleanup) {
      try {
        sshCleanup();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

async function testMysqlConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  let connection: mysql.Connection | null = null;
  let sshCleanup: (() => void) | null = null;

  try {
    let actualHost = params.host;
    let actualPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      if (!params.ssh_host || !params.ssh_username || !params.ssh_auth_method) {
        return {
          success: false,
          error: 'SSH host, username, and auth method are required for SSH tunnel',
        };
      }

      const sshPort = params.ssh_port || 22;
      const tunnel = await createSshTunnel(
        params.ssh_host,
        sshPort,
        params.ssh_username,
        params.ssh_auth_method,
        params.host,
        params.port,
        params.local_port,
        params.ssh_private_key_path,
        params.ssh_key_passphrase,
        params.ssh_password
      );

      actualHost = '127.0.0.1';
      actualPort = tunnel.localPort;
      sshCleanup = tunnel.cleanup;
    }

    const connectionConfig: mysql.ConnectionOptions = {
      host: actualHost,
      port: actualPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
    };

    // Configure SSL if needed
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      connectionConfig.ssl = {} as any;
      if (params.ca_certificate_path) {
        (connectionConfig.ssl as any).ca = readFileBuffer(params.ca_certificate_path);
      }
      if (params.client_certificate_path) {
        (connectionConfig.ssl as any).cert = readFileBuffer(params.client_certificate_path);
      }
      if (params.client_private_key_path) {
        (connectionConfig.ssl as any).key = readFileBuffer(params.client_private_key_path);
      }
    }

    /* console.log('[Database Test] Creating MySQL connection with config:', {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.user,
      hasPassword: !!connectionConfig.password,
      hasSsl: !!connectionConfig.ssl,
    }); */

    connection = await mysql.createConnection(connectionConfig);
    /* console.log('[Database Test] MySQL connection established successfully'); */

    /* console.log('[Database Test] Executing test query: SELECT 1'); */
    await connection.query('SELECT 1');
    /* console.log('[Database Test] Test query executed successfully'); */

    /* console.log('[Database Test] MySQL connection test completed successfully'); */
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    /* console.error('[Database Test] MySQL connection test failed:', error); */
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (connection) {
      try {
        await connection.end();
        /* console.log('[Database Test] MySQL connection closed'); */
      } catch (err) {
        /* console.error('[Database Test] Error closing MySQL connection:', err); */
      }
    }
    if (sshCleanup) {
      try {
        sshCleanup();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

async function testMssqlConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  let pool: sql.ConnectionPool | null = null;
  let sshCleanup: (() => void) | null = null;

  try {
    let actualHost = params.host;
    let actualPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      if (!params.ssh_host || !params.ssh_username || !params.ssh_auth_method) {
        return {
          success: false,
          error: 'SSH host, username, and auth method are required for SSH tunnel',
        };
      }

      const sshPort = params.ssh_port || 22;
      const tunnel = await createSshTunnel(
        params.ssh_host,
        sshPort,
        params.ssh_username,
        params.ssh_auth_method,
        params.host,
        params.port,
        params.local_port,
        params.ssh_private_key_path,
        params.ssh_key_passphrase,
        params.ssh_password
      );

      actualHost = '127.0.0.1';
      actualPort = tunnel.localPort;
      sshCleanup = tunnel.cleanup;
    }

    const config: sql.config = {
      server: actualHost,
      port: actualPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
      options: {
        encrypt: params.security_type === 'ssl' && params.ssl_mode !== 'disable',
        trustServerCertificate: params.ssl_mode === 'require' || params.ssl_mode === 'disable',
      },
    };

    // Configure SSL certificates if needed
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      if (params.ca_certificate_path) {
        (config.options as any).ca = readFileBuffer(params.ca_certificate_path);
      }
      if (params.client_certificate_path) {
        (config.options as any).cert = readFileBuffer(params.client_certificate_path);
      }
      if (params.client_private_key_path) {
        (config.options as any).key = readFileBuffer(params.client_private_key_path);
      }
    }

    /* console.log('[Database Test] Creating MSSQL connection pool with config:', { 
      server: config.server,
      port: config.port,
      database: config.database,
      user: config.user,
      hasPassword: !!config.password,
      encrypt: config.options.encrypt,
    }); */

    pool = await sql.connect(config);
    /* console.log('[Database Test] MSSQL connection established successfully'); */

    /* console.log('[Database Test] Executing test query: SELECT 1'); */
    await pool.request().query('SELECT 1');
    /* console.log('[Database Test] Test query executed successfully'); */

    /* console.log('[Database Test] MSSQL connection test completed successfully'); */
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    /* console.error('[Database Test] MSSQL connection test failed:', error); */
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
        /* console.log('[Database Test] MSSQL connection pool closed'); */
      } catch (err) {
        /* console.error('[Database Test] Error closing MSSQL connection pool:', err); */
      }
    }
    if (sshCleanup) {
      try {
        sshCleanup();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Test database connection handler
 */
async function testDatabaseConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  /* console.log('[Database Test] ========================================'); */
  /* console.log('[Database Test] Starting database connection test'); */
  /* console.log('[Database Test] Database type:', params.db_type); */
  
  // Basic validation
  if (!params.db_type) {
    /* console.error('[Database Test] Validation failed: Database type is required'); */
    return {
      success: false,
      error: 'Database type is required',
    };
  }

  if (!params.host || !params.host.trim()) {
    /* console.error('[Database Test] Validation failed: Host is required'); */
    return {
      success: false,
      error: 'Host is required',
    };
  }

  if (!params.port || params.port <= 0 || params.port > 65535) {
    /* console.error('[Database Test] Validation failed: Invalid port:', params.port); */
    return {
      success: false,
      error: 'Port must be a number between 1 and 65535',
    };
  }

  if (!params.db_name || !params.db_name.trim()) {
    /* console.error('[Database Test] Validation failed: Database name is required'); */
    return {
      success: false,
      error: 'Database name is required',
    };
  }

  if (!params.username || !params.username.trim()) {
    /* console.error('[Database Test] Validation failed: Username is required'); */
    return {
      success: false,
      error: 'Username is required',
    };
  }

  if (params.password === undefined || params.password === null) {
    /* console.error('[Database Test] Validation failed: Password is required'); */
    return {
      success: false,
      error: 'Password is required',
    };
  }

  /* console.log('[Database Test] Validation passed, proceeding with connection test'); */

  // Test connection based on database type
  try {
    switch (params.db_type) {
      case 'postgres':
        return await testPostgresConnection(params);
      
      case 'mysql':
      case 'mariadb':
        return await testMysqlConnection(params);
      
      case 'mssql':
        return await testMssqlConnection(params);
      
      case 'sqlite':
        return {
          success: false,
          error: 'SQLite is not supported for connection testing',
        };
      
      default:
        return {
          success: false,
          error: `Unsupported database type: ${params.db_type}`,
        };
    }
  } catch (error) {
    /* console.error('[Database Test] Unhandled error during connection test:', error); */
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// IPC Handlers Registration
// ============================================================================

/**
 * Register all database IPC handlers (test connection and execute query)
 */
export function registerDatabaseIpc() {
  // Test database connection
  ipcMain.handle('database:test-connection', async (_event, params: DatabaseConnectionTestParams) => {
    /* console.log('[Database Test IPC] Received test connection request'); */
    try {
      const result = await testDatabaseConnection(params);
      /* console.log('[Database Test IPC] Test completed, returning result'); */
      return result;
    } catch (error) {
      /* console.error('[Database Test IPC] Unhandled error:', error); */
      /* console.error('[Database Test IPC] Error stack:', error instanceof Error ? error.stack : undefined); */
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Execute query on database
  ipcMain.handle('database:execute-query', async (_event, params: ConnectionParams, query: string) => {
    try {
      return await executeQuery(params, query);
    } catch (error: any) {
      return {
        success: false,
        data: [],
        error: error?.message || String(error),
      };
    }
  });
}
