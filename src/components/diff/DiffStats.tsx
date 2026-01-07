import {
    AlertTriangle,
    Columns,
    Copy,
    Download,
    Minus,
    Plus,
    RefreshCw,
    Rows,
} from "lucide-react";

import type { DiffStatus, TableDiffResult } from "../../lib/types";

type FilterStatus = DiffStatus | "newRow";

interface DiffStatsProps {
    summary: TableDiffResult["summary"];
    viewMode: "side-by-side" | "inline";
    onViewModeChange: (mode: "side-by-side" | "inline") => void;
    tableName: string;
    sourceConnection: string;
    targetConnection: string;
    visibleStatuses: Set<FilterStatus>;
    onToggleStatus: (status: FilterStatus) => void;
    insertAsNewCount: number;
    // Row count props
    rowLimit: number;
    totalSourceRows: number | null;
    totalTargetRows: number | null;
    loadedRowCount: number;
    onLoadMore: () => void;
    onLoadAll: () => void;
}

export function DiffStats({
    summary,
    viewMode,
    onViewModeChange,
    tableName,
    sourceConnection,
    targetConnection,
    visibleStatuses,
    onToggleStatus,
    insertAsNewCount,
    rowLimit,
    totalSourceRows,
    totalTargetRows,
    loadedRowCount,
    onLoadMore,
    onLoadAll,
}: DiffStatsProps) {
    const getFilterStyle = (status: FilterStatus, colorClass: string) => {
        const isVisible = visibleStatuses.has(status);
        return `flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all border ${
            isVisible
                ? `bg-surface border-${colorClass}/20 ${colorClass}`
                : "text-text-muted border-transparent opacity-50 hover:opacity-100"
        }`;
    };

    // Calculate max total rows from either source or target
    const maxTotal = Math.max(totalSourceRows ?? 0, totalTargetRows ?? 0);
    const hasMoreRows = maxTotal > loadedRowCount;

    return (
        <div className="flex flex-col border-b border-border bg-surface-elevated">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                    <h3 className="font-medium text-text-primary">
                        {tableName}
                    </h3>
                    <span className="text-sm text-text-muted">
                        {sourceConnection} → {targetConnection}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-surface rounded-lg p-0.5 border border-border">
                        <button
                            type="button"
                            onClick={() => onViewModeChange("side-by-side")}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                                viewMode === "side-by-side"
                                    ? "bg-accent text-white"
                                    : "text-text-secondary hover:text-text-primary"
                            }`}
                            title="Side by Side View"
                        >
                            <Columns className="w-3 h-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange("inline")}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                                viewMode === "inline"
                                    ? "bg-accent text-white"
                                    : "text-text-secondary hover:text-text-primary"
                            }`}
                            title="Inline View"
                        >
                            <Rows className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-border" />

                    {/* Stats / Filters */}
                    <div className="flex items-center gap-2 text-sm select-none">
                        <button
                            type="button"
                            onClick={() => onToggleStatus("added")}
                            className={getFilterStyle("added", "text-added")}
                            title="Toggle Added Rows"
                        >
                            <Plus className="w-3 h-3" />
                            {summary.added}
                        </button>
                        <button
                            type="button"
                            onClick={() => onToggleStatus("deleted")}
                            className={getFilterStyle(
                                "deleted",
                                "text-deleted",
                            )}
                            title="Toggle Deleted Rows"
                        >
                            <Minus className="w-3 h-3" />
                            {summary.deleted}
                        </button>
                        <button
                            type="button"
                            onClick={() => onToggleStatus("modified")}
                            className={getFilterStyle(
                                "modified",
                                "text-modified",
                            )}
                            title="Toggle Modified Rows"
                        >
                            <RefreshCw className="w-3 h-3" />
                            {summary.modified - insertAsNewCount}
                        </button>
                        {insertAsNewCount > 0 && (
                            <button
                                type="button"
                                onClick={() => onToggleStatus("newRow")}
                                className={getFilterStyle(
                                    "newRow",
                                    "text-blue-400",
                                )}
                                title="Toggle New Row (Insert as New)"
                            >
                                <Copy className="w-3 h-3" />
                                {insertAsNewCount}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onToggleStatus("unchanged")}
                            className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all border ${
                                visibleStatuses.has("unchanged")
                                    ? "bg-surface border-border text-text-secondary"
                                    : "text-text-muted border-transparent opacity-50 hover:opacity-100"
                            }`}
                            title="Toggle Unchanged Rows"
                        >
                            <span className="text-xs">●</span>
                            {summary.unchanged}
                        </button>
                    </div>
                </div>
            </div>

            {/* Row count and load controls */}
            {maxTotal > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-surface border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                        {hasMoreRows && (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-text-secondary">
                            Showing{" "}
                            <span className="font-medium text-text-primary">
                                {loadedRowCount}
                            </span>
                            {maxTotal > loadedRowCount && (
                                <>
                                    {" "}
                                    of{" "}
                                    <span className="font-medium text-text-primary">
                                        {maxTotal}
                                    </span>
                                </>
                            )}{" "}
                            rows
                            {hasMoreRows && (
                                <span className="text-yellow-500 ml-1">
                                    (partial data)
                                </span>
                            )}
                        </span>
                    </div>
                    {hasMoreRows && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onLoadMore}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary bg-surface border border-border rounded-lg hover:border-accent transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Load {rowLimit} more
                            </button>
                            <button
                                type="button"
                                onClick={onLoadAll}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent hover:text-accent-hover bg-accent/10 border border-accent/20 rounded-lg hover:border-accent transition-colors"
                            >
                                <Download className="w-3 h-3" />
                                Load all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
