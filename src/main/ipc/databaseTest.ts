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
// Import the interface from renderer types to ensure consistency
// Note: This interface matches DatabaseConnectionTestParams from renderer/utils/testDatabaseConnection.ts
// which extends DatabaseConnectionCreateRequest with file path fields for IPC communication
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
  console.log('[Database Test] Creating SSH tunnel...');
  console.log('[Database Test] SSH config:', {
    sshHost,
    sshPort,
    sshUsername,
    sshAuthMethod,
    dbHost,
    dbPort,
    localPort,
  });

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
        console.error('[Database Test] SSH private key path is required');
        reject(new Error('SSH private key path is required when using private key authentication'));
        return;
      }
      try {
        console.log('[Database Test] Reading SSH private key from:', sshPrivateKeyPath);
        const privateKey = readFileContent(sshPrivateKeyPath);
        connectionConfig.privateKey = privateKey;
        if (sshKeyPassphrase) {
          connectionConfig.passphrase = sshKeyPassphrase;
          console.log('[Database Test] SSH key passphrase configured');
        }
        console.log('[Database Test] SSH private key loaded successfully');
      } catch (error) {
        console.error('[Database Test] Failed to read SSH private key:', error);
        reject(error);
        return;
      }
    } else {
      if (!sshPassword) {
        console.error('[Database Test] SSH password is required');
        reject(new Error('SSH password is required when using password authentication'));
        return;
      }
      connectionConfig.password = sshPassword;
      console.log('[Database Test] SSH password authentication configured');
    }

    sshClient.on('error', (err: Error) => {
      console.error('[Database Test] SSH client error:', err);
      reject(new Error(`SSH connection error: ${err.message}`));
    });

    sshClient.on('ready', () => {
      console.log('[Database Test] SSH connection established');
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
        console.log('[Database Test] Local TCP server started on port:', actualPort);
        console.log('[Database Test] SSH tunnel ready, forwarding to:', `${dbHost}:${dbPort}`);
        resolve({
          tunnel: sshClient,
          localPort: actualPort as number,
          cleanup: () => {
            console.log('[Database Test] Cleaning up SSH tunnel (closing local server and SSH connection)...');
            try {
              localServer.close();
              sshClient.end();
              console.log('[Database Test] SSH tunnel cleanup completed');
            } catch (cleanupError) {
              console.error('[Database Test] Error during SSH tunnel cleanup:', cleanupError);
            }
          },
        });
      });

      localServer.on('error', (err: Error) => {
        console.error('[Database Test] Local TCP server error:', err);
        sshClient.end();
        reject(new Error(`Local server error: ${err.message}`));
      });
    });

    console.log('[Database Test] Connecting to SSH server...');
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
    console.log('[Database Test] Testing PostgreSQL connection...');
    console.log('[Database Test] Connection params:', {
      host: params.host,
      port: params.port,
      database: params.db_name,
      user: params.username,
      securityType: params.security_type,
    });

    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      console.log('[Database Test] Setting up SSH tunnel...');
      if (!params.ssh_host || !params.ssh_port || !params.ssh_username || !params.ssh_auth_method) {
        console.error('[Database Test] SSH configuration is incomplete');
        return {
          success: false,
          error: 'SSH configuration is incomplete',
        };
      }

      try {
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
        
        console.log('[Database Test] SSH tunnel established on local port:', tunnel.localPort);
        sshCleanup = tunnel.cleanup;
        connectHost = '127.0.0.1';
        connectPort = tunnel.localPort;
      } catch (sshError) {
        console.error('[Database Test] SSH tunnel setup failed:', sshError);
        throw sshError;
      }
    }

    const sslConfig: any = {};

    // Handle SSL modes
    // allow: prefer non-SSL, fallback to SSL if needed (treat as disable for single connection)
    // prefer: prefer SSL, fallback to non-SSL if needed (treat as require for single connection)
    // disable: no SSL
    // require: use SSL but don't verify
    // verify-ca: verify CA certificate
    // verify-full: verify full certificate chain
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable' && params.ssl_mode !== 'allow') {
      console.log('[Database Test] Configuring SSL with mode:', params.ssl_mode);
      
      // For 'prefer' mode, treat as 'require' (prefer SSL but don't verify)
      const actualSslMode = params.ssl_mode === 'prefer' ? 'require' : params.ssl_mode;
      
      // Set rejectUnauthorized based on SSL mode
      // require/prefer: use SSL but don't verify (rejectUnauthorized = false)
      // verify-ca: verify CA certificate (rejectUnauthorized = true if CA cert provided)
      // verify-full: verify full certificate chain (rejectUnauthorized = true)
      const needsVerification = actualSslMode === 'verify-full' || actualSslMode === 'verify-ca';
      
      if (params.ca_certificate_path) {
        try {
          console.log('[Database Test] Reading CA certificate from:', params.ca_certificate_path);
          sslConfig.ca = readFileBuffer(params.ca_certificate_path);
          console.log('[Database Test] CA certificate loaded successfully, length:', sslConfig.ca.length, 'bytes');
          // If CA cert is provided and mode is verify-ca or verify-full, enable verification
          if (needsVerification) {
            sslConfig.rejectUnauthorized = true;
            console.log('[Database Test] SSL rejectUnauthorized: true (CA certificate provided)');
          }
        } catch (error) {
          console.error('[Database Test] Failed to read CA certificate:', error);
          return {
            success: false,
            error: `Failed to read CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else {
        // No CA certificate provided
        if (actualSslMode === 'verify-ca' || actualSslMode === 'verify-full') {
          // For verify-ca/verify-full, CA certificate is required
          console.error('[Database Test] SSL mode', params.ssl_mode, 'requires CA certificate but none provided');
          return {
            success: false,
            error: `SSL mode '${params.ssl_mode}' requires a CA certificate to be provided`,
          };
        } else {
          // For require/prefer mode, don't verify (rejectUnauthorized = false)
          sslConfig.rejectUnauthorized = false;
          console.log('[Database Test] SSL rejectUnauthorized: false (require/prefer mode, no CA certificate)');
        }
      }
    
      if (params.client_certificate_path) {
        try {
          console.log('[Database Test] Reading client certificate from:', params.client_certificate_path);
          sslConfig.cert = readFileBuffer(params.client_certificate_path);
          console.log('[Database Test] Client certificate loaded successfully');
        } catch (error) {
          console.error('[Database Test] Failed to read client certificate:', error);
          return {
            success: false,
            error: `Failed to read client certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }
    
      if (params.client_private_key_path) {
        try {
          console.log('[Database Test] Reading client private key from:', params.client_private_key_path);
          sslConfig.key = readFileBuffer(params.client_private_key_path);
          if (params.ssl_key_passphrase) {
            sslConfig.passphrase = params.ssl_key_passphrase;
            console.log('[Database Test] SSL key passphrase configured');
          }
          console.log('[Database Test] Client private key loaded successfully');
        } catch (error) {
          console.error('[Database Test] Failed to read client private key:', error);
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

    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      clientConfig.ssl = sslConfig;
      console.log('[Database Test] SSL configuration applied');
    } else if (params.security_type !== 'ssl') {
      clientConfig.ssl = false;
      console.log('[Database Test] SSL disabled');
    }

    console.log('[Database Test] Creating PostgreSQL client with config:', {
      host: clientConfig.host,
      port: clientConfig.port,
      database: clientConfig.database,
      user: clientConfig.user,
      hasPassword: !!clientConfig.password,
      hasSsl: !!clientConfig.ssl,
    });

    client = new PgClient(clientConfig);

    // Connect and test
    console.log('[Database Test] Attempting to connect to PostgreSQL...');
    await client.connect();
    console.log('[Database Test] PostgreSQL connection established successfully');

    console.log('[Database Test] Executing test query: SELECT 1');
    await client.query('SELECT 1');
    console.log('[Database Test] Test query executed successfully');

    console.log('[Database Test] PostgreSQL connection test completed successfully');
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    console.error('[Database Test] PostgreSQL connection test failed:', error);
    console.error('[Database Test] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (client) {
      try {
        console.log('[Database Test] Closing PostgreSQL connection...');
        await client.end();
        console.log('[Database Test] PostgreSQL connection closed');
      } catch (err) {
        console.error('[Database Test] Error closing PostgreSQL connection:', err);
        // Ignore cleanup errors
      }
    }
    if (sshCleanup) {
      try {
        console.log('[Database Test] Cleaning up SSH tunnel...');
        sshCleanup();
        console.log('[Database Test] SSH tunnel cleaned up');
      } catch (err) {
        console.error('[Database Test] Error cleaning up SSH tunnel:', err);
      }
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
    console.log('[Database Test] Testing MySQL connection...');
    console.log('[Database Test] Connection params:', {
      host: params.host,
      port: params.port,
      database: params.db_name,
      user: params.username,
      securityType: params.security_type,
    });

    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      console.log('[Database Test] Setting up SSH tunnel...');
      if (!params.ssh_host || !params.ssh_port || !params.ssh_username || !params.ssh_auth_method) {
        console.error('[Database Test] SSH configuration is incomplete');
        return {
          success: false,
          error: 'SSH configuration is incomplete',
        };
      }

      try {
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
        
        console.log('[Database Test] SSH tunnel established on local port:', tunnel.localPort);
        sshCleanup = tunnel.cleanup;
        connectHost = '127.0.0.1';
        connectPort = tunnel.localPort;
      } catch (sshError) {
        console.error('[Database Test] SSH tunnel setup failed:', sshError);
        throw sshError;
      }
    }

    // Configure SSL if needed
    // allow: prefer non-SSL, fallback to SSL if needed (treat as disable for single connection)
    // prefer: prefer SSL, fallback to non-SSL if needed (treat as require for single connection)
    const sslOptions: any = {};
    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable' && params.ssl_mode !== 'allow') {
      console.log('[Database Test] Configuring SSL with mode:', params.ssl_mode);
      // For 'prefer' mode, treat as 'require' (prefer SSL but don't verify)
      const actualSslMode = params.ssl_mode === 'prefer' ? 'require' : params.ssl_mode;
      if (params.ca_certificate_path) {
        try {
          console.log('[Database Test] Reading CA certificate from:', params.ca_certificate_path);
          sslOptions.ca = readFileContent(params.ca_certificate_path);
          console.log('[Database Test] CA certificate loaded successfully');
        } catch (error) {
          console.error('[Database Test] Failed to read CA certificate:', error);
          return {
            success: false,
            error: `Failed to read CA certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.client_certificate_path) {
        try {
          console.log('[Database Test] Reading client certificate from:', params.client_certificate_path);
          sslOptions.cert = readFileContent(params.client_certificate_path);
          console.log('[Database Test] Client certificate loaded successfully');
        } catch (error) {
          console.error('[Database Test] Failed to read client certificate:', error);
          return {
            success: false,
            error: `Failed to read client certificate: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      if (params.client_private_key_path) {
        try {
          console.log('[Database Test] Reading client private key from:', params.client_private_key_path);
          sslOptions.key = readFileContent(params.client_private_key_path);
          console.log('[Database Test] Client private key loaded successfully');
        } catch (error) {
          console.error('[Database Test] Failed to read client private key:', error);
          return {
            success: false,
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
      connectTimeout: 10000, // 10 seconds timeout
    };

    if (params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable') {
      connectionConfig.ssl = sslOptions;
      console.log('[Database Test] SSL configuration applied');
    }

    console.log('[Database Test] Creating MySQL connection with config:', {
      host: connectionConfig.host,
      port: connectionConfig.port,
      database: connectionConfig.database,
      user: connectionConfig.user,
      hasPassword: !!connectionConfig.password,
      hasSsl: !!connectionConfig.ssl,
    });

    console.log('[Database Test] Attempting to connect to MySQL...');
    connection = await mysql.createConnection(connectionConfig);
    console.log('[Database Test] MySQL connection established successfully');

    // Test connection
    console.log('[Database Test] Executing test query: SELECT 1');
    await connection.query('SELECT 1');
    console.log('[Database Test] Test query executed successfully');

    console.log('[Database Test] MySQL connection test completed successfully');
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    console.error('[Database Test] MySQL connection test failed:', error);
    console.error('[Database Test] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (connection) {
      try {
        console.log('[Database Test] Closing MySQL connection...');
        await connection.end();
        console.log('[Database Test] MySQL connection closed');
      } catch (err) {
        console.error('[Database Test] Error closing MySQL connection:', err);
        // Ignore cleanup errors
      }
    }
    if (sshCleanup) {
      try {
        console.log('[Database Test] Cleaning up SSH tunnel...');
        sshCleanup();
        console.log('[Database Test] SSH tunnel cleaned up');
      } catch (err) {
        console.error('[Database Test] Error cleaning up SSH tunnel:', err);
      }
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
    console.log('[Database Test] Testing MSSQL connection...');
    console.log('[Database Test] Connection params:', {
      host: params.host,
      port: params.port,
      database: params.db_name,
      user: params.username,
      securityType: params.security_type,
    });

    let connectHost = params.host;
    let connectPort = params.port;

    // Setup SSH tunnel if needed
    if (params.security_type === 'ssh') {
      console.log('[Database Test] Setting up SSH tunnel...');
      if (!params.ssh_host || !params.ssh_port || !params.ssh_username || !params.ssh_auth_method) {
        console.error('[Database Test] SSH configuration is incomplete');
        return {
          success: false,
          error: 'SSH configuration is incomplete',
        };
      }

      try {
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
        
        console.log('[Database Test] SSH tunnel established on local port:', tunnel.localPort);
        sshCleanup = tunnel.cleanup;
        connectHost = '127.0.0.1';
        connectPort = tunnel.localPort;
      } catch (sshError) {
        console.error('[Database Test] SSH tunnel setup failed:', sshError);
        throw sshError;
      }
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
        encrypt: params.security_type === 'ssl' && params.ssl_mode && params.ssl_mode !== 'disable' && params.ssl_mode !== 'allow',
        trustServerCertificate: params.ssl_mode === 'require' || params.ssl_mode === 'prefer' || params.ssl_mode === 'disable' || params.ssl_mode === 'allow',
      },
    };

    // Note: MSSQL SSL configuration with custom certificates requires advanced TLS setup
    // The options.encrypt flag enables SSL/TLS encryption
    if (params.ca_certificate_path) {
      // MSSQL uses system CA store by default
      // Custom CA certificates require Node.js TLS context configuration (advanced)
      console.log('[Database Test] MSSQL custom CA certificate specified (requires advanced TLS setup)');
    }

    console.log('[Database Test] Creating MSSQL connection pool with config:', {
      server: options.server,
      port: options.port,
      database: options.database,
      user: options.user,
      hasPassword: !!options.password,
      encrypt: options.options.encrypt,
      trustServerCertificate: options.options.trustServerCertificate,
    });

    console.log('[Database Test] Attempting to connect to MSSQL...');
    pool = await sql.connect(options);
    console.log('[Database Test] MSSQL connection pool established successfully');

    // Test connection
    console.log('[Database Test] Executing test query: SELECT 1');
    await pool.request().query('SELECT 1');
    console.log('[Database Test] Test query executed successfully');

    console.log('[Database Test] MSSQL connection test completed successfully');
    return {
      success: true,
      message: 'Database connection successful',
    };
  } catch (error) {
    console.error('[Database Test] MSSQL connection test failed:', error);
    console.error('[Database Test] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      number: (error as any)?.number,
      state: (error as any)?.state,
      class: (error as any)?.class,
      serverName: (error as any)?.serverName,
      procName: (error as any)?.procName,
      lineNumber: (error as any)?.lineNumber,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  } finally {
    if (pool) {
      try {
        console.log('[Database Test] Closing MSSQL connection pool...');
        await pool.close();
        console.log('[Database Test] MSSQL connection pool closed');
      } catch (err) {
        console.error('[Database Test] Error closing MSSQL connection pool:', err);
        // Ignore cleanup errors
      }
    }
    if (sshCleanup) {
      try {
        console.log('[Database Test] Cleaning up SSH tunnel...');
        sshCleanup();
        console.log('[Database Test] SSH tunnel cleaned up');
      } catch (err) {
        console.error('[Database Test] Error cleaning up SSH tunnel:', err);
      }
    }
  }
}

/**
 * Test database connection handler
 */
async function testDatabaseConnection(params: DatabaseConnectionTestParams): Promise<TestConnectionResult> {
  console.log('[Database Test] ========================================');
  console.log('[Database Test] Starting database connection test');
  console.log('[Database Test] Database type:', params.db_type);
  
  // Basic validation
  if (!params.db_type) {
    console.error('[Database Test] Validation failed: Database type is required');
    return {
      success: false,
      error: 'Database type is required',
    };
  }

  if (!params.host || !params.host.trim()) {
    console.error('[Database Test] Validation failed: Host is required');
    return {
      success: false,
      error: 'Host is required',
    };
  }

  if (!params.port || params.port <= 0 || params.port > 65535) {
    console.error('[Database Test] Validation failed: Invalid port:', params.port);
    return {
      success: false,
      error: 'Port must be a number between 1 and 65535',
    };
  }

  if (!params.db_name || !params.db_name.trim()) {
    console.error('[Database Test] Validation failed: Database name is required');
    return {
      success: false,
      error: 'Database name is required',
    };
  }

  if (!params.username || !params.username.trim()) {
    console.error('[Database Test] Validation failed: Username is required');
    return {
      success: false,
      error: 'Username is required',
    };
  }

  if (params.password === undefined || params.password === null) {
    console.error('[Database Test] Validation failed: Password is required');
    return {
      success: false,
      error: 'Password is required',
    };
  }

  console.log('[Database Test] Validation passed, proceeding with connection test');

  // Test connection based on database type
  try {
    let result: TestConnectionResult;
    switch (params.db_type) {
      case 'postgres':
        result = await testPostgresConnection(params);
        break;
      
      case 'mysql':
      case 'mariadb':
        result = await testMysqlConnection(params);
        break;
      
      case 'mssql':
        result = await testMssqlConnection(params);
        break;
      
      case 'sqlite':
        console.error('[Database Test] SQLite is not supported');
        result = {
          success: false,
          error: 'SQLite connection testing is not supported in this function',
        };
        break;
      
      default:
        console.error('[Database Test] Unsupported database type:', params.db_type);
        result = {
          success: false,
          error: `Unsupported database type: ${params.db_type}`,
        };
        break;
    }
    
    console.log('[Database Test] Test result:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('[Database Test] ========================================');
    return result;
  } catch (error) {
    console.error('[Database Test] Unexpected error in testDatabaseConnection:', error);
    console.error('[Database Test] Error stack:', error instanceof Error ? error.stack : undefined);
    console.log('[Database Test] ========================================');
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
    console.log('[Database Test IPC] Received test connection request');
    try {
      const result = await testDatabaseConnection(params);
      console.log('[Database Test IPC] Test completed, returning result');
      return result;
    } catch (error) {
      console.error('[Database Test IPC] Unhandled error:', error);
      console.error('[Database Test IPC] Error stack:', error instanceof Error ? error.stack : undefined);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });
}

