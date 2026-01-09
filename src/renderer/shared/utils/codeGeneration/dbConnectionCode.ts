// Database connection code generation
// Ported from downloads/db_connection_code.txt

import { Connection } from '../../types/actions';

export function checkNeedConnectDb(actions: any[]): boolean {
  for (const action of actions) {
    if (action.action_datas) {
      for (const actionData of action.action_datas) {
        if (actionData.statement) {
          // Handle both query and statement_text field names
          const statement = actionData.statement as any;
          const query = statement.query || statement.statement_text;
          if (query) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

/**
 * Check if connection needs SSH tunnel
 */
function needsSshTunnel(connection: Connection): boolean {
  return connection.security_type === 'ssh' && 
         !!connection.ssh_host && 
         !!connection.ssh_username && 
         !!connection.ssh_auth_method;
}

/**
 * Generate SSH tunnel setup code
 */
function generateSshTunnelCode(connection: Connection, dbVar: string): string {
  const sshHost = connection.ssh_host || '';
  const sshPort = connection.ssh_port || 22;
  const sshUsername = connection.ssh_username || '';
  const sshAuthMethod = connection.ssh_auth_method || 'private_key';
  const localPort = connection.local_port === 'Auto' || !connection.local_port ? 0 : connection.local_port;
  const dbHost = connection.host || '';
  const dbPort = connection.port || 5432;
  const sshTunnelVar = `${dbVar}SshTunnel`;
  
  let authConfig = '';
  if (sshAuthMethod === 'private_key' && connection.ssh_private_key) {
    // Base64 encoded private key needs to be decoded
    const privateKeyBase64 = connection.ssh_private_key;
    const privateKeyContent = `Buffer.from('${privateKeyBase64}', 'base64').toString('utf8')`;
    authConfig = `privateKey: ${privateKeyContent}`;
    if (connection.ssh_key_passphrase) {
      authConfig += `,\n        passphrase: '${connection.ssh_key_passphrase.replace(/'/g, "\\'")}'`;
    }
  } else if (sshAuthMethod === 'password' && connection.ssh_password) {
    const sshPassword = connection.ssh_password || '';
    authConfig = `password: '${sshPassword.replace(/'/g, "\\'")}'`;
  } else {
    // No valid auth method
    return '';
  }

  return `
      // Setup SSH tunnel
      const ${sshTunnelVar} = new SshClient();
      const sshTunnelConfig = {
        host: '${sshHost}',
        port: ${sshPort},
        username: '${sshUsername}',
        ${authConfig}
      };
      
      await new Promise((resolve, reject) => {
        ${sshTunnelVar}.on('error', (err) => reject(err));
        ${sshTunnelVar}.on('ready', () => {
          const localServer = net.createServer((localSocket) => {
            ${sshTunnelVar}.forwardOut(
              localSocket.remoteAddress || '127.0.0.1',
              localSocket.remotePort || 0,
              '${dbHost}',
              ${dbPort},
              (err, stream) => {
                if (err) {
                  localSocket.end();
                  return;
                }
                localSocket.pipe(stream);
                stream.pipe(localSocket);
              }
            );
          });
          localServer.listen(${localPort}, '127.0.0.1', () => {
            const address = localServer.address();
            ${sshTunnelVar}.localPort = (address && typeof address === 'object') ? address.port : ${localPort};
            ${sshTunnelVar}.cleanup = () => {
              localServer.close();
              ${sshTunnelVar}.end();
            };
            resolve(${sshTunnelVar}.localPort);
          });
          localServer.on('error', (err) => {
            ${sshTunnelVar}.end();
            reject(err);
          });
        });
        ${sshTunnelVar}.connect(sshTunnelConfig);
      });
      `;
}

/**
 * Generate SSL configuration for PostgreSQL
 */
function generatePostgresSslConfig(connection: Connection): string {
  if (connection.security_type !== 'ssl' || !connection.ssl_mode || connection.ssl_mode === 'disable') {
    return 'ssl: false';
  }

  const sslConfig: string[] = [];
  
  if (connection.ca_certificate) {
    sslConfig.push(`ca: Buffer.from('${connection.ca_certificate}', 'base64')`);
  }
  
  if (connection.client_certificate) {
    sslConfig.push(`cert: Buffer.from('${connection.client_certificate}', 'base64')`);
  }
  
  if (connection.client_private_key) {
    sslConfig.push(`key: Buffer.from('${connection.client_private_key}', 'base64')`);
    if (connection.ssl_key_passphrase) {
      sslConfig.push(`passphrase: '${connection.ssl_key_passphrase.replace(/'/g, "\\'")}'`);
    }
  }

  // Map ssl_mode to rejectUnauthorized
  if (connection.ssl_mode === 'require' || connection.ssl_mode === 'verify-ca' || connection.ssl_mode === 'verify-full') {
    sslConfig.push('rejectUnauthorized: true');
  } else {
    sslConfig.push('rejectUnauthorized: false');
  }

  return sslConfig.length > 0 ? `ssl: {\n        ${sslConfig.join(',\n        ')}\n      }` : 'ssl: false';
}

/**
 * Generate SSL configuration for MySQL
 */
function generateMysqlSslConfig(connection: Connection): string {
  if (connection.security_type !== 'ssl' || !connection.ssl_mode || connection.ssl_mode === 'disable') {
    return '';
  }

  const sslConfig: string[] = [];
  
  if (connection.ca_certificate) {
    sslConfig.push(`ca: Buffer.from('${connection.ca_certificate}', 'base64')`);
  }
  
  if (connection.client_certificate) {
    sslConfig.push(`cert: Buffer.from('${connection.client_certificate}', 'base64')`);
  }
  
  if (connection.client_private_key) {
    sslConfig.push(`key: Buffer.from('${connection.client_private_key}', 'base64')`);
  }

  return sslConfig.length > 0 ? `ssl: {\n        ${sslConfig.join(',\n        ')}\n      }` : '';
}

/**
 * Generate SSL configuration for MSSQL
 */
function generateMssqlSslConfig(connection: Connection): string {
  if (connection.security_type !== 'ssl' || !connection.ssl_mode || connection.ssl_mode === 'disable') {
    return `encrypt: false,\n        trustServerCertificate: true`;
  }

  const options: string[] = [`encrypt: true`];
  
  if (connection.ssl_mode === 'require') {
    options.push('trustServerCertificate: true');
  } else {
    options.push('trustServerCertificate: false');
  }

  // MSSQL SSL certificates would go in options if needed
  // Note: mssql library handles certificates differently, this is a simplified version
  if (connection.ca_certificate) {
    options.push(`ca: Buffer.from('${connection.ca_certificate}', 'base64')`);
  }

  return options.join(',\n        ');
}

export function generateConnectDbCode(connection: Connection | null | undefined): [string, string] {
  /**
   * Generate JS code to connect to a database based on connection info.
   * Returns [connectCode, dbVar]
   */
  if (!connection) {
    return ['', 'db'];
  }

  const dbType = connection.db_type;
  const dbVar = String(dbType).toLowerCase() + 'DB';
  const host = connection.host || '';
  const port = connection.port || (dbType === 'mssql' ? 1433 : dbType === 'mysql' ? 3306 : 5432);
  const dbName = connection.db_name || '';
  const username = connection.username || '';
  const password = connection.password || '';
  
  const hasSshTunnel = needsSshTunnel(connection);
  const actualHost = hasSshTunnel ? '127.0.0.1' : host;
  const actualPort = hasSshTunnel ? `${dbVar}SshTunnel.localPort` : port;
  const sshTunnelCode = hasSshTunnel ? generateSshTunnelCode(connection, dbVar) : '';
  const sshTunnelVar = hasSshTunnel ? `${dbVar}SshTunnel` : '';
  const cleanupCode = hasSshTunnel ? `\n      if (${sshTunnelVar}.cleanup) ${sshTunnelVar}.cleanup();` : '';

  if (dbType === 'postgres') {
    const sslConfig = generatePostgresSslConfig(connection);
    const dbConfig = `{
        host: '${actualHost}',
        port: ${actualPort},
        database: '${dbName}',
        user: '${username}',
        password: '${password}',
        ${sslConfig}
      }`;
    return [
      `${sshTunnelCode}      const ${dbVar} = new PgClient(${dbConfig});\n      await ${dbVar}.connect();${cleanupCode}`,
      dbVar
    ];
  } else if (dbType === 'mysql') {
    const sslConfig = generateMysqlSslConfig(connection);
    const dbConfig = `{
        host: '${actualHost}',
        port: ${actualPort},
        database: '${dbName}',
        user: '${username}',
        password: '${password}'${sslConfig ? ',\n        ' + sslConfig : ''}
      }`;
    return [
      `${sshTunnelCode}      const ${dbVar} = await mysql.createConnection(${dbConfig});\n      ${dbVar}.query = async (q) => { const [rows] = await ${dbVar}.execute(q); return { rows }; };\n      ${dbVar}.end = async () => { await ${dbVar}.close();${cleanupCode} };\n`,
      dbVar
    ];
  } else if (dbType === 'mssql') {
    const sslConfig = generateMssqlSslConfig(connection);
    const dbConfig = `{
        server: '${actualHost}',
        port: ${actualPort},
        database: '${dbName}',
        user: '${username}',
        password: '${password}',
        options: { ${sslConfig} }
      }`;
    return [
      `${sshTunnelCode}      var ${dbVar} = await sql.connect(${dbConfig});\n      ${dbVar}.query = async (q) => { const result = await ${dbVar}.request().query(q); return { rows: result.recordset }; };\n      ${dbVar}.end = async () => { await ${dbVar}.close();${cleanupCode} };\n`,
      dbVar
    ];
  } else {
    // Unsupported db type
    return ['', ''];
  }
}
