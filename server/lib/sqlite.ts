import Database from "better-sqlite3";
import type { ColumnInfo, TableInfo } from "../../src/lib/types";

// Store active SQLite connections
const connections = new Map<string, Database.Database>();

export function connectSQLite(
	connectionId: string,
	filePath: string,
): { success: boolean; error?: string } {
	try {
		// Close existing connection if any
		if (connections.has(connectionId)) {
			connections.get(connectionId)?.close();
		}

		const db = new Database(filePath, { readonly: false });
		connections.set(connectionId, db);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export function disconnectSQLite(connectionId: string): void {
	const db = connections.get(connectionId);
	if (db) {
		db.close();
		connections.delete(connectionId);
	}
}

export function testSQLiteConnection(filePath: string): {
	success: boolean;
	error?: string;
} {
	try {
		const db = new Database(filePath, { readonly: true });
		// Try a simple query to verify the database is valid
		db.prepare("SELECT 1").get();
		db.close();
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export function getSQLiteTables(connectionId: string): TableInfo[] {
	const db = connections.get(connectionId);
	if (!db) {
		throw new Error("Connection not found");
	}

	const tables = db
		.prepare(
			`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
		)
		.all() as { name: string }[];

	return tables.map((table) => {
		const countResult = db
			.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`)
			.get() as { count: number };

		const columnsResult = db
			.prepare(`PRAGMA table_info("${table.name}")`)
			.all() as {
			name: string;
			type: string;
			notnull: number;
			pk: number;
			dflt_value: string | null;
		}[];

		const columns: ColumnInfo[] = columnsResult.map((col) => ({
			name: col.name,
			type: col.type,
			nullable: col.notnull === 0,
			primaryKey: col.pk === 1,
			defaultValue: col.dflt_value ?? undefined,
		}));

		return {
			name: table.name,
			rowCount: countResult.count,
			columns,
		};
	});
}

export function getSQLiteTableData(
	connectionId: string,
	tableName: string,
	limit = 100,
	offset = 0,
): { rows: Record<string, unknown>[]; total: number } {
	const db = connections.get(connectionId);
	if (!db) {
		throw new Error("Connection not found");
	}

	const countResult = db
		.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`)
		.get() as { count: number };

	const rows = db
		.prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`)
		.all(limit, offset) as Record<string, unknown>[];

	return {
		rows,
		total: countResult.count,
	};
}

export function getConnection(
	connectionId: string,
): Database.Database | undefined {
	return connections.get(connectionId);
}
