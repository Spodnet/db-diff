import { Minus, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useDiff } from "../../hooks/useDiff";
import type { DiffStatus, RowDiff, TableDiffResult } from "../../lib/types";
import { DiffStats } from "./DiffStats";
import { InlineView } from "./views/InlineView";
import { SideBySideView } from "./views/SideBySideView";

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
			<DiffStats
				summary={summary}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				tableName={tableName}
				sourceConnection={sourceConnection}
				targetConnection={targetConnection}
			/>

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
