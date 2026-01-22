import mysql from "mysql2/promise";
import type { ColumnInfo, TableInfo } from "../../src/lib/types";
import type { FkCascadeMapping, MergeOperation } from "./mergeTypes";
import { closeTunnel, createTunnel, type SSHConfig } from "./ssh-tunnel";

interface MySQLConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssh?: SSHConfig;
}

// Store active MySQL connections with their configs for reconnection
interface StoredConnection {
    connection: mysql.Connection;
    config: MySQLConfig;
    tunnelPort?: number;
}

const connections = new Map<string, StoredConnection>();

// Check if a connection is still alive
async function isConnectionAlive(conn: mysql.Connection): Promise<boolean> {
    try {
        await conn.ping();
        return true;
    } catch {
        return false;
    }
}

// Ensure connection is alive, reconnect if needed
async function ensureConnection(
    connectionId: string,
): Promise<mysql.Connection> {
    const stored = connections.get(connectionId);
    if (!stored) {
        throw new Error("Connection not found");
    }

    // Check if connection is alive
    if (await isConnectionAlive(stored.connection)) {
        return stored.connection;
    }

    // Connection is dead, attempt reconnect
    console.log(`Connection ${connectionId} is dead, attempting reconnect...`);

    try {
        // Clean up old connection
        try {
            await stored.connection.end();
        } catch {
            // Ignore cleanup errors
        }

        let connectHost = stored.config.host;
        let connectPort = stored.config.port;

        // Recreate SSH tunnel if needed
        if (stored.config.ssh?.enabled) {
            await closeTunnel(connectionId);
            const tunnelResult = await createTunnel(
                connectionId,
                stored.config.ssh,
                stored.config.host,
                stored.config.port,
            );

            if (!tunnelResult.success || !tunnelResult.localPort) {
                throw new Error(
                    `SSH tunnel reconnect failed: ${tunnelResult.error || "Unknown error"}`,
                );
            }

            connectHost = "127.0.0.1";
            connectPort = tunnelResult.localPort;
        }

        // Reconnect
        const newConnection = await mysql.createConnection({
            host: connectHost,
            port: connectPort,
            database: stored.config.database,
            user: stored.config.user,
            password: stored.config.password,
        });

        // Update stored connection
        stored.connection = newConnection;
        stored.tunnelPort = connectPort;
        console.log(`Connection ${connectionId} reconnected successfully`);

        return newConnection;
    } catch (error) {
        // Reconnect failed, remove from map
        connections.delete(connectionId);
        await closeTunnel(connectionId);
        throw new Error(
            `Reconnection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
}

export async function connectMySQL(
    connectionId: string,
    config: MySQLConfig,
): Promise<{ success: boolean; error?: string }> {
    try {
        // Close existing connection if any
        if (connections.has(connectionId)) {
            await disconnectMySQL(connectionId);
        }

        let connectHost = config.host;
        let connectPort = config.port;

        // If SSH is enabled, create tunnel first
        if (config.ssh?.enabled) {
            const tunnelResult = await createTunnel(
                connectionId,
                config.ssh,
                config.host,
                config.port,
            );

            if (!tunnelResult.success || !tunnelResult.localPort) {
                return {
                    success: false,
                    error: `SSH tunnel failed: ${tunnelResult.error || "Unknown error"}`,
                };
            }

            // Connect to localhost through the tunnel
            connectHost = "127.0.0.1";
            connectPort = tunnelResult.localPort;
        }

        const connection = await mysql.createConnection({
            host: connectHost,
            port: connectPort,
            database: config.database,
            user: config.user,
            password: config.password,
        });

        connections.set(connectionId, {
            connection,
            config,
            tunnelPort: connectPort,
        });
        return { success: true };
    } catch (error) {
        // Clean up tunnel if connection failed
        await closeTunnel(connectionId);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

export async function disconnectMySQL(connectionId: string): Promise<void> {
    const stored = connections.get(connectionId);
    if (stored) {
        try {
            await stored.connection.end();
        } catch {
            // Ignore cleanup errors
        }
        connections.delete(connectionId);
    }
    // Also close any SSH tunnel
    await closeTunnel(connectionId);
}

export async function testMySQLConnection(config: MySQLConfig): Promise<{
    success: boolean;
    error?: string;
}> {
    let connection: mysql.Connection | null = null;
    const testTunnelId = `test_${Date.now()}`;
    try {
        let connectHost = config.host;
        let connectPort = config.port;

        // If SSH is enabled, create tunnel first
        if (config.ssh?.enabled) {
            const tunnelResult = await createTunnel(
                testTunnelId,
                config.ssh,
                config.host,
                config.port,
            );

            if (!tunnelResult.success || !tunnelResult.localPort) {
                return {
                    success: false,
                    error: `SSH tunnel failed: ${tunnelResult.error || "Unknown error"}`,
                };
            }

            connectHost = "127.0.0.1";
            connectPort = tunnelResult.localPort;
        }

        connection = await mysql.createConnection({
            host: connectHost,
            port: connectPort,
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
        // Clean up test tunnel
        await closeTunnel(testTunnelId);
    }
}

export async function getMySQLTables(
    connectionId: string,
): Promise<TableInfo[]> {
    const connection = await ensureConnection(connectionId);

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

        const columns: ColumnInfo[] = columnsResult.map(
            (col: mysql.RowDataPacket) => ({
                name: col.Field,
                type: col.Type,
                nullable: col.Null === "YES",
                primaryKey: col.Key === "PRI",
                defaultValue: col.Default ?? undefined,
            }),
        );

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
    const connection = await ensureConnection(connectionId);

    const [countResult] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT COUNT(*) as count FROM \`${tableName}\``,
    );
    const total = countResult[0].count;

    const [rows] = await connection.query<mysql.RowDataPacket[]>(
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
    return connections.get(connectionId)?.connection;
}

export async function executeMySQLStatements(
    connectionId: string,
    statements: string[],
): Promise<{ success: boolean; error?: string }> {
    const connection = await ensureConnection(connectionId);

    try {
        await connection.beginTransaction();

        for (const stmt of statements) {
            await connection.execute(stmt);
        }

        await connection.commit();
        return { success: true };
    } catch (error) {
        await connection.rollback();
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

export interface InsertAsNewOperation {
    sql: string; // INSERT statement without PK
    originalPK: string; // Original primary key value
}

// Execute merge with FK cascade support
export async function executeMySQLWithCascade(
    connectionId: string,
    regularStatements: string[], // Regular UPDATE/DELETE/INSERT statements
    insertAsNewOps: InsertAsNewOperation[], // Insert-as-new operations needing ID capture
    fkCascadeChain: FkCascadeMapping[], // FK cascade mappings
): Promise<{
    success: boolean;
    error?: string;
    newIdMap?: Record<string, number>;
}> {
    const connection = await ensureConnection(connectionId);

    const newIdMap: Record<string, number> = {};

    try {
        await connection.beginTransaction();

        // 1. Execute regular statements first
        for (const stmt of regularStatements) {
            await connection.execute(stmt);
        }

        // 2. Execute insert-as-new operations and capture new IDs
        for (const op of insertAsNewOps) {
            await connection.execute(op.sql);

            // Get the last inserted ID
            const [result] = await connection.execute<mysql.RowDataPacket[]>(
                "SELECT LAST_INSERT_ID() as lastId",
            );
            const newId = result[0].lastId as number;
            newIdMap[op.originalPK] = newId;
        }

        // 3. Execute FK cascades recursively
        for (const cascade of fkCascadeChain) {
            await executeCascadeInserts(connection, cascade, newIdMap);
        }

        await connection.commit();
        return { success: true, newIdMap };
    } catch (error) {
        await connection.rollback();
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

// Recursively copy linked rows
async function executeCascadeInserts(
    connection: mysql.Connection,
    cascade: FkCascadeMapping,
    idMap: Record<string, number>,
): Promise<void> {
    // For each old→new ID mapping, copy linked rows
    for (const [oldPK, newPK] of Object.entries(idMap)) {
        // Get columns for the table
        const [columnsResult] = await connection.execute<mysql.RowDataPacket[]>(
            `DESCRIBE \`${cascade.table}\``,
        );

        // Find the primary key column
        const pkCol = columnsResult.find((c) => c.Key === "PRI");
        const pkColName = pkCol?.Field;

        // Get all non-PK column names
        const nonPkCols = columnsResult
            .filter((c) => c.Key !== "PRI")
            .map((c) => c.Field as string);

        if (nonPkCols.length === 0) continue;

        // Get the rows to copy
        const [rowsToCopy] = await connection.execute<mysql.RowDataPacket[]>(
            `SELECT * FROM \`${cascade.table}\` WHERE \`${cascade.column}\` = ?`,
            [oldPK],
        );

        // Track new IDs for child cascades
        const childIdMap: Record<string, number> = {};

        // Copy each row with the FK updated to the new ID
        for (const row of rowsToCopy) {
            const oldRowPK = pkColName ? String(row[pkColName]) : null;

            // Build INSERT with new FK value
            const cols = nonPkCols.map((c) => `\`${c}\``).join(", ");
            const vals = nonPkCols
                .map((c) => {
                    const val = row[c];
                    if (c === cascade.column) {
                        return newPK; // Replace FK with new ID
                    }
                    if (val === null) return "NULL";
                    if (typeof val === "number") return val;
                    // Handle Date objects - format for MySQL
                    if (val instanceof Date) {
                        return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`;
                    }
                    if (typeof val === "object")
                        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    return `'${String(val).replace(/'/g, "''")}'`;
                })
                .join(", ");

            await connection.execute(
                `INSERT INTO \`${cascade.table}\` (${cols}) VALUES (${vals})`,
            );

            // Capture new ID for child cascades
            if (oldRowPK && cascade.children.length > 0) {
                const [result] = await connection.execute<
                    mysql.RowDataPacket[]
                >("SELECT LAST_INSERT_ID() as lastId");
                childIdMap[oldRowPK] = result[0].lastId as number;
            }
        }

        // Recurse for child cascades
        for (const childCascade of cascade.children) {
            await executeCascadeInserts(connection, childCascade, childIdMap);
        }
    }
}

// ============================================================================
// Server-side SQL generation (Phase 1 Security Hardening)
// ============================================================================

/**
 * Format a value for MySQL SQL safely
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
        // Check for ISO date strings
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            try {
                const date = new Date(value);
                if (!Number.isNaN(date.getTime())) {
                    return `'${date.toISOString().slice(0, 19).replace("T", " ")}'`;
                }
            } catch {
                // ignore invalid dates
            }
        }
        // Escape single quotes
        return `'${value.replace(/'/g, "''")}'`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Get all table names for a connection (single DB query)
 */
async function getAllTableNames(
    connection: mysql.Connection,
): Promise<Set<string>> {
    const [tables] =
        await connection.execute<mysql.RowDataPacket[]>("SHOW TABLES");

    return new Set(
        tables.map(
            (row: mysql.RowDataPacket) => Object.values(row)[0] as string,
        ),
    );
}

/**
 * Get all column names for a table (single DB query)
 */
async function getTableColumns(
    connection: mysql.Connection,
    tableName: string,
): Promise<Set<string>> {
    const [columns] = await connection.execute<mysql.RowDataPacket[]>(
        `DESCRIBE \`${tableName}\``,
    );
    return new Set(
        columns.map((col: mysql.RowDataPacket) => col.Field as string),
    );
}

/**
 * Validate that a table name exists in the connection's database
 * (kept for external use, but prefer getAllTableNames for batch validation)
 */
export async function validateTableName(
    connectionId: string,
    tableName: string,
): Promise<boolean> {
    const connection = await ensureConnection(connectionId);
    const tables = await getAllTableNames(connection);
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
            return `INSERT INTO \`${tableName}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${vals.join(", ")})`;
        }
        case "update": {
            if (!values) {
                throw new Error("Update operation requires values");
            }
            const setClauses = Object.entries(values)
                .map(([col, val]) => `\`${col}\` = ${formatValueForSQL(val)}`)
                .join(", ");
            return `UPDATE \`${tableName}\` SET ${setClauses} WHERE \`${primaryKeyColumn}\` = ${formatValueForSQL(primaryKeyValue)}`;
        }
        case "delete": {
            return `DELETE FROM \`${tableName}\` WHERE \`${primaryKeyColumn}\` = ${formatValueForSQL(primaryKeyValue)}`;
        }
        default:
            throw new Error(`Unknown operation type: ${type}`);
    }
}

/**
 * Execute merge operations with server-side SQL generation
 */
export async function executeMergeOperations(
    connectionId: string,
    operations: MergeOperation[],
    fkCascadeChain?: FkCascadeMapping[],
): Promise<{
    success: boolean;
    error?: string;
    newIdMap?: Record<string, number>;
}> {
    if (operations.length === 0) {
        return { success: true };
    }

    const connection = await ensureConnection(connectionId);
    const newIdMap: Record<string, number> = {};

    // Fetch all valid tables once
    const validTables = await getAllTableNames(connection);

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
        const columns = await getTableColumns(connection, tn);
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

    try {
        await connection.beginTransaction();

        // Separate regular operations from insert-as-new operations
        const regularOps = operations.filter((op) => !op.isInsertAsNew);
        const insertAsNewOps = operations.filter((op) => op.isInsertAsNew);

        // Execute regular operations
        for (const op of regularOps) {
            const sql = buildMergeSQL(op);
            await connection.execute(sql);
        }

        // Execute insert-as-new operations and capture new IDs
        for (const op of insertAsNewOps) {
            const sql = buildMergeSQL(op);
            await connection.execute(sql);

            const [result] = await connection.execute<mysql.RowDataPacket[]>(
                "SELECT LAST_INSERT_ID() as lastId",
            );
            newIdMap[String(op.primaryKeyValue)] = result[0].lastId as number;
        }

        // Execute FK cascades if present
        if (fkCascadeChain && fkCascadeChain.length > 0) {
            for (const cascade of fkCascadeChain) {
                await executeCascadeInserts(connection, cascade, newIdMap);
            }
        }

        await connection.commit();
        return {
            success: true,
            newIdMap: Object.keys(newIdMap).length > 0 ? newIdMap : undefined,
        };
    } catch (error) {
        await connection.rollback();
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
