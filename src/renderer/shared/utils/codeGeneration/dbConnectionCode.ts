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
  const port = connection.port || '';
  const dbName = connection.db_name || '';
  const username = connection.username || '';
  const password = connection.password || '';

  if (dbType === 'postgres') {
    const dbConfig = `{
        host: '${host}',
        port: '${port}',
        database: '${dbName}',
        user: '${username}',
        password: '${password}',
      }`;
    return [
      `const ${dbVar} = new PgClient(${dbConfig});\n      await ${dbVar}.connect();\n`,
      dbVar
    ];
  } else if (dbType === 'mysql') {
    const dbConfig = `{
        host: '${host}',
        port: '${port}',
        database: '${dbName}',
        user: '${username}',
        password: '${password}',
      }`;
    return [
      `const ${dbVar} = await mysql.createConnection(${dbConfig});\n      ${dbVar}.query = async (q) => { const [rows] = await ${dbVar}.execute(q); return { rows }; };\n      ${dbVar}.end = async () => { await ${dbVar}.close(); };\n`,
      dbVar
    ];
  } else if (dbType === 'mssql') {
    const dbConfig = `{
        server: '${host}',
        port: ${port || '1433'},
        database: '${dbName}',
        user: '${username}',
        password: '${password}',
        options: { encrypt: true, trustServerCertificate: true },
      }`;
    return [
      `var ${dbVar} = await sql.connect(${dbConfig});\n      ${dbVar}.query = async (q) => { const result = await ${dbVar}.request().query(q); return { rows: result.recordset }; };\n      ${dbVar}.end = async () => { await ${dbVar}.close(); };\n`,
      dbVar
    ];
  } else {
    // Unsupported db type
    return ['', ''];
  }
}
