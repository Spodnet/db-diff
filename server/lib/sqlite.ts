import Database from "better-sqlite3";
import type { ColumnInfo, TableInfo } from "../../src/lib/types";
import type { FkCascadeMapping, MergeOperation } from "./mergeTypes";

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
        .all() as {
        name: string;
    }[];

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

export function executeSQLiteStatements(
    connectionId: string,
    statements: string[],
): { success: boolean; error?: string } {
    const db = connections.get(connectionId);
    if (!db) {
        throw new Error("Connection not found");
    }

    const transaction = db.transaction((stmts: string[]) => {
        for (const stmt of stmts) {
            db.prepare(stmt).run();
        }
    });

    try {
        transaction(statements);
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

export interface InsertAsNewOperation {
    sql: string;
    originalPK: string;
}

// Execute merge with FK cascade support for SQLite
export function executeSQLiteWithCascade(
    connectionId: string,
    regularStatements: string[],
    insertAsNewOps: InsertAsNewOperation[],
    fkCascadeChain: FkCascadeMapping[],
): { success: boolean; error?: string; newIdMap?: Record<string, number> } {
    const db = connections.get(connectionId);
    if (!db) {
        throw new Error("Connection not found");
    }

    const newIdMap: Record<string, number> = {};

    const transaction = db.transaction(() => {
        // 1. Execute regular statements first
        for (const stmt of regularStatements) {
            db.prepare(stmt).run();
        }

        // 2. Execute insert-as-new operations and capture new IDs
        for (const op of insertAsNewOps) {
            const result = db.prepare(op.sql).run();
            newIdMap[op.originalPK] = result.lastInsertRowid as number;
        }

        // 3. Execute FK cascades recursively
        for (const cascade of fkCascadeChain) {
            executeCascadeInsertsSQLite(db, cascade, newIdMap);
        }
    });

    try {
        transaction();
        return { success: true, newIdMap };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// Recursively copy linked rows for SQLite
function executeCascadeInsertsSQLite(
    db: Database.Database,
    cascade: FkCascadeMapping,
    idMap: Record<string, number>,
): void {
    for (const [oldPK, newPK] of Object.entries(idMap)) {
        // Get columns for the table
        const columnsResult = db
            .prepare(`PRAGMA table_info("${cascade.table}")`)
            .all() as { name: string; pk: number }[];

        // Find the PK column
        const pkCol = columnsResult.find((c) => c.pk === 1);
        const pkColName = pkCol?.name;

        // Get all non-PK column names
        const nonPkCols = columnsResult
            .filter((c) => c.pk !== 1)
            .map((c) => c.name);

        if (nonPkCols.length === 0) continue;

        // Get the rows to copy
        const rowsToCopy = db
            .prepare(
                `SELECT * FROM "${cascade.table}" WHERE "${cascade.column}" = ?`,
            )
            .all(oldPK) as Record<string, unknown>[];

        // Track new IDs for child cascades
        const childIdMap: Record<string, number> = {};

        // Copy each row with the FK updated to the new ID
        for (const row of rowsToCopy) {
            const oldRowPK = pkColName ? String(row[pkColName]) : null;

            // Build INSERT with new FK value
            const cols = nonPkCols.map((c) => `"${c}"`).join(", ");
            const vals = nonPkCols
                .map((c) => {
                    const val = row[c];
                    if (c === cascade.column) {
                        return newPK; // Replace FK with new ID
                    }
                    if (val === null) return "NULL";
                    if (typeof val === "number") return val;
                    // Handle Date objects - format for SQLite
                    if (val instanceof Date) {
                        return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
                    }
                    if (typeof val === "object")
                        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return `'${String(val).replace(/'/g, "''")}'`;
                })
                .join(", ");

            const result = db
                .prepare(
                    `INSERT INTO "${cascade.table}" (${cols}) VALUES (${vals})`,
                )
                .run();

            // Capture new ID for child cascades
            if (oldRowPK && cascade.children.length > 0) {
                childIdMap[oldRowPK] = result.lastInsertRowid as number;
            }
        }

        // Recurse for child cascades
        for (const childCascade of cascade.children) {
            executeCascadeInsertsSQLite(db, childCascade, childIdMap);
        }
    }
}

// ============================================================================
// Server-side SQL generation (Phase 1 Security Hardening)
// ============================================================================

/**
 * Format a value for SQLite SQL safely
 */
function formatValueForSQL(value: unknown): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";

    // Handle Date objects
    if (value instanceof Date) {
        return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
    }

    // Handle objects (e.g., JSON columns)
    if (typeof value === "object") {
        const jsonStr = JSON.stringify(value);
        return `'${jsonStr.replace(/'/g, "''")}'`;
    }

    if (typeof value === "string") {
        // Escape single quotes
        return `'${value.replace(/'/g, "''")}'`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Get all table names for a SQLite database (single query)
 */
function getAllTableNames(db: Database.Database): Set<string> {
    const tables = db
        .prepare(
            `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        )
        .all() as { name: string }[];

    return new Set(tables.map((t) => t.name));
}

/**
 * Get all column names for a table (single query)
 */
function getTableColumns(
    db: Database.Database,
    tableName: string,
): Set<string> {
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all() as {
        name: string;
    }[];
    return new Set(columns.map((c) => c.name));
}

/**
 * Validate that a table name exists in the SQLite database
 * (kept for external use, but prefer getAllTableNames for batch validation)
 */
export function validateTableName(
    connectionId: string,
    tableName: string,
): boolean {
    const db = connections.get(connectionId);
    if (!db) {
        throw new Error("Connection not found");
    }

    const tables = getAllTableNames(db);
    return tables.has(tableName);
}

/**
 * Build SQL statement from a MergeOperation
 */
function buildMergeSQL(op: MergeOperation): string {
    const {
        type,
        tableName,
        primaryKeyColumn,
        primaryKeyValue,
        columns,
        values,
        isInsertAsNew,
    } = op;

    switch (type) {
        case "insert": {
            if (!columns || !values) {
                throw new Error("Insert operation requires columns and values");
            }
            const cols = isInsertAsNew
                ? columns.filter((c) => c !== primaryKeyColumn)
                : columns;
            const vals = cols.map((c) => formatValueForSQL(values[c]));
            return `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")})`;
        }
        case "update": {
            if (!values) {
                throw new Error("Update operation requires values");
            }
            const setClauses = Object.entries(values)
                .map(([col, val]) => `"${col}" = ${formatValueForSQL(val)}`)
                .join(", ");
            return `UPDATE "${tableName}" SET ${setClauses} WHERE "${primaryKeyColumn}" = ${formatValueForSQL(primaryKeyValue)}`;
        }
        case "delete": {
            return `DELETE FROM "${tableName}" WHERE "${primaryKeyColumn}" = ${formatValueForSQL(primaryKeyValue)}`;
        }
        default:
            throw new Error(`Unknown operation type: ${type}`);
    }
}

/**
 * Execute merge operations with server-side SQL generation
 */
export function executeMergeOperations(
    connectionId: string,
    operations: MergeOperation[],
    fkCascadeChain?: FkCascadeMapping[],
): { success: boolean; error?: string; newIdMap?: Record<string, number> } {
    if (operations.length === 0) {
        return { success: true };
    }

    const db = connections.get(connectionId);
    if (!db) {
        throw new Error("Connection not found");
    }

    const newIdMap: Record<string, number> = {};

    // Fetch all valid tables once
    const validTables = getAllTableNames(db);

    // Validate all table names
    const requiredTables = [...new Set(operations.map((op) => op.tableName))];
    for (const tn of requiredTables) {
        if (!validTables.has(tn)) {
            return { success: false, error: `Invalid table name: ${tn}` };
        }
    }

    // Fetch columns for each table once and validate column names
    const tableColumnsMap = new Map<string, Set<string>>();
    for (const tn of requiredTables) {
        const columns = getTableColumns(db, tn);
        tableColumnsMap.set(tn, columns);
    }

    // Validate all column references
    for (const op of operations) {
        const validColumns = tableColumnsMap.get(op.tableName);
        if (!validColumns) continue;

        // Validate primary key column
        if (!validColumns.has(op.primaryKeyColumn)) {
            return {
                success: false,
                error: `Invalid column: ${op.primaryKeyColumn} in table ${op.tableName}`,
            };
        }

        // Validate columns array if present
        if (op.columns) {
            for (const col of op.columns) {
                if (!validColumns.has(col)) {
                    return {
                        success: false,
                        error: `Invalid column: ${col} in table ${op.tableName}`,
                    };
                }
            }
        }

        // Validate value keys if present
        if (op.values) {
            for (const col of Object.keys(op.values)) {
                if (!validColumns.has(col)) {
                    return {
                        success: false,
                        error: `Invalid column: ${col} in table ${op.tableName}`,
                    };
                }
            }
        }
    }

    const transaction = db.transaction(() => {
        // Separate regular operations from insert-as-new operations
        const regularOps = operations.filter((op) => !op.isInsertAsNew);
        const insertAsNewOps = operations.filter((op) => op.isInsertAsNew);

        // Execute regular operations
        for (const op of regularOps) {
            const sql = buildMergeSQL(op);
            db.prepare(sql).run();
        }

        // Execute insert-as-new operations and capture new IDs
        for (const op of insertAsNewOps) {
            const sql = buildMergeSQL(op);
            const result = db.prepare(sql).run();
            newIdMap[String(op.primaryKeyValue)] =
                result.lastInsertRowid as number;
        }

        // Execute FK cascades if present
        if (fkCascadeChain && fkCascadeChain.length > 0) {
            for (const cascade of fkCascadeChain) {
                executeCascadeInsertsSQLite(db, cascade, newIdMap);
            }
        }
    });

    try {
        transaction();
        return {
            success: true,
            newIdMap: Object.keys(newIdMap).length > 0 ? newIdMap : undefined,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
