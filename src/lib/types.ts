// Connection types for DB-Diff

export type ConnectionType = "sqlite" | "mysql";

export interface BaseConnection {
	id: string;
	name: string;
	type: ConnectionType;
	createdAt: string;
	lastUsed?: string;
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
		host: string;
		port: number;
		username: string;
		privateKeyPath?: string;
		password?: string;
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
