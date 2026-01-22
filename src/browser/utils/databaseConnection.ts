import fs from 'fs';
import os from 'os';
import path from 'path';
import { Connection, ConnectionType } from '../types';
import { ConnectionParams } from '../../main/services/databaseService';

const tmpDir = os.tmpdir();

function extractBase64Content(content?: string): string | undefined {
  if (!content) return undefined;
  if (content.startsWith('data:')) {
    const commaIndex = content.indexOf(',');
    if (commaIndex >= 0) {
      return content.substring(commaIndex + 1);
    }
  }
  return content;
}

function base64ToTempFile(base64Content: string | undefined, filename: string): string | undefined {
  if (!base64Content) return undefined;
  try {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const filePath = path.join(tmpDir, `rikkei-db-${timestamp}-${random}-${filename}.pem`);
    const normalized = extractBase64Content(base64Content);
    if (!normalized) return undefined;
    fs.writeFileSync(filePath, Buffer.from(normalized, 'base64'));
    return filePath;
  } catch {
    return undefined;
  }
}

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

export function cleanupTempFiles(filePaths: Array<string | undefined>): void {
  filePaths.forEach(filePath => {
    if (!filePath) return;
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }
  });
}

export function connectionToIpcParams(connection: Connection): {
  params: ConnectionParams;
  tempFiles: Array<string | undefined>;
} {
  const tempFiles: Array<string | undefined> = [];

  const params: ConnectionParams = {
    db_type: connectionTypeToString(connection.db_type),
    host: connection.host,
    port: Number(connection.port),
    db_name: connection.db_name || '',
    username: connection.username,
    password: connection.password,
  };

  if (connection.security_type) {
    params.security_type = connection.security_type;
  }

  if (connection.security_type === 'ssl') {
    if (connection.ssl_mode) {
      params.ssl_mode = connection.ssl_mode;
    }
    const caPath = base64ToTempFile(connection.ca_certificate, 'ca-cert');
    const clientCertPath = base64ToTempFile(connection.client_certificate, 'client-cert');
    const clientKeyPath = base64ToTempFile(connection.client_private_key, 'client-key');
    tempFiles.push(caPath, clientCertPath, clientKeyPath);
    if (caPath) params.ca_certificate_path = caPath;
    if (clientCertPath) params.client_certificate_path = clientCertPath;
    if (clientKeyPath) params.client_private_key_path = clientKeyPath;
    if (connection.ssl_key_passphrase) {
      params.ssl_key_passphrase = connection.ssl_key_passphrase;
    }
  }

  if (connection.security_type === 'ssh') {
    if (connection.ssh_host) params.ssh_host = connection.ssh_host;
    if (connection.ssh_port) params.ssh_port = connection.ssh_port;
    if (connection.ssh_username) params.ssh_username = connection.ssh_username;
    if (connection.ssh_auth_method) params.ssh_auth_method = connection.ssh_auth_method;
    const sshKeyPath = base64ToTempFile(connection.ssh_private_key, 'ssh-key');
    tempFiles.push(sshKeyPath);
    if (sshKeyPath) params.ssh_private_key_path = sshKeyPath;
    if (connection.ssh_key_passphrase) params.ssh_key_passphrase = connection.ssh_key_passphrase;
    if (connection.ssh_password) params.ssh_password = connection.ssh_password;
    if (connection.local_port !== undefined) params.local_port = connection.local_port;
  }

  return { params, tempFiles };
}
