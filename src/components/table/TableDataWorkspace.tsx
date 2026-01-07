import { ArrowRight, Database, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDiff } from "../../hooks/useDiff";
import { useView } from "../../hooks/useView";
import type { Connection } from "../../lib/types";

interface TableDataResponse {
	success: boolean;
	rows: Record<string, unknown>[];
	error?: string;
}

interface TableDataWorkspaceProps {
	connection: Connection;
	tableName: string;
}

export function TableDataWorkspace({
	connection,
	tableName,
}: TableDataWorkspaceProps) {
	const [data, setData] = useState<TableDataResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		setSourceConnection,
		setSourceTable,
		setTargetConnection,
		setTargetTable,
	} = useDiff();
	const { activateTab } = useView();

	const fetchData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/database/${connection.id}/tables/${tableName}/data?type=${connection.type}`,
			);
			const result = await res.json();
			if (result.success) {
				setData(result);
			} else {
				setError(result.error || "Failed to fetch table data");
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to fetch table data");
		} finally {
			setLoading(false);
		}
	}, [connection.id, connection.type, tableName]);

	useEffect(() => {
		fetchData();
	}, [fetchData]); // Fetch when props change

	const handleUseAsSource = () => {
		setSourceConnection(connection.id);
		setSourceTable(tableName);
		activateTab("diff");
	};

	const handleUseAsTarget = () => {
		setTargetConnection(connection.id);
		setTargetTable(tableName);
		activateTab("diff");
	};

	// Format cell values for display (handle dates, etc.)
	const formatCellValue = (value: unknown): string => {
		if (value === null || value === undefined) return "";
		if (typeof value === "number") return String(value);
		if (typeof value === "boolean") return value ? "true" : "false";

		// Handle Date objects
		if (value instanceof Date) {
			return value.toISOString().slice(0, 19).replace("T", " ");
		}

		// Handle ISO date strings
		if (
			typeof value === "string" &&
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
		) {
			try {
				const date = new Date(value);
				if (!Number.isNaN(date.getTime())) {
					return date.toISOString().slice(0, 19).replace("T", " ");
				}
			} catch (_e) {
				// Fall through to default string display
			}
		}

		return String(value);
	};

	return (
		<div className="h-full flex flex-col bg-surface">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated">
				<div className="flex items-center gap-4">
					<div>
						<h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
							<Database
								className="w-5 h-5"
								style={{ color: connection.color || "var(--color-accent)" }}
							/>
							{tableName}
						</h2>
						<p className="text-xs text-text-muted">
							{connection.name} • {data?.rows.length || 0} rows
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleUseAsSource}
						className="px-3 py-1.5 text-xs font-medium text-text-primary bg-surface border border-border rounded-lg hover:bg-surface-elevated hover:border-accent transition-colors flex items-center gap-1.5"
					>
						Set Source
					</button>
					<button
						type="button"
						onClick={handleUseAsTarget}
						className="px-3 py-1.5 text-xs font-medium text-text-primary bg-surface border border-border rounded-lg hover:bg-surface-elevated hover:border-accent transition-colors flex items-center gap-1.5"
					>
						Set Target
						<ArrowRight className="w-3 h-3" />
					</button>
					<div className="w-px h-6 bg-border mx-1" />
					<button
						type="button"
						onClick={fetchData}
						disabled={loading}
						className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors disabled:opacity-50"
						title="Refresh Data"
					>
						<RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-6">
				{error ? (
					<div className="p-4 bg-deleted-bg text-deleted border border-deleted/20 rounded-lg">
						{error}
					</div>
				) : loading && !data ? (
					<div className="flex flex-col items-center justify-center h-64">
						<Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
						<p className="text-text-secondary">Loading table data...</p>
					</div>
				) : data && data.rows.length > 0 ? (
					<div className="bg-surface border border-border rounded-lg overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full text-sm text-left">
								<thead className="bg-surface-elevated text-text-muted font-medium border-b border-border">
									<tr>
										{Object.keys(data.rows[0]).map((header) => (
											<th key={header} className="px-4 py-3 whitespace-nowrap">
												{header}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-border">
									{data.rows.map((row, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: no standard id available for generic table
										<tr key={i} className="hover:bg-surface-elevated/50">
											{Object.values(row).map((cell, j) => {
												return (
													<td
														key={`${String(cell)}-${j}`}
														className="px-4 py-3 text-text-primary whitespace-nowrap"
													>
														{cell === null ? (
															<span className="text-text-muted italic">
																NULL
															</span>
														) : (
															formatCellValue(cell)
														)}
													</td>
												);
											})}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center h-64 text-text-secondary">
						<p>No data found in table</p>
					</div>
				)}
			</div>
		</div>
	);
}
