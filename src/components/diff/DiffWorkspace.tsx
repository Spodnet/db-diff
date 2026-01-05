import { ChevronDown, Database, GitCompare, Loader2 } from "lucide-react";
import { useState } from "react";
import { useConnections } from "../../hooks/useConnections";
import { useDiff } from "../../hooks/useDiff";
import type { Connection, TableInfo } from "../../lib/types";
import { DiffResultsGrid } from "./DiffResultsGrid";

export function DiffWorkspace() {
	const { connections, connectionStatuses, connectionTables, connectTo } =
		useConnections();
	const {
		selection,
		diffResult,
		isComparing,
		error,
		setSourceConnection,
		setSourceTable,
		setTargetConnection,
		setTargetTable,
		runComparison,
	} = useDiff();

	const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
	const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);

	// Get connected connections
	const _connectedConnections = connections.filter(
		(c) => connectionStatuses.get(c.id)?.status === "connected",
	);

	const getConnection = (id: string | null): Connection | undefined =>
		connections.find((c) => c.id === id);

	const getTable = (
		connectionId: string | null,
		tableName: string | null,
	): TableInfo | undefined => {
		if (!connectionId || !tableName) return undefined;
		return connectionTables
			.get(connectionId)
			?.find((t) => t.name === tableName);
	};

	const sourceConnection = getConnection(selection.sourceConnectionId);
	const targetConnection = getConnection(selection.targetConnectionId);
	const sourceTables = selection.sourceConnectionId
		? connectionTables.get(selection.sourceConnectionId) || []
		: [];
	const targetTables = selection.targetConnectionId
		? connectionTables.get(selection.targetConnectionId) || []
		: [];

	const canCompare =
		selection.sourceConnectionId &&
		selection.sourceTableName &&
		selection.targetConnectionId &&
		selection.targetTableName;

	const handleCompare = async () => {
		if (!canCompare) return;

		const srcConn = getConnection(selection.sourceConnectionId);
		const tgtConn = getConnection(selection.targetConnectionId);
		const srcTable = getTable(
			selection.sourceConnectionId,
			selection.sourceTableName,
		);
		const tgtTable = getTable(
			selection.targetConnectionId,
			selection.targetTableName,
		);

		if (srcConn && tgtConn && srcTable && tgtTable) {
			await runComparison(srcConn, tgtConn, srcTable, tgtTable);
		}
	};

	const handleConnectAndSelect = async (
		connection: Connection,
		side: "source" | "target",
	) => {
		await connectTo(connection);
		if (side === "source") {
			setSourceConnection(connection.id);
			setSourceDropdownOpen(false);
		} else {
			setTargetConnection(connection.id);
			setTargetDropdownOpen(false);
		}
	};

	return (
		<div className="h-full flex flex-col p-6">
			{/* Source/Target Selection */}
			<div className="flex items-center gap-4 mb-6">
				{/* Source Selector */}
				<div className="flex-1">
					<span className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
						Source
					</span>
					<div className="space-y-2">
						{/* Connection Dropdown */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setSourceDropdownOpen(!sourceDropdownOpen)}
								className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface border border-border rounded-lg text-sm hover:border-accent transition-colors"
							>
								<span
									className={
										sourceConnection
											? "text-text-primary"
											: "text-text-secondary"
									}
								>
									{sourceConnection?.name || "Select connection..."}
								</span>
								<ChevronDown className="w-4 h-4 text-text-muted" />
							</button>
							{sourceDropdownOpen && (
								<div className="absolute z-10 top-full mt-1 w-full bg-surface-elevated border border-border rounded-lg shadow-xl py-1">
									{connections.length === 0 ? (
										<p className="px-4 py-2 text-sm text-text-muted">
											No connections available
										</p>
									) : (
										connections.map((conn) => {
											const status = connectionStatuses.get(conn.id);
											const isConnected = status?.status === "connected";
											return (
												<button
													key={conn.id}
													type="button"
													onClick={() => {
														if (isConnected) {
															setSourceConnection(conn.id);
															setSourceDropdownOpen(false);
														} else {
															handleConnectAndSelect(conn, "source");
														}
													}}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
												>
													<Database className="w-4 h-4 text-accent" />
													<span className="flex-1 text-left">{conn.name}</span>
													{isConnected ? (
														<span className="w-2 h-2 rounded-full bg-added" />
													) : (
														<span className="text-xs text-text-muted">
															Connect
														</span>
													)}
												</button>
											);
										})
									)}
								</div>
							)}
						</div>
						{/* Table Dropdown */}
						{selection.sourceConnectionId && (
							<select
								value={selection.sourceTableName || ""}
								onChange={(e) => setSourceTable(e.target.value || null)}
								className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
							>
								<option value="">Select table...</option>
								{sourceTables.map((table) => (
									<option key={table.name} value={table.name}>
										{table.name} ({table.rowCount} rows)
									</option>
								))}
							</select>
						)}
					</div>
				</div>

				{/* Compare Arrow */}
				<div className="pt-6">
					<div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
						<GitCompare className="w-5 h-5 text-white" />
					</div>
				</div>

				{/* Target Selector */}
				<div className="flex-1">
					<span className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
						Target
					</span>
					<div className="space-y-2">
						{/* Connection Dropdown */}
						<div className="relative">
							<button
								type="button"
								onClick={() => setTargetDropdownOpen(!targetDropdownOpen)}
								className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface border border-border rounded-lg text-sm hover:border-accent transition-colors"
							>
								<span
									className={
										targetConnection
											? "text-text-primary"
											: "text-text-secondary"
									}
								>
									{targetConnection?.name || "Select connection..."}
								</span>
								<ChevronDown className="w-4 h-4 text-text-muted" />
							</button>
							{targetDropdownOpen && (
								<div className="absolute z-10 top-full mt-1 w-full bg-surface-elevated border border-border rounded-lg shadow-xl py-1">
									{connections.length === 0 ? (
										<p className="px-4 py-2 text-sm text-text-muted">
											No connections available
										</p>
									) : (
										connections.map((conn) => {
											const status = connectionStatuses.get(conn.id);
											const isConnected = status?.status === "connected";
											return (
												<button
													key={conn.id}
													type="button"
													onClick={() => {
														if (isConnected) {
															setTargetConnection(conn.id);
															setTargetDropdownOpen(false);
														} else {
															handleConnectAndSelect(conn, "target");
														}
													}}
													className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
												>
													<Database className="w-4 h-4 text-accent" />
													<span className="flex-1 text-left">{conn.name}</span>
													{isConnected ? (
														<span className="w-2 h-2 rounded-full bg-added" />
													) : (
														<span className="text-xs text-text-muted">
															Connect
														</span>
													)}
												</button>
											);
										})
									)}
								</div>
							)}
						</div>
						{/* Table Dropdown */}
						{selection.targetConnectionId && (
							<select
								value={selection.targetTableName || ""}
								onChange={(e) => setTargetTable(e.target.value || null)}
								className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none"
							>
								<option value="">Select table...</option>
								{targetTables.map((table) => (
									<option key={table.name} value={table.name}>
										{table.name} ({table.rowCount} rows)
									</option>
								))}
							</select>
						)}
					</div>
				</div>

				{/* Compare Button */}
				<div className="pt-6">
					<button
						type="button"
						onClick={handleCompare}
						disabled={!canCompare || isComparing}
						className="px-6 py-3 bg-accent text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-hover transition-colors flex items-center gap-2"
					>
						{isComparing ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								Comparing...
							</>
						) : (
							"Compare"
						)}
					</button>
				</div>
			</div>

			{/* Error Display */}
			{error && (
				<div className="mb-4 px-4 py-3 bg-deleted-bg text-deleted rounded-lg text-sm">
					{error}
				</div>
			)}

			{/* Results or Empty State */}
			{diffResult ? (
				<DiffResultsGrid result={diffResult} />
			) : (
				<div className="flex-1 flex flex-col items-center justify-center bg-surface rounded-xl border border-border">
					<div className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
						<GitCompare className="w-10 h-10 text-text-muted" />
					</div>
					<h2 className="text-xl font-semibold text-text-primary mb-2">
						Ready to Compare
					</h2>
					<p className="text-sm text-text-secondary text-center max-w-md">
						Select a source and target database connection, then choose tables
						to compare their contents side by side.
					</p>
				</div>
			)}
		</div>
	);
}
