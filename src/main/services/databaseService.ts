
// @ts-ignore - Type definitions may not be available
import pg, { Client as PgClient } from 'pg';
// @ts-ignore - Type definitions may not be available
import mysql from 'mysql2/promise';
// @ts-ignore - Type definitions may not be available
import sql from 'mssql';
// @ts-ignore - Type definitions may not be available
import { Client as SshClient } from 'ssh2';
import { readFileSync } from 'fs';
import * as net from 'net';

const { Pool: PgPool } = pg;

// Security options for database connections
export interface ConnectionSecurityOptions {
  // SSL/TLS options
  security_type?: 'none' | 'ssl' | 'ssh';
  ssl_mode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  ca_certificate_path?: string;
  client_certificate_path?: string;
  client_private_key_path?: string;
  ssl_key_passphrase?: string;
  
  // SSH Tunnel options
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_auth_method?: 'private_key' | 'password';
  ssh_private_key_path?: string;
  ssh_key_passphrase?: string;
  ssh_password?: string;
  local_port?: number | 'Auto';
}

export interface ConnectionParams extends ConnectionSecurityOptions {
  db_type: 'postgres' | 'mysql' | 'mssql';
  host: string;
  port: number;
  db_name: string;
  username: string;
  password: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ExecuteQueryResult {
  success: boolean;
  data: any[];
  error?: string;
}

const CONNECTION_TIMEOUT = 30000; // 30 seconds

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
        reject(new Error('SSH private key path is required when using private key authentication'));
        return;
      }
      try {
        const privateKey = readFileContent(sshPrivateKeyPath);
        connectionConfig.privateKey = privateKey;
        if (sshKeyPassphrase) {
          connectionConfig.passphrase = sshKeyPassphrase;
        }
      } catch (error) {
        reject(error);
        return;
      }
    } else {
      if (!sshPassword) {
        reject(new Error('SSH password is required when using password authentication'));
        return;
      }
      connectionConfig.password = sshPassword;
    }

    sshClient.on('error', (err: Error) => {
      reject(new Error(`SSH connection error: ${err.message}`));
    });

    sshClient.on('ready', () => {
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
        resolve({
          tunnel: sshClient,
          localPort: actualPort as number,
          cleanup: () => {
            try {
              localServer.close();
              sshClient.end();
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          },
        });
      });

      localServer.on('error', (err: Error) => {
        sshClient.end();
        reject(new Error(`Local server error: ${err.message}`));
      });
    });

    sshClient.connect(connectionConfig);
  });
}

/**
 * Test database connection
 */
export async function testConnection(params: ConnectionParams): Promise<TestConnectionResult> {
  const { db_type, host, port, db_name, username, password } = params;

  try {
    if (db_type === 'postgres') {
      const pool = new PgPool({
        host,
        port,
        database: db_name,
        user: username,
        password,
        connectionTimeoutMillis: CONNECTION_TIMEOUT,
      });

      try {
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT 1 as test');
          if (result.rows && result.rows.length > 0 && result.rows[0].test === 1) {
            return { success: true, message: 'Connection successful' };
          } else {
            return { success: false, message: 'Test query did not return expected result', error: 'Unexpected result' };
          }
        } finally {
          client.release();
        }
      } finally {
        await pool.end();
      }
    } else if (db_type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port,
        database: db_name,
        user: username,
        password,
        connectTimeout: CONNECTION_TIMEOUT,
      });

      try {
        const [rows] = await connection.execute('SELECT 1 as test');
        const result = rows as any[];
        if (result && result.length > 0 && (result[0].test === 1 || result[0].test === '1')) {
          return { success: true, message: 'Connection successful' };
        } else {
          return { success: false, message: 'Test query did not return expected result', error: 'Unexpected result' };
        }
      } finally {
        await connection.end();
      }
    } else if (db_type === 'mssql') {
      const config: sql.config = {
        server: host,
        port,
        database: db_name,
        user: username,
        password,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          connectTimeout: CONNECTION_TIMEOUT,
        },
      };

      try {
        const pool = await sql.connect(config);
        try {
          const result = await pool.request().query('SELECT 1 as test');
          if (result.recordset && result.recordset.length > 0 && result.recordset[0].test === 1) {
            return { success: true, message: 'Connection successful' };
          } else {
            return { success: false, message: 'Test query did not return expected result', error: 'Unexpected result' };
          }
        } finally {
          await pool.close();
        }
      } catch (err) {
        throw err;
      }
    } else {
      return { success: false, message: 'Unsupported database type', error: `Database type ${db_type} is not supported` };
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    let userMessage = 'Unable to connect to database';

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      userMessage = 'Connection timeout. Please check if the host and port are correct.';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
      userMessage = 'Authentication failed. Please check your username and password.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
      userMessage = 'Unable to reach the database server. Please check the host and port.';
    } else if (errorMessage.includes('database') && errorMessage.includes('does not exist')) {
      userMessage = 'Database does not exist. Please check the database name.';
    }

    return {
      success: false,
      message: userMessage,
      error: errorMessage,
    };
  }
}

/**
 * Execute query on PostgreSQL database
 */
async function executePostgresQuery(params: ConnectionParams, query: string): Promise<ExecuteQueryResult> {
  let sshCleanup: (() => void) | null = null;
  let client: PgClient | null = null;

  try {
    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      if (!params.ssh_host || !params.ssh_port || !params.ssh_username || !params.ssh_auth_method) {
        return {
          success: false,
          data: [],
          error: 'SSH configuration is incomplete',
        };
      }

      const tunnel = await createSshTunnel(
        params.ssh_host,
        params.ssh_port,
        params.ssh_username,
        params.ssh_auth_method,
        params.host,
        params.port,
        params.local_port,
        params.ssh_private_key_path,
        params.ssh_key_passphrase,
        params.ssh_password
      );
      
      sshCleanup = tunnel.cleanup;
      connectHost = '127.0.0.1';
      connectPort = tunnel.localPort;
    }

    const sslConfig: any = {};

    // Handle SSL modes
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable' && params.ssl_mode !== 'allow') {
      const actualSslMode = params.ssl_mode === 'prefer' ? 'require' : params.ssl_mode;
      const needsVerification = actualSslMode === 'verify-full' || actualSslMode === 'verify-ca';
      
      if (params.ca_certificate_path) {
        try {
          sslConfig.ca = readFileBuffer(params.ca_certificate_path);
        } catch (error) {
          return {
            success: false,
            data: [],
            error: `Failed to read CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else {
        if (actualSslMode === 'verify-ca' || actualSslMode === 'verify-full') {
          return {
            success: false,
            data: [],
            error: `SSL mode '${params.ssl_mode}' requires a CA certificate to be provided`,
          };
  }
      }
    
      if (params.client_certificate_path) {
        try {
          sslConfig.cert = readFileBuffer(params.client_certificate_path);
        } catch (error) {
          return {
            success: false,
            data: [],
            error: `Failed to read client certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    
      if (params.client_private_key_path) {
        try {
          sslConfig.key = readFileBuffer(params.client_private_key_path);
          if (params.ssl_key_passphrase) {
            sslConfig.passphrase = params.ssl_key_passphrase;
          }
        } catch (error) {
          return {
            success: false,
            data: [],
            error: `Failed to read client private key: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Map ssl_mode to rejectUnauthorized (consistent with test connection logic)
      if (actualSslMode === 'require' || actualSslMode === 'verify-ca' || actualSslMode === 'verify-full') {
        sslConfig.rejectUnauthorized = true;
      } else {
        sslConfig.rejectUnauthorized = false;
      }
    }

    // Create client config
    const clientConfig: any = {
      host: connectHost,
      port: connectPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
        connectionTimeoutMillis: CONNECTION_TIMEOUT,
    };

    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      clientConfig.ssl = sslConfig;
    } else if (params.security_type !== 'ssl') {
      clientConfig.ssl = false;
    }

    client = new PgClient(clientConfig);
    await client.connect();

          const result = await client.query(query);
          // Convert rows to plain objects
    const data = result.rows.map((row: any) => {
            const obj: any = {};
            for (const key in row) {
              obj[key] = row[key];
            }
            return obj;
          });

          return { success: true, data };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    return {
      success: false,
      data: [],
      error: errorMessage,
    };
        } finally {
    if (client) {
      try {
        await client.end();
      } catch (err) {
        // Ignore cleanup errors
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
 * Execute query on MySQL database
 */
async function executeMysqlQuery(params: ConnectionParams, query: string): Promise<ExecuteQueryResult> {
  let sshCleanup: (() => void) | null = null;
  let connection: mysql.Connection | null = null;

  try {
    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      if (!params.ssh_host || !params.ssh_port || !params.ssh_username || !params.ssh_auth_method) {
        return {
          success: false,
          data: [],
          error: 'SSH configuration is incomplete',
        };
      }

      const tunnel = await createSshTunnel(
        params.ssh_host,
        params.ssh_port,
        params.ssh_username,
        params.ssh_auth_method,
        params.host,
        params.port,
        params.local_port,
        params.ssh_private_key_path,
        params.ssh_key_passphrase,
        params.ssh_password
      );
      
      sshCleanup = tunnel.cleanup;
      connectHost = '127.0.0.1';
      connectPort = tunnel.localPort;
    }

    // Configure SSL if needed
    const sslOptions: any = {};
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable' && params.ssl_mode !== 'allow') {
      const actualSslMode = params.ssl_mode === 'prefer' ? 'require' : params.ssl_mode;
      if (params.ca_certificate_path) {
        try {
          sslOptions.ca = readFileContent(params.ca_certificate_path);
        } catch (error) {
          return {
            success: false,
            data: [],
            error: `Failed to read CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.client_certificate_path) {
        try {
          sslOptions.cert = readFileContent(params.client_certificate_path);
        } catch (error) {
          return {
            success: false,
            data: [],
            error: `Failed to read client certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.client_private_key_path) {
        try {
          sslOptions.key = readFileContent(params.client_private_key_path);
        } catch (error) {
          return {
            success: false,
            data: [],
            error: `Failed to read client private key: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      sslOptions.rejectUnauthorized = actualSslMode === 'verify-full' || actualSslMode === 'verify-ca';
    }

    // Create connection config
    const connectionConfig: mysql.ConnectionOptions = {
      host: connectHost,
      port: connectPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
        connectTimeout: CONNECTION_TIMEOUT,
    };

    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      connectionConfig.ssl = sslOptions;
    }

    connection = await mysql.createConnection(connectionConfig);

        const [rows] = await connection.execute(query);
        // Convert to plain objects
        const data = (rows as any[]).map((row: any) => {
          const obj: any = {};
          for (const key in row) {
            obj[key] = row[key];
          }
          return obj;
        });

        return { success: true, data };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    return {
      success: false,
      data: [],
      error: errorMessage,
    };
      } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (err) {
        // Ignore cleanup errors
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
 * Execute query on MSSQL database
 */
async function executeMssqlQuery(params: ConnectionParams, query: string): Promise<ExecuteQueryResult> {
  let sshCleanup: (() => void) | null = null;
  let pool: sql.ConnectionPool | null = null;

  try {
    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      if (!params.ssh_host || !params.ssh_port || !params.ssh_username || !params.ssh_auth_method) {
        return {
          success: false,
          data: [],
          error: 'SSH configuration is incomplete',
        };
      }

      const tunnel = await createSshTunnel(
        params.ssh_host,
        params.ssh_port,
        params.ssh_username,
        params.ssh_auth_method,
        params.host,
        params.port,
        params.local_port,
        params.ssh_private_key_path,
        params.ssh_key_passphrase,
        params.ssh_password
      );
      
      sshCleanup = tunnel.cleanup;
      connectHost = '127.0.0.1';
      connectPort = tunnel.localPort;
    }

    // Configure SSL/TLS if needed
    const options: sql.config = {
      server: connectHost,
      port: connectPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
      connectionTimeout: CONNECTION_TIMEOUT,
      requestTimeout: CONNECTION_TIMEOUT,
        options: {
        encrypt: params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable' && params.ssl_mode !== 'allow',
        trustServerCertificate: params.ssl_mode === 'require' || params.ssl_mode === 'prefer' || params.ssl_mode === 'disable' || params.ssl_mode === 'allow',
        },
      };

    pool = await sql.connect(options);
          const result = await pool.request().query(query);
    
          // Convert recordset to plain objects
          const data = result.recordset.map((row: any) => {
            const obj: any = {};
            for (const key in row) {
              obj[key] = row[key];
            }
            return obj;
          });

          return { success: true, data };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    return {
      success: false,
      data: [],
      error: errorMessage,
    };
        } finally {
    if (pool) {
      try {
          await pool.close();
      } catch (err) {
        // Ignore cleanup errors
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
 * Execute query on database
 */
export async function executeQuery(params: ConnectionParams, query: string): Promise<ExecuteQueryResult> {
  if (!query || !query.trim()) {
    return { success: false, data: [], error: 'Query is required' };
  }

  try {
    switch (params.db_type) {
      case 'postgres':
        return await executePostgresQuery(params, query);
      
      case 'mysql':
        return await executeMysqlQuery(params, query);
      
      case 'mssql':
        return await executeMssqlQuery(params, query);
      
      default:
        return { success: false, data: [], error: `Unsupported database type: ${params.db_type}` };
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    return {
      success: false,
      data: [],
      error: errorMessage,
    };
  }
}
