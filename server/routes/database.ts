import { Router } from "express";
import {
    executeMySQLStatements,
    executeMySQLWithCascade,
    getMySQLTableData,
    getMySQLTables,
} from "../lib/mysql";
import {
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

// Execute SQL statements (with optional FK cascade support)
databaseRouter.post("/:connectionId/execute", async (req, res) => {
    const { connectionId } = req.params;
    const { type, statements, insertAsNewOps, fkCascadeChain } = req.body;

    if (!Array.isArray(statements)) {
        res.status(400).json({
            success: false,
            error: "statements must be an array",
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

    try {
        let result: {
            success: boolean;
            error?: string;
            newIdMap?: Record<string, number>;
        };

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
