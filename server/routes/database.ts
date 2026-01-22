import { Router } from "express";
import type { MergeOperation } from "../lib/mergeTypes";
import {
    executeMergeOperations as executeMySQLMergeOperations,
    executeMySQLStatements,
    executeMySQLWithCascade,
    getMySQLTableData,
    getMySQLTables,
} from "../lib/mysql";
import {
    executeMergeOperations as executeSQLiteMergeOperations,
    executeSQLiteStatements,
    executeSQLiteWithCascade,
    getSQLiteTableData,
    getSQLiteTables,
} from "../lib/sqlite";
import { AppError, asyncHandler } from "../middleware/errors";

export const databaseRouter = Router();

// Get tables for a connection
databaseRouter.get(
    "/:connectionId/tables",
    asyncHandler(async (req, res) => {
        const { connectionId } = req.params;
        const { type } = req.query;

        if (type === "sqlite") {
            const tables = getSQLiteTables(connectionId);
            res.json({ success: true, tables });
        } else if (type === "mysql") {
            const tables = await getMySQLTables(connectionId);
            res.json({ success: true, tables });
        } else {
            throw new AppError("Unknown connection type", 400);
        }
    }),
);

// Get table data
databaseRouter.get(
    "/:connectionId/tables/:tableName/data",
    asyncHandler(async (req, res) => {
        const { connectionId, tableName } = req.params;
        const defaultLimit = Number(process.env.DEFAULT_ROW_LIMIT) || 500;
        const { type, limit = String(defaultLimit), offset = "0" } = req.query;

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
            throw new AppError("Unknown connection type", 400);
        }
    }),
);

// Execute merge operations (NEW: structured operations with server-side SQL generation)
// Also supports legacy API with raw SQL statements for backward compatibility
databaseRouter.post(
    "/:connectionId/execute",
    asyncHandler(async (req, res) => {
        const { connectionId } = req.params;
        const { type, operations, statements, insertAsNewOps, fkCascadeChain } =
            req.body;

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
                throw new AppError("Unknown connection type", 400);
            }
            res.json(result);
            return;
        }

        // LEGACY API: raw SQL statements (deprecated, kept for backward compatibility)
        if (!Array.isArray(statements)) {
            throw new AppError(
                "Either 'operations' or 'statements' array must be provided",
                400,
            );
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
                      !insertAsNewOps?.some(
                          (op: { sql: string }) => op.sql === s,
                      ),
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
            throw new AppError("Unknown connection type", 400);
        }

        res.json(result);
    }),
);
