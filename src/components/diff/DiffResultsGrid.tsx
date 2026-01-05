import { Minus, Plus, RefreshCw } from "lucide-react";
import type { DiffStatus, RowDiff, TableDiffResult } from "../../lib/types";

interface DiffResultsGridProps {
	result: TableDiffResult;
}

export function DiffResultsGrid({ result }: DiffResultsGridProps) {
	const {
		summary,
		columns,
		rows,
		primaryKeyColumn,
		sourceConnection,
		targetConnection,
		tableName,
	} = result;

	const getStatusIcon = (status: DiffStatus) => {
		switch (status) {
			case "added":
				return <Plus className="w-3 h-3" />;
			case "deleted":
				return <Minus className="w-3 h-3" />;
			case "modified":
				return <RefreshCw className="w-3 h-3" />;
			default:
				return null;
		}
	};

	const getStatusBgClass = (status: DiffStatus) => {
		switch (status) {
			case "added":
				return "bg-added-bg";
			case "deleted":
				return "bg-deleted-bg";
			case "modified":
				return "bg-modified-bg";
			default:
				return "";
		}
	};

	const getStatusTextClass = (status: DiffStatus) => {
		switch (status) {
			case "added":
				return "text-added";
			case "deleted":
				return "text-deleted";
			case "modified":
				return "text-modified";
			default:
				return "text-text-secondary";
		}
	};

	const getCellValue = (
		row: RowDiff,
		column: string,
		side: "source" | "target",
	): string => {
		const data = side === "source" ? row.sourceRow : row.targetRow;
		if (!data) return "—";
		const value = data[column];
		if (value === null) return "NULL";
		if (value === undefined) return "—";
		return String(value);
	};

	return (
		<div className="flex-1 flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
			{/* Summary Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
				<div className="flex items-center gap-3">
					<h3 className="font-medium text-text-primary">{tableName}</h3>
					<span className="text-sm text-text-muted">
						{sourceConnection} → {targetConnection}
					</span>
				</div>
				<div className="flex items-center gap-4 text-sm">
					<span className="flex items-center gap-1 text-added">
						<Plus className="w-3 h-3" />
						{summary.added} added
					</span>
					<span className="flex items-center gap-1 text-deleted">
						<Minus className="w-3 h-3" />
						{summary.deleted} deleted
					</span>
					<span className="flex items-center gap-1 text-modified">
						<RefreshCw className="w-3 h-3" />
						{summary.modified} modified
					</span>
					<span className="text-text-muted">{summary.unchanged} unchanged</span>
				</div>
			</div>

			{/* Results Table */}
			<div className="flex-1 overflow-auto">
				<table className="w-full text-sm">
					<thead className="sticky top-0 bg-surface-elevated">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border w-12">
								Status
							</th>
							{columns.map((col) => (
								<th
									key={col}
									className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border"
								>
									{col}
									{col === primaryKeyColumn && (
										<span className="ml-1 text-accent">🔑</span>
									)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows
							.filter((r) => r.status !== "unchanged")
							.map((row) => (
								<tr
									key={row.primaryKey}
									className={`${getStatusBgClass(row.status)} border-b border-border/50 hover:bg-surface-elevated/50 transition-colors`}
								>
									<td className={`px-3 py-2 ${getStatusTextClass(row.status)}`}>
										<div className="flex items-center justify-center">
											{getStatusIcon(row.status)}
										</div>
									</td>
									{row.cellDiffs.map((cell) => (
										<td
											key={cell.column}
											className={`px-3 py-2 font-mono text-xs ${
												cell.status === "modified"
													? "text-modified font-medium"
													: row.status === "added"
														? "text-added"
														: row.status === "deleted"
															? "text-deleted line-through"
															: "text-text-primary"
											}`}
										>
											{row.status === "modified" &&
											cell.status === "modified" ? (
												<div className="flex flex-col gap-0.5">
													<span className="text-deleted line-through">
														{getCellValue(row, cell.column, "source")}
													</span>
													<span className="text-added">
														{getCellValue(row, cell.column, "target")}
													</span>
												</div>
											) : row.status === "added" ? (
												getCellValue(row, cell.column, "target")
											) : row.status === "deleted" ? (
												getCellValue(row, cell.column, "source")
											) : (
												getCellValue(row, cell.column, "source")
											)}
										</td>
									))}
								</tr>
							))}
					</tbody>
				</table>

				{/* Show unchanged rows collapsed */}
				{summary.unchanged > 0 && (
					<div className="px-4 py-3 text-center text-sm text-text-muted bg-surface-elevated/50 border-t border-border">
						{summary.unchanged} unchanged row
						{summary.unchanged !== 1 ? "s" : ""} hidden
					</div>
				)}
			</div>
		</div>
	);
}
