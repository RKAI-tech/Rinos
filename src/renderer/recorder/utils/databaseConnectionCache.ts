import { Connection } from "../types/actions";

const connectionCache: Record<string, Connection> = {};

export function setConnectionCache(connections: Connection[]) {
  if (!Array.isArray(connections)) return;
  for (const conn of connections) {
    if (conn && conn.connection_id) {
      connectionCache[String(conn.connection_id)] = conn;
    }
  }
}

export function getConnectionFromCache(connectionId?: string): Connection | undefined {
  if (!connectionId) return undefined;
  return connectionCache[String(connectionId)];
}

export function hydrateConnectionFromCache(connection?: Connection): Connection | undefined {
  if (!connection) return connection;
  const cached = getConnectionFromCache(connection.connection_id);
  if (!cached) return connection;
  // Keep values from action if present, fill missing from cache
  return { ...cached, ...connection };
}
