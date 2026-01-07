// Connection types for DB-Diff

export type ConnectionType = "sqlite" | "mysql";

export interface BaseConnection {
    id: string;
    name: string;
    type: ConnectionType;
    createdAt: string;
    lastUsed?: string;
    color?: string;
}

export interface SQLiteConnection extends BaseConnection {
    type: "sqlite";
    filePath: string;
}

export interface MySQLConnection extends BaseConnection {
    type: "mysql";
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    // SSH tunnel config (optional)
    ssh?: {
        enabled: boolean;
        // Mode 1: SSH Config Alias (uses ~/.ssh/config)
        configAlias?: string;
        // Mode 2: Manual SSH config
        host?: string;
        port?: number;
        username?: string;
        privateKeyPath?: string;
        passphrase?: string; // For encrypted private keys
        password?: string; // Password auth fallback
    };
}

export type Connection = SQLiteConnection | MySQLConnection;

export interface ConnectionStatus {
    connectionId: string;
    status: "disconnected" | "connecting" | "connected" | "error";
    error?: string;
}

// Database schema types
export interface TableInfo {
    name: string;
    rowCount: number;
    columns: ColumnInfo[];
}

export interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    defaultValue?: string;
}

export interface DatabaseSchema {
    connectionId: string;
    name: string;
    tables: TableInfo[];
}

// Diff types
export type DiffStatus = "added" | "deleted" | "modified" | "unchanged";

export interface CellDiff {
    column: string;
    sourceValue: unknown;
    targetValue: unknown;
    status: DiffStatus;
}

export interface RowDiff {
    primaryKey: string;
    status: DiffStatus;
    sourceRow?: Record<string, unknown>;
    targetRow?: Record<string, unknown>;
    cellDiffs: CellDiff[];
}

export interface TableDiffResult {
    sourceConnection: string;
    targetConnection: string;
    targetConnectionType: ConnectionType;
    tableName: string;
    primaryKeyColumn: string;
    columns: string[];
    rows: RowDiff[];
    summary: {
        added: number;
        deleted: number;
        modified: number;
        unchanged: number;
        total: number;
    };
}

export interface DiffSelection {
    sourceConnectionId: string | null;
    sourceTableName: string | null;
    targetConnectionId: string | null;
    targetTableName: string | null;
}
