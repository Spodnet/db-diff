import { Router } from "express";
import {
    executeMergeOperations as executeMySQLMergeOperations,
    executeMySQLStatements,
    executeMySQLWithCascade,
    getMySQLTableData,
    getMySQLTables,
} from "../lib/mysql";
import type { MergeOperation } from "../lib/mergeTypes";
import {
    executeMergeOperations as executeSQLiteMergeOperations,
    executeSQLiteStatements,
    executeSQLiteWithCascade,
    getSQLiteTableData,
    getSQLiteTables,
} from "../lib/sqlite";

export const databaseRouter = Router();

// Get tables for a connection
databaseRouter.get("/:connectionId/tables", async (req, res) => {
    const { connectionId } = req.params;
    const { type } = req.query;

    try {
        if (type === "sqlite") {
            const tables = getSQLiteTables(connectionId);
            res.json({ success: true, tables });
        } else if (type === "mysql") {
            const tables = await getMySQLTables(connectionId);
            res.json({ success: true, tables });
        } else {
            res.status(400).json({
                success: false,
                error: "Unknown connection type",
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// Get table data
databaseRouter.get(
    "/:connectionId/tables/:tableName/data",
    async (req, res) => {
        const { connectionId, tableName } = req.params;
        const defaultLimit = Number(process.env.DEFAULT_ROW_LIMIT) || 500;
        const { type, limit = String(defaultLimit), offset = "0" } = req.query;

        try {
            if (type === "sqlite") {
                const data = getSQLiteTableData(
                    connectionId,
                    tableName,
                    Number(limit),
                    Number(offset),
                );
                res.json({ success: true, ...data });
            } else if (type === "mysql") {
                const data = await getMySQLTableData(
                    connectionId,
                    tableName,
                    Number(limit),
                    Number(offset),
                );
                res.json({ success: true, ...data });
            } else {
                res.status(400).json({
                    success: false,
                    error: "Unknown connection type",
                });
            }
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
);

// Execute merge operations (NEW: structured operations with server-side SQL generation)
// Also supports legacy API with raw SQL statements for backward compatibility
databaseRouter.post("/:connectionId/execute", async (req, res) => {
    const { connectionId } = req.params;
    const { type, operations, statements, insertAsNewOps, fkCascadeChain } = req.body;

    try {
        let result: {
            success: boolean;
            error?: string;
            newIdMap?: Record<string, number>;
        };

        // NEW API: structured operations (preferred, secure)
        if (Array.isArray(operations)) {
            if (type === "sqlite") {
                result = executeSQLiteMergeOperations(
                    connectionId,
                    operations as MergeOperation[],
                    fkCascadeChain,
                );
            } else if (type === "mysql") {
                result = await executeMySQLMergeOperations(
                    connectionId,
                    operations as MergeOperation[],
                    fkCascadeChain,
                );
            } else {
                res.status(400).json({
                    success: false,
                    error: "Unknown connection type",
                });
                return;
            }
            res.json(result);
            return;
        }

        // LEGACY API: raw SQL statements (deprecated, kept for backward compatibility)
        if (!Array.isArray(statements)) {
            res.status(400).json({
                success: false,
                error: "Either 'operations' or 'statements' array must be provided",
            });
            return;
        }

        // Check if this is a cascade merge
        const hasInsertAsNew =
            Array.isArray(insertAsNewOps) && insertAsNewOps.length > 0;
        const hasCascade =
            Array.isArray(fkCascadeChain) && fkCascadeChain.length > 0;
        const needsCascade = hasInsertAsNew || hasCascade;

        // Filter out insert-as-new statements from regular statements
        const regularStatements = needsCascade
            ? statements.filter(
                  (s: string) =>
                      !insertAsNewOps?.some((op: { sql: string }) => op.sql === s),
              )
            : statements;

        if (type === "sqlite") {
            if (needsCascade) {
                result = executeSQLiteWithCascade(
                    connectionId,
                    regularStatements,
                    insertAsNewOps || [],
                    fkCascadeChain || [],
                );
            } else {
                result = executeSQLiteStatements(connectionId, statements);
            }
        } else if (type === "mysql") {
            if (needsCascade) {
                result = await executeMySQLWithCascade(
                    connectionId,
                    regularStatements,
                    insertAsNewOps || [],
                    fkCascadeChain || [],
                );
            } else {
                result = await executeMySQLStatements(connectionId, statements);
            }
        } else {
            res.status(400).json({
                success: false,
                error: "Unknown connection type",
            });
            return;
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
