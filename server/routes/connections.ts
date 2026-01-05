import { Router } from "express";
import {
	connectMySQL,
	disconnectMySQL,
	testMySQLConnection,
} from "../lib/mysql";
import {
	connectSQLite,
	disconnectSQLite,
	testSQLiteConnection,
} from "../lib/sqlite";

export const connectionsRouter = Router();

// Test a connection without persisting
connectionsRouter.post("/test", async (req, res) => {
	const connection = req.body;

	if (connection.type === "sqlite") {
		const result = testSQLiteConnection(connection.filePath);
		res.json(result);
	} else if (connection.type === "mysql") {
		const result = await testMySQLConnection({
			host: connection.host,
			port: connection.port,
			database: connection.database,
			user: connection.username,
			password: connection.password,
		});
		res.json(result);
	} else {
		res.status(400).json({ success: false, error: "Unknown connection type" });
	}
});

// Connect to a database
connectionsRouter.post("/:id/connect", async (req, res) => {
	const { id } = req.params;
	const connection = req.body;

	if (connection.type === "sqlite") {
		const result = connectSQLite(id, connection.filePath);
		res.json(result);
	} else if (connection.type === "mysql") {
		const result = await connectMySQL(id, {
			host: connection.host,
			port: connection.port,
			database: connection.database,
			user: connection.username,
			password: connection.password,
		});
		res.json(result);
	} else {
		res.status(400).json({ success: false, error: "Unknown connection type" });
	}
});

// Disconnect from a database
connectionsRouter.post("/:id/disconnect", async (req, res) => {
	const { id } = req.params;
	const { type } = req.body;

	if (type === "sqlite") {
		disconnectSQLite(id);
		res.json({ success: true });
	} else if (type === "mysql") {
		await disconnectMySQL(id);
		res.json({ success: true });
	} else {
		res.status(400).json({ success: false, error: "Unknown connection type" });
	}
});
