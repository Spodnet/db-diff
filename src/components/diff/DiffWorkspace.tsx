import { GitCompare, GitMerge, Loader2 } from "lucide-react";
import { useState } from "react";
import { useConnections } from "../../hooks/useConnections";
import { useDiff } from "../../hooks/useDiff";
import type { Connection, TableInfo } from "../../lib/types";
import { ConnectionSelector } from "./ConnectionSelector";
import { DiffResultsGrid } from "./DiffResultsGrid";
import { MergeConfirmationModal } from "./modals/MergeConfirmationModal";

export function DiffWorkspace() {
	const { connections, connectionStatuses, connectTo, connectionTables } =
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
		selectedRows,
		mergeOperations,
		executeMerge,
		isMerging,
		mergeSuccess,
		mergeError,
		clearMergeState,
	} = useDiff();

	const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
	const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
	const [showMergeModal, setShowMergeModal] = useState(false);

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

	const handleMergeClick = () => {
		setShowMergeModal(true);
	};

	const handleConfirmMerge = async () => {
		if (!targetConnection) return;
		await executeMerge(targetConnection);
		if (!mergeError) {
			setTimeout(() => {
				setShowMergeModal(false);
				clearMergeState();
				// Re-run comparison to show updated state and clear selection
				handleCompare();
			}, 1500);
		}
	};

	return (
		<div className="h-full flex flex-col p-6">
			{/* Source/Target Selection */}
			<div className="flex items-center gap-4 mb-6">
				{/* Source Selector */}
				<ConnectionSelector
					label="Source"
					connections={connections}
					connectionStatuses={connectionStatuses}
					selectedConnection={sourceConnection}
					onConnectionClick={(conn) => {
						const status = connectionStatuses.get(conn.id);
						if (status?.status === "connected") {
							setSourceConnection(conn.id);
							setSourceDropdownOpen(false);
						} else {
							handleConnectAndSelect(conn, "source");
						}
					}}
					tables={sourceTables}
					selectedTableName={selection.sourceTableName}
					onTableSelect={setSourceTable}
					isOpen={sourceDropdownOpen}
					onToggle={() => setSourceDropdownOpen(!sourceDropdownOpen)}
				/>

				{/* Compare Arrow */}
				<div className="pt-6">
					<div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
						<GitCompare className="w-5 h-5 text-white" />
					</div>
				</div>

				{/* Target Selector */}
				<ConnectionSelector
					label="Target"
					connections={connections}
					connectionStatuses={connectionStatuses}
					selectedConnection={targetConnection}
					onConnectionClick={(conn) => {
						const status = connectionStatuses.get(conn.id);
						if (status?.status === "connected") {
							setTargetConnection(conn.id);
							setTargetDropdownOpen(false);
						} else {
							handleConnectAndSelect(conn, "target");
						}
					}}
					tables={targetTables}
					selectedTableName={selection.targetTableName}
					onTableSelect={setTargetTable}
					isOpen={targetDropdownOpen}
					onToggle={() => setTargetDropdownOpen(!targetDropdownOpen)}
				/>

				{/* Compare Button */}
				<div className="flex flex-col gap-2 pt-6">
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

					{diffResult && selectedRows.size > 0 && (
						<button
							type="button"
							onClick={handleMergeClick}
							className="px-6 py-3 bg-success text-white rounded-lg font-medium hover:bg-success/90 shadow-lg shadow-success/20 transition-all flex items-center gap-2"
						>
							<GitMerge className="w-4 h-4" />
							Merge ({selectedRows.size})
						</button>
					)}
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

			{/* Merge Confirmation Modal */}
			{showMergeModal && (
				<MergeConfirmationModal
					onClose={() => setShowMergeModal(false)}
					onConfirm={handleConfirmMerge}
					targetConnection={targetConnection}
					sourceConnectionName={diffResult?.sourceConnection}
					targetConnectionName={diffResult?.targetConnection}
					tableName={diffResult?.tableName}
					selectedCount={selectedRows.size}
					mergeOperations={mergeOperations}
					isMerging={isMerging}
					mergeError={mergeError}
					mergeSuccess={mergeSuccess}
				/>
			)}
		</div>
	);
}
