import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectionsRouter } from "./routes/connections";
import { databaseRouter } from "./routes/database";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/connections", connectionsRouter);
app.use("/api/database", databaseRouter);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 DB-Diff server running on http://localhost:${PORT}`);
});
