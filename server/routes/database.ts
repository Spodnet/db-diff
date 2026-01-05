import { Router } from "express";
import { getMySQLTableData, getMySQLTables } from "../lib/mysql";
import { getSQLiteTableData, getSQLiteTables } from "../lib/sqlite";

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
			res
				.status(400)
				.json({ success: false, error: "Unknown connection type" });
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
		const { type, limit = "100", offset = "0" } = req.query;

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
				res
					.status(400)
					.json({ success: false, error: "Unknown connection type" });
			}
		} catch (error) {
			res.status(500).json({
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

// Execute SQL statements
databaseRouter.post("/:connectionId/execute", async (req, res) => {
	const { connectionId } = req.params;
	const { type, statements } = req.body;

	if (!Array.isArray(statements)) {
		res
			.status(400)
			.json({ success: false, error: "statements must be an array" });
		return;
	}

	try {
		if (type === "sqlite") {
			const { executeSQLiteStatements } = await import("../lib/sqlite");
			const result = executeSQLiteStatements(connectionId, statements);
			res.json(result);
		} else if (type === "mysql") {
			const { executeMySQLStatements } = await import("../lib/mysql");
			const result = await executeMySQLStatements(connectionId, statements);
			res.json(result);
		} else {
			res
				.status(400)
				.json({ success: false, error: "Unknown connection type" });
		}
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
});
