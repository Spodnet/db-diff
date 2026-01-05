import mysql from "mysql2/promise";
import type { ColumnInfo, TableInfo } from "../../src/lib/types";

// Store active MySQL connections
const connections = new Map<string, mysql.Connection>();

interface MySQLConfig {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
}

export async function connectMySQL(
	connectionId: string,
	config: MySQLConfig,
): Promise<{ success: boolean; error?: string }> {
	try {
		// Close existing connection if any
		if (connections.has(connectionId)) {
			await connections.get(connectionId)?.end();
		}

		const connection = await mysql.createConnection({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.user,
			password: config.password,
		});

		connections.set(connectionId, connection);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function disconnectMySQL(connectionId: string): Promise<void> {
	const connection = connections.get(connectionId);
	if (connection) {
		await connection.end();
		connections.delete(connectionId);
	}
}

export async function testMySQLConnection(config: MySQLConfig): Promise<{
	success: boolean;
	error?: string;
}> {
	let connection: mysql.Connection | null = null;
	try {
		connection = await mysql.createConnection({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.user,
			password: config.password,
			connectTimeout: 5000,
		});

		// Test with simple query
		await connection.execute("SELECT 1");
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	} finally {
		if (connection) {
			await connection.end();
		}
	}
}

export async function getMySQLTables(
	connectionId: string,
): Promise<TableInfo[]> {
	const connection = connections.get(connectionId);
	if (!connection) {
		throw new Error("Connection not found");
	}

	const [tables] =
		await connection.execute<mysql.RowDataPacket[]>("SHOW TABLES");

	const tableInfos: TableInfo[] = [];

	for (const table of tables) {
		const tableName = Object.values(table)[0] as string;

		const [countResult] = await connection.execute<mysql.RowDataPacket[]>(
			`SELECT COUNT(*) as count FROM \`${tableName}\``,
		);
		const rowCount = countResult[0].count;

		const [columnsResult] = await connection.execute<mysql.RowDataPacket[]>(
			`DESCRIBE \`${tableName}\``,
		);

		const columns: ColumnInfo[] = columnsResult.map((col) => ({
			name: col.Field,
			type: col.Type,
			nullable: col.Null === "YES",
			primaryKey: col.Key === "PRI",
			defaultValue: col.Default ?? undefined,
		}));

		tableInfos.push({
			name: tableName,
			rowCount,
			columns,
		});
	}

	return tableInfos;
}

export async function getMySQLTableData(
	connectionId: string,
	tableName: string,
	limit = 100,
	offset = 0,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
	const connection = connections.get(connectionId);
	if (!connection) {
		throw new Error("Connection not found");
	}

	const [countResult] = await connection.execute<mysql.RowDataPacket[]>(
		`SELECT COUNT(*) as count FROM \`${tableName}\``,
	);
	const total = countResult[0].count;

	const [rows] = await connection.execute<mysql.RowDataPacket[]>(
		`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`,
		[limit, offset],
	);

	return {
		rows: rows as Record<string, unknown>[],
		total,
	};
}

export function getConnection(
	connectionId: string,
): mysql.Connection | undefined {
	return connections.get(connectionId);
}
