import { Columns, Minus, Plus, RefreshCw, Rows } from "lucide-react";
import { useState } from "react";
import { useDiff } from "../../hooks/useDiff";
import type { DiffStatus, RowDiff, TableDiffResult } from "../../lib/types";

interface DiffResultsGridProps {
	result: TableDiffResult;
}

type ViewMode = "inline" | "side-by-side";

export function DiffResultsGrid({ result }: DiffResultsGridProps) {
	const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
	const { selectedRows, toggleRowSelection, selectAllRows, deselectAllRows } =
		useDiff();

	const {
		summary,
		columns,
		rows,
		primaryKeyColumn,
		sourceConnection,
		targetConnection,
		tableName,
	} = result;

	const allChangedRowsSelected =
		rows.filter((r) => r.status !== "unchanged").length > 0 &&
		rows
			.filter((r) => r.status !== "unchanged")
			.every((r) => selectedRows.has(r.primaryKey));

	const handleSelectAll = () => {
		if (allChangedRowsSelected) {
			deselectAllRows();
		} else {
			selectAllRows();
		}
	};

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

	const changedRows = rows.filter((r) => r.status !== "unchanged");

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
				<div className="flex items-center gap-4">
					{/* View Mode Toggle */}
					<div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
						<button
							type="button"
							onClick={() => setViewMode("side-by-side")}
							className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
								viewMode === "side-by-side"
									? "bg-accent text-white"
									: "text-text-secondary hover:text-text-primary"
							}`}
						>
							<Columns className="w-3 h-3" />
							Side by side
						</button>
						<button
							type="button"
							onClick={() => setViewMode("inline")}
							className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
								viewMode === "inline"
									? "bg-accent text-white"
									: "text-text-secondary hover:text-text-primary"
							}`}
						>
							<Rows className="w-3 h-3" />
							Inline
						</button>
					</div>
					{/* Stats */}
					<div className="flex items-center gap-4 text-sm">
						<span className="flex items-center gap-1 text-added">
							<Plus className="w-3 h-3" />
							{summary.added}
						</span>
						<span className="flex items-center gap-1 text-deleted">
							<Minus className="w-3 h-3" />
							{summary.deleted}
						</span>
						<span className="flex items-center gap-1 text-modified">
							<RefreshCw className="w-3 h-3" />
							{summary.modified}
						</span>
						<span className="text-text-muted">
							{summary.unchanged} unchanged
						</span>
					</div>
				</div>
			</div>

			{/* Results */}
			<div className="flex-1 overflow-auto">
				{viewMode === "side-by-side" ? (
					<SideBySideView
						rows={changedRows}
						columns={columns}
						primaryKeyColumn={primaryKeyColumn}
						sourceConnection={sourceConnection}
						targetConnection={targetConnection}
						getCellValue={getCellValue}
						getStatusBgClass={getStatusBgClass}
						getStatusTextClass={getStatusTextClass}
						getStatusIcon={getStatusIcon}
						selectedRows={selectedRows}
						onToggleSelection={toggleRowSelection}
						onSelectAll={handleSelectAll}
						allSelected={allChangedRowsSelected}
					/>
				) : (
					<InlineView
						rows={changedRows}
						columns={columns}
						primaryKeyColumn={primaryKeyColumn}
						getCellValue={getCellValue}
						getStatusBgClass={getStatusBgClass}
						getStatusTextClass={getStatusTextClass}
						getStatusIcon={getStatusIcon}
						selectedRows={selectedRows}
						onToggleSelection={toggleRowSelection}
						onSelectAll={handleSelectAll}
						allSelected={allChangedRowsSelected}
					/>
				)}

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

// Side-by-side view component
interface ViewProps {
	rows: RowDiff[];
	columns: string[];
	primaryKeyColumn: string;
	getCellValue: (
		row: RowDiff,
		col: string,
		side: "source" | "target",
	) => string;
	getStatusBgClass: (status: DiffStatus) => string;
	getStatusTextClass: (status: DiffStatus) => string;
	getStatusIcon: (status: DiffStatus) => React.ReactNode;
	sourceConnection?: string;
	targetConnection?: string;
	selectedRows: Set<string>;
	onToggleSelection: (id: string) => void;
	onSelectAll: () => void;
	allSelected: boolean;
}

function SideBySideView({
	rows,
	columns,
	primaryKeyColumn,
	sourceConnection,
	targetConnection,
	getCellValue,
	getStatusBgClass,
	getStatusTextClass,
	getStatusIcon,
	selectedRows,
	onToggleSelection,
	onSelectAll,
	allSelected,
}: ViewProps) {
	return (
		<div className="flex">
			{/* Source Side */}
			<div className="flex-1 border-r border-border">
				<div className="sticky top-0 bg-surface-elevated px-3 py-2 border-b border-border">
					<span className="text-xs font-medium text-text-muted uppercase tracking-wider">
						Source: {sourceConnection}
					</span>
				</div>
				<table className="w-full text-sm">
					<thead className="sticky top-8 bg-surface-elevated">
						<tr>
							<th className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border w-8" />
							{columns.map((col) => (
								<th
									key={col}
									className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border"
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
						{rows.map((row) => {
							const isDeleted = row.status === "deleted";
							const isModified = row.status === "modified";
							const isAdded = row.status === "added";

							return (
								<tr
									key={row.primaryKey}
									className={`border-b border-border/50 ${
										isDeleted
											? "bg-deleted-bg"
											: isModified
												? "bg-modified-bg/30"
												: ""
									}`}
								>
									<td className={`px-2 py-2 ${getStatusTextClass(row.status)}`}>
										{getStatusIcon(row.status)}
									</td>
									{columns.map((col) => {
										const cellDiff = row.cellDiffs.find(
											(c) => c.column === col,
										);
										const isCellModified = cellDiff?.status === "modified";

										return (
											<td
												key={col}
												className={`px-2 py-2 font-mono text-xs ${
													isAdded
														? "text-text-muted"
														: isDeleted
															? "text-deleted"
															: isCellModified
																? "text-modified bg-modified-bg/50 font-medium"
																: "text-text-primary"
												}`}
											>
												{isAdded ? "—" : getCellValue(row, col, "source")}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Target Side */}
			<div className="flex-1">
				<div className="sticky top-0 bg-surface-elevated px-3 py-2 border-b border-border z-10">
					<span className="text-xs font-medium text-text-muted uppercase tracking-wider">
						Target: {targetConnection}
					</span>
				</div>
				<table className="w-full text-sm">
					<thead className="sticky top-8 bg-surface-elevated z-10">
						<tr>
							<th className="px-2 py-2 w-8 border-b border-border" />
							<th className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border w-8" />
							{columns.map((col) => (
								<th
									key={col}
									className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border"
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
						{rows.map((row) => {
							const isAdded = row.status === "added";
							const isModified = row.status === "modified";
							const isDeleted = row.status === "deleted";

							return (
								<tr
									key={row.primaryKey}
									className={`border-b border-border/50 ${
										isAdded
											? "bg-added-bg"
											: isModified
												? "bg-modified-bg/30"
												: ""
									}`}
								>
									<td className={`px-2 py-2 ${getStatusTextClass(row.status)}`}>
										{getStatusIcon(row.status)}
									</td>
									{columns.map((col) => {
										const cellDiff = row.cellDiffs.find(
											(c) => c.column === col,
										);
										const isCellModified = cellDiff?.status === "modified";

										return (
											<td
												key={col}
												className={`px-2 py-2 font-mono text-xs ${
													isDeleted
														? "text-text-muted"
														: isAdded
															? "text-added"
															: isCellModified
																? "text-modified bg-modified-bg/50 font-medium"
																: "text-text-primary"
												}`}
											>
												{isDeleted ? "—" : getCellValue(row, col, "target")}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// Inline view component
function InlineView({
	rows,
	columns,
	primaryKeyColumn,
	getCellValue,
	getStatusBgClass,
	getStatusTextClass,
	getStatusIcon,
	selectedRows,
	onToggleSelection,
	onSelectAll,
	allSelected,
}: ViewProps) {
	return (
		<table className="w-full text-sm">
			<thead className="sticky top-0 bg-surface-elevated z-10">
				<tr>
					<th className="px-2 py-2 w-8 border-b border-border text-center">
						<input
							type="checkbox"
							checked={allSelected}
							onChange={onSelectAll}
							className="rounded border-border text-accent focus:ring-accent bg-surface"
						/>
					</th>
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
				{rows.map((row) => {
					const isSelected = selectedRows.has(row.primaryKey);
					return (
						<tr
							key={row.primaryKey}
							className={`${getStatusBgClass(row.status)} ${
								isSelected ? "bg-accent/10" : ""
							} border-b border-border/50 hover:bg-surface-elevated/50 transition-colors cursor-pointer`}
							onClick={() => onToggleSelection(row.primaryKey)}
						>
							<td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
								<input
									type="checkbox"
									checked={isSelected}
									onChange={() => onToggleSelection(row.primaryKey)}
									className="rounded border-border text-accent focus:ring-accent bg-surface cursor-pointer"
								/>
							</td>
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
								{row.status === "modified" && cell.status === "modified" ? (
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
				);
			})}
			</tbody>
		</table>
	);
}
