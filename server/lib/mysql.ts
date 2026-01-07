import mysql from "mysql2/promise";
import type { ColumnInfo, TableInfo } from "../../src/lib/types";
import { closeTunnel, createTunnel, type SSHConfig } from "./ssh-tunnel";

// Store active MySQL connections
const connections = new Map<string, mysql.Connection>();

interface MySQLConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssh?: SSHConfig;
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

        connections.set(connectionId, connection);
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
    const connection = connections.get(connectionId);
    if (connection) {
        await connection.end();
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
    return connections.get(connectionId);
}

export async function executeMySQLStatements(
    connectionId: string,
    statements: string[],
): Promise<{ success: boolean; error?: string }> {
    const connection = connections.get(connectionId);
    if (!connection) {
        throw new Error("Connection not found");
    }

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

// FK Cascade types
export interface FkCascadeMapping {
    table: string;
    column: string;
    children: FkCascadeMapping[];
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
    const connection = connections.get(connectionId);
    if (!connection) {
        throw new Error("Connection not found");
    }

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
