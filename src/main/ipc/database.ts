import { ipcMain } from 'electron';
import { testConnection, executeQuery, ConnectionParams } from '../services/databaseService.js';

export function registerDatabaseIpc() {
  // Test database connection
  ipcMain.handle('database:test-connection', async (_event, params: ConnectionParams) => {
    try {
      return await testConnection(params);
    } catch (error: any) {
      return {
        success: false,
        message: 'Unexpected error occurred',
        error: error?.message || String(error),
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
