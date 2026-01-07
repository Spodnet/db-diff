import { Minus, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useDiff } from "../../hooks/useDiff";
import type { DiffStatus, RowDiff, TableDiffResult } from "../../lib/types";
import { formatCellValue } from "../../lib/utils";
import { DiffStats } from "./DiffStats";
import { InlineView } from "./views/InlineView";
import { SideBySideView } from "./views/SideBySideView";

interface DiffResultsGridProps {
    result: TableDiffResult;
    onRecompare: (newLimit?: number) => void;
}

type ViewMode = "inline" | "side-by-side";

export function DiffResultsGrid({ result, onRecompare }: DiffResultsGridProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
    // FilterStatus includes DiffStatus + "newRow" pseudo-status
    type FilterStatus = DiffStatus | "newRow";
    const [visibleStatuses, setVisibleStatuses] = useState<Set<FilterStatus>>(
        new Set(["added", "deleted", "modified", "unchanged", "newRow"]),
    );
    const {
        selectedRows,
        toggleRowSelection,
        selectAllRows,
        deselectAllRows,
        mergedCells,
        mergeCell,
        insertAsNewRows,
        toggleInsertAsNew,
        rowLimit,
        totalSourceRows,
        totalTargetRows,
        setRowLimit,
        loadAllRows,
        toggleIgnoredColumn,
    } = useDiff();

    const {
        summary,
        columns,
        rows,
        primaryKeyColumn,
        sourceConnection,
        targetConnection,
        tableName,
    } = result;

    const toggleStatus = (status: FilterStatus) => {
        setVisibleStatuses((prev) => {
            const next = new Set(prev);
            if (next.has(status)) {
                next.delete(status);
            } else {
                next.add(status);
            }
            return next;
        });
    };

    // Count of rows marked as insert-as-new
    const insertAsNewCount = insertAsNewRows.size;

    // Filter rows based on visibility (handle newRow as a separate case)
    const visibleRows = rows.filter((r) => {
        const isNewRow = insertAsNewRows.has(r.primaryKey);
        if (isNewRow) {
            // newRow pseudo-status
            return visibleStatuses.has("newRow");
        }
        return visibleStatuses.has(r.status);
    });
    const changedVisibleRows = visibleRows.filter(
        (r) => r.status !== "unchanged",
    );

    const allChangedRowsSelected =
        changedVisibleRows.length > 0 &&
        changedVisibleRows.every((r) => selectedRows.has(r.primaryKey));

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

        return formatCellValue(value);
    };

    // Load more: increase limit by 500 and recompare
    const handleLoadMore = () => {
        const newLimit = rowLimit + 500;
        setRowLimit(newLimit);
        onRecompare(newLimit);
    };

    // Load all rows
    const handleLoadAll = () => {
        const newLimit = 1000000;
        loadAllRows();
        onRecompare(newLimit);
    };

    // Calculate loaded row count (unique rows loaded in current diff)
    const loadedRowCount = rows.length;

    return (
        <div className="flex-1 flex flex-col bg-surface rounded-xl border border-border overflow-hidden">
            <DiffStats
                summary={summary}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                tableName={tableName}
                sourceConnection={sourceConnection}
                targetConnection={targetConnection}
                visibleStatuses={visibleStatuses}
                onToggleStatus={toggleStatus}
                insertAsNewCount={insertAsNewCount}
                rowLimit={rowLimit}
                totalSourceRows={totalSourceRows}
                totalTargetRows={totalTargetRows}
                loadedRowCount={loadedRowCount}
                onLoadMore={handleLoadMore}
                onLoadAll={handleLoadAll}
            />

            {/* Results */}
            <div className="flex-1 overflow-auto">
                {viewMode === "side-by-side" ? (
                    <SideBySideView
                        rows={visibleRows}
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
                        mergedCells={mergedCells}
                        onMergeCell={mergeCell}
                        insertAsNewRows={insertAsNewRows}
                        onToggleInsertAsNew={toggleInsertAsNew}
                        onToggleIgnoredColumn={toggleIgnoredColumn}
                    />
                ) : (
                    <InlineView
                        rows={visibleRows}
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
                        onToggleIgnoredColumn={toggleIgnoredColumn}
                    />
                )}

                {summary.unchanged > 0 && visibleStatuses.has("unchanged") && (
                    <div className="px-4 py-3 text-center text-sm text-text-muted bg-surface-elevated/50 border-t border-border">
                        {summary.unchanged} unchanged rows
                    </div>
                )}
            </div>
        </div>
    );
}
