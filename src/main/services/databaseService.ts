import pg from 'pg';
import mysql from 'mysql2/promise';
import sql from 'mssql';

const { Pool: PgPool } = pg;

export interface ConnectionParams {
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
 * Execute query on database
 */
export async function executeQuery(params: ConnectionParams, query: string): Promise<ExecuteQueryResult> {
  const { db_type, host, port, db_name, username, password } = params;

  if (!query || !query.trim()) {
    return { success: false, data: [], error: 'Query is required' };
  }

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
          const result = await client.query(query);
          // Convert rows to plain objects
          const data = result.rows.map(row => {
            const obj: any = {};
            for (const key in row) {
              obj[key] = row[key];
            }
            return obj;
          });
          return { success: true, data };
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
        } finally {
          await pool.close();
        }
      } catch (err) {
        throw err;
      }
    } else {
      return { success: false, data: [], error: `Unsupported database type: ${db_type}` };
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
