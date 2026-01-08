import { ipcMain } from "electron";
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
export interface DatabaseConnectionTestParams {
  db_type: 'postgres' | 'mysql' | 'mariadb' | 'mssql' | 'sqlite';
  host: string;
  port: number;
  db_name: string;
  username: string;
  password: string;
  project_id: string | number;
  
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

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  message?: string;
}

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
        resolve({
          tunnel: sshClient,
          localPort: actualPort as number,
          cleanup: () => {
            localServer.close();
            sshClient.end();
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
 * Test PostgreSQL connection
 */
async function testPostgresConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  let sshCleanup: (() => void) | null = null;
  let client: PgClient | null = null;

  try {
    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.securityType === 'ssh') {
      if (!params.sshHost || !params.sshPort || !params.sshUsername || !params.sshAuthMethod) {
        return {
          success: false,
          error: 'SSH configuration is incomplete',
        };
      }

      const tunnel = await createSshTunnel(
        params.sshHost,
        params.sshPort,
        params.sshUsername,
        params.sshAuthMethod,
        params.host,
        params.port,
        params.localPort,
        params.sshPrivateKeyPath,
        params.sshKeyPassphrase,
        params.sshPassword
      );
      
      sshCleanup = tunnel.cleanup;
      connectHost = '127.0.0.1';
      connectPort = tunnel.localPort;
    }

    // Configure SSL if needed
    const sslConfig: any = {};
    if (params.securityType === 'ssl' && params.sslMode && params.sslMode !== 'disable') {
      sslConfig.rejectUnauthorized = params.sslMode === 'verify-full' || params.sslMode === 'verify-ca';
      
      if (params.caCertificatePath) {
        try {
          sslConfig.ca = readFileContent(params.caCertificatePath);
        } catch (error) {
          return {
            success: false,
            error: `Failed to read CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.clientCertificatePath) {
        try {
          sslConfig.cert = readFileContent(params.clientCertificatePath);
        } catch (error) {
          return {
            success: false,
            error: `Failed to read client certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.clientPrivateKeyPath) {
        try {
          sslConfig.key = readFileContent(params.clientPrivateKeyPath);
          if (params.sslKeyPassphrase) {
            sslConfig.passphrase = params.sslKeyPassphrase;
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to read client private key: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    }

    // Create client
    const clientConfig: any = {
      host: connectHost,
      port: connectPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
      connectionTimeoutMillis: 10000, // 10 seconds timeout
    };

    if (params.securityType === 'ssl' && params.sslMode && params.sslMode !== 'disable') {
      clientConfig.ssl = sslConfig;
    } else if (params.securityType !== 'ssl') {
      clientConfig.ssl = false;
    }

    client = new PgClient(clientConfig);

    // Connect and test
    await client.connect();
    await client.query('SELECT 1');

    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
      sshCleanup();
    }
  }
}

/**
 * Test MySQL connection
 */
async function testMysqlConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  let sshCleanup: (() => void) | null = null;
  let connection: mysql.Connection | null = null;

  try {
    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.securityType === 'ssh') {
      if (!params.sshHost || !params.sshPort || !params.sshUsername || !params.sshAuthMethod) {
        return {
          success: false,
          error: 'SSH configuration is incomplete',
        };
      }

      const tunnel = await createSshTunnel(
        params.sshHost,
        params.sshPort,
        params.sshUsername,
        params.sshAuthMethod,
        params.host,
        params.port,
        params.localPort,
        params.sshPrivateKeyPath,
        params.sshKeyPassphrase,
        params.sshPassword
      );
      
      sshCleanup = tunnel.cleanup;
      connectHost = '127.0.0.1';
      connectPort = tunnel.localPort;
    }

    // Configure SSL if needed
    const sslOptions: any = {};
    if (params.securityType === 'ssl' && params.sslMode && params.sslMode !== 'disable') {
      if (params.caCertificatePath) {
        try {
          sslOptions.ca = readFileContent(params.caCertificatePath);
        } catch (error) {
          return {
            success: false,
            error: `Failed to read CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.clientCertificatePath) {
        try {
          sslOptions.cert = readFileContent(params.clientCertificatePath);
        } catch (error) {
          return {
            success: false,
            error: `Failed to read client certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.clientPrivateKeyPath) {
        try {
          sslOptions.key = readFileContent(params.clientPrivateKeyPath);
        } catch (error) {
          return {
            success: false,
            error: `Failed to read client private key: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      sslOptions.rejectUnauthorized = params.sslMode === 'verify-full' || params.sslMode === 'verify-ca';
    }

    // Create connection config
    const connectionConfig: mysql.ConnectionOptions = {
      host: connectHost,
      port: connectPort,
      database: params.db_name,
      user: params.username,
      password: params.password,
      connectTimeout: 10000, // 10 seconds timeout
    };

    if (params.securityType === 'ssl' && params.sslMode && params.sslMode !== 'disable') {
      connectionConfig.ssl = sslOptions;
    }

    connection = await mysql.createConnection(connectionConfig);

    // Test connection
    await connection.query('SELECT 1');

    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
      sshCleanup();
    }
  }
}

/**
 * Test MSSQL connection
 */
async function testMssqlConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  let sshCleanup: (() => void) | null = null;
  let pool: sql.ConnectionPool | null = null;

  try {
    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.securityType === 'ssh') {
      if (!params.sshHost || !params.sshPort || !params.sshUsername || !params.sshAuthMethod) {
        return {
          success: false,
          error: 'SSH configuration is incomplete',
        };
      }

      const tunnel = await createSshTunnel(
        params.sshHost,
        params.sshPort,
        params.sshUsername,
        params.sshAuthMethod,
        params.host,
        params.port,
        params.localPort,
        params.sshPrivateKeyPath,
        params.sshKeyPassphrase,
        params.sshPassword
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
      connectionTimeout: 10000, // 10 seconds timeout
      requestTimeout: 10000,
      options: {
        encrypt: params.securityType === 'ssl' && params.sslMode && params.sslMode !== 'disable',
        trustServerCertificate: params.sslMode === 'require' || params.sslMode === 'disable',
      },
    };

    // Note: MSSQL SSL configuration with custom certificates requires advanced TLS setup
    // The options.encrypt flag enables SSL/TLS encryption
    if (params.caCertificatePath) {
      // MSSQL uses system CA store by default
      // Custom CA certificates require Node.js TLS context configuration (advanced)
    }

    pool = await sql.connect(options);

    // Test connection
    await pool.request().query('SELECT 1');

    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
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
      sshCleanup();
    }
  }
}

/**
 * Test database connection handler
 */
async function testDatabaseConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  // Basic validation
  if (!params.db_type) {
    return {
      success: false,
      error: 'Database type is required',
    };
  }

  if (!params.host || !params.host.trim()) {
    return {
      success: false,
      error: 'Host is required',
    };
  }

  if (!params.port || params.port <= 0 || params.port > 65535) {
    return {
      success: false,
      error: 'Port must be a number between 1 and 65535',
    };
  }

  if (!params.db_name || !params.db_name.trim()) {
    return {
      success: false,
      error: 'Database name is required',
    };
  }

  if (!params.username || !params.username.trim()) {
    return {
      success: false,
      error: 'Username is required',
    };
  }

  if (params.password === undefined || params.password === null) {
    return {
      success: false,
      error: 'Password is required',
    };
  }

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
          error: 'SQLite connection testing is not supported in this function',
        };
      
      default:
        return {
          success: false,
          error: `Unsupported database type: ${params.db_type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Register database test IPC handlers
 */
export function registerDatabaseTestIpc() {
  ipcMain.handle('database:test-connection', async (_event, params: DatabaseConnectionTestParams) => {
    try {
      return await testDatabaseConnection(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });
}

