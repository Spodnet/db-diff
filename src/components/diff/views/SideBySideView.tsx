import { useEffect, useState } from "react";
import { useColumnResizing } from "../../../hooks/useColumnResizing";
import type { ViewProps } from "../types";

export function SideBySideView({
    rows,
    columns,
    primaryKeyColumn,
    sourceConnection,
    targetConnection,
    getCellValue,
    getStatusBgClass,
    selectedRows,
    onToggleSelection,
    onSelectAll,
    allSelected,
    mergedCells,
    onMergeCell,
    insertAsNewRows,
    onToggleInsertAsNew,
    onToggleIgnoredColumn,
}: ViewProps) {
    const { columnWidths, setColumnWidths, startResizing, handleAutoResize } =
        useColumnResizing(); // Uses default "data-col"

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: "row" | "column";
        id: string; // primaryKey or columnName
    } | null>(null);

    // Initialize column widths
    useEffect(() => {
        const initialWidths: Record<string, number> = {};
        for (const col of columns) {
            initialWidths[col] = 150; // Default width
        }
        setColumnWidths(initialWidths);
    }, [columns, setColumnWidths]);

    const handleContextMenu = (e: React.MouseEvent, primaryKey: string) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: "row",
            id: primaryKey,
        });
    };

    const handleColumnContextMenu = (e: React.MouseEvent, column: string) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type: "column",
            id: column,
        });
    };

    const closeContextMenu = () => setContextMenu(null);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Source Side */}
            <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-surface">
                <div className="bg-surface-elevated px-3 py-2 border-b border-border flex-none">
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                        Source: {sourceConnection}
                    </span>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm table-fixed border-collapse">
                        <thead className="sticky top-0 bg-surface-elevated z-10 shadow-sm">
                            <tr>
                                <th className="px-2 py-2 w-8 min-w-8 max-w-8 border-b border-border text-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={onSelectAll}
                                        className="rounded border-border text-accent focus:ring-accent bg-surface"
                                    />
                                </th>
                                {columns.map((col) => (
                                    <th
                                        key={col}
                                        className="relative px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border group"
                                        style={{
                                            width: columnWidths[col],
                                            minWidth: columnWidths[col],
                                        }}
                                        onContextMenu={(e) =>
                                            handleColumnContextMenu(e, col)
                                        }
                                    >
                                        <div className="flex items-center gap-1 truncate">
                                            <span
                                                className="truncate"
                                                title={col}
                                            >
                                                {col}
                                            </span>
                                            {col === primaryKeyColumn && (
                                                <span className="flex-none text-accent">
                                                    🔑
                                                </span>
                                            )}
                                        </div>
                                        {/* Resizer */}
                                        {/* biome-ignore lint/a11y/noStaticElementInteractions: resizer needs mouse events */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 group-hover:bg-border transition-colors z-20"
                                            onMouseDown={(e) =>
                                                startResizing(
                                                    e,
                                                    col,
                                                    columnWidths[col] || 150,
                                                )
                                            }
                                            onDoubleClick={(e) =>
                                                handleAutoResize(e, col)
                                            }
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const isAdded = row.status === "added";
                                const isSelected = selectedRows.has(
                                    row.primaryKey,
                                );
                                const isInsertAsNew = insertAsNewRows?.has(
                                    row.primaryKey,
                                );
                                const isModified = row.status === "modified";

                                return (
                                    <tr
                                        key={row.primaryKey}
                                        className={`${getStatusBgClass(row.status)} ${isSelected ? "bg-accent/10" : ""} ${
                                            isInsertAsNew
                                                ? "bg-blue-500/10"
                                                : ""
                                        } border-b border-border/50 hover:bg-surface-elevated/50 transition-colors cursor-pointer h-[36.5px]`}
                                        onDoubleClick={() =>
                                            onToggleSelection(row.primaryKey)
                                        }
                                        onContextMenu={
                                            isModified
                                                ? (e) =>
                                                      handleContextMenu(
                                                          e,
                                                          row.primaryKey,
                                                      )
                                                : undefined
                                        }
                                    >
                                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopEvents needed for checkbox */}
                                        <td
                                            className="px-2 py-2 text-center"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {isInsertAsNew ? (
                                                <span title="Will insert as new row">
                                                    📥
                                                </span>
                                            ) : (
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        onToggleSelection(
                                                            row.primaryKey,
                                                        )
                                                    }
                                                    className="rounded border-border text-accent focus:ring-accent bg-surface cursor-pointer"
                                                />
                                            )}
                                        </td>
                                        {columns.map((col) => {
                                            const cellDiff = row.cellDiffs.find(
                                                (c) => c.column === col,
                                            );
                                            const isCellModified =
                                                cellDiff?.status === "modified";
                                            const isMerged = mergedCells
                                                ?.get(row.primaryKey)
                                                ?.has(col);
                                            const isDeleted =
                                                row.status === "deleted";

                                            return (
                                                <td
                                                    key={col}
                                                    className={`px-2 py-2 font-mono text-xs truncate border-r border-border/20 last:border-r-0 ${
                                                        isAdded
                                                            ? "text-text-muted"
                                                            : isDeleted
                                                              ? "text-deleted"
                                                              : isMerged
                                                                ? "text-text-primary bg-accent/20 font-medium"
                                                                : isCellModified
                                                                  ? "text-modified bg-modified-bg/50 font-medium"
                                                                  : "text-text-primary"
                                                    }`}
                                                    style={{ maxWidth: 0 }} // Allow truncate to work with table-fixed
                                                >
                                                    {/* biome-ignore lint/a11y/noStaticElementInteractions: clickable for merge */}
                                                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: click only */}
                                                    <div
                                                        data-col={col}
                                                        className={`truncate flex items-center gap-1 ${
                                                            isCellModified &&
                                                            !isMerged
                                                                ? "cursor-pointer hover:text-accent hover:underline"
                                                                : ""
                                                        }`}
                                                        title={
                                                            isCellModified
                                                                ? "Click to merge this cell"
                                                                : !isAdded
                                                                  ? getCellValue(
                                                                        row,
                                                                        col,
                                                                        "source",
                                                                    )
                                                                  : undefined
                                                        }
                                                        onClick={(e) => {
                                                            if (
                                                                isCellModified
                                                            ) {
                                                                e.stopPropagation();
                                                                onMergeCell?.(
                                                                    row.primaryKey,
                                                                    col,
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        {isMerged && (
                                                            <span className="text-accent">
                                                                ✓
                                                            </span>
                                                        )}
                                                        {isAdded ? (
                                                            "—"
                                                        ) : isInsertAsNew &&
                                                          col ===
                                                              primaryKeyColumn ? (
                                                            <span className="text-blue-400 text-[10px] font-bold tracking-wide">
                                                                NEW
                                                            </span>
                                                        ) : (
                                                            getCellValue(
                                                                row,
                                                                col,
                                                                "source",
                                                            )
                                                        )}
                                                    </div>
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

            {/* Target Side */}
            <div className="flex-1 flex flex-col min-w-0 bg-surface">
                <div className="bg-surface-elevated px-3 py-2 border-b border-border flex-none">
                    <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                        Target: {targetConnection}
                    </span>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm table-fixed border-collapse">
                        <thead className="sticky top-0 bg-surface-elevated z-10 shadow-sm">
                            <tr>
                                <th className="h-[37px] px-2 py-2 w-8 min-w-8 max-w-8 border-b border-border" />
                                {columns.map((col) => (
                                    <th
                                        key={col}
                                        className="relative px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border group"
                                        style={{
                                            width: columnWidths[col],
                                            minWidth: columnWidths[col],
                                        }}
                                        onContextMenu={(e) =>
                                            handleColumnContextMenu(e, col)
                                        }
                                    >
                                        <div className="flex items-center gap-1 truncate">
                                            <span
                                                className="truncate"
                                                title={col}
                                            >
                                                {col}
                                            </span>
                                            {col === primaryKeyColumn && (
                                                <span className="flex-none text-accent">
                                                    🔑
                                                </span>
                                            )}
                                        </div>
                                        {/* Resizer */}
                                        {/* biome-ignore lint/a11y/noStaticElementInteractions: resizer needs mouse events */}
                                        <div
                                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 group-hover:bg-border transition-colors z-20"
                                            onMouseDown={(e) =>
                                                startResizing(
                                                    e,
                                                    col,
                                                    columnWidths[col] || 150,
                                                )
                                            }
                                            onDoubleClick={(e) =>
                                                handleAutoResize(e, col)
                                            }
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const isAdded = row.status === "added";
                                const isModified = row.status === "modified";
                                const isDeleted = row.status === "deleted";
                                const isSelected = selectedRows.has(
                                    row.primaryKey,
                                );

                                return (
                                    <tr
                                        key={row.primaryKey}
                                        className={`border-b border-border/50 ${isSelected ? "bg-accent/5" : ""} ${
                                            isAdded
                                                ? "bg-added-bg"
                                                : isModified
                                                  ? "bg-modified-bg/30"
                                                  : ""
                                        } h-[36.5px]`}
                                        onDoubleClick={() =>
                                            onToggleSelection(row.primaryKey)
                                        }
                                    >
                                        <td className="px-2 py-2 text-center" />
                                        {columns.map((col) => {
                                            const cellDiff = row.cellDiffs.find(
                                                (c) => c.column === col,
                                            );
                                            const isCellModified =
                                                cellDiff?.status === "modified";

                                            return (
                                                <td
                                                    key={col}
                                                    className={`px-2 py-2 font-mono text-xs truncate border-r border-border/20 last:border-r-0 ${
                                                        isDeleted
                                                            ? "text-text-muted"
                                                            : isAdded
                                                              ? "text-added"
                                                              : isCellModified
                                                                ? "text-modified bg-modified-bg/50 font-medium"
                                                                : "text-text-primary"
                                                    }`}
                                                    style={{ maxWidth: 0 }} // Allow truncate
                                                >
                                                    <div
                                                        data-col={col}
                                                        className="truncate"
                                                        title={
                                                            !isDeleted
                                                                ? getCellValue(
                                                                      row,
                                                                      col,
                                                                      "target",
                                                                  )
                                                                : undefined
                                                        }
                                                    >
                                                        {isDeleted
                                                            ? "—"
                                                            : getCellValue(
                                                                  row,
                                                                  col,
                                                                  "target",
                                                              )}
                                                    </div>
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

            {/* Context Menu */}
            {contextMenu && (
                <>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay click close */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop */}
                    <div
                        className="fixed inset-0 z-50"
                        onClick={closeContextMenu}
                    />
                    <div
                        className="fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
                        {contextMenu.type === "row" ? (
                            <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                                onClick={() => {
                                    onToggleInsertAsNew?.(contextMenu.id);
                                    closeContextMenu();
                                }}
                            >
                                {insertAsNewRows?.has(contextMenu.id) ? (
                                    <>
                                        <span>↩️</span>
                                        <span>Unmark as New Row</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📥</span>
                                        <span>Mark as New Row</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-text-secondary hover:text-text-primary"
                                onClick={() => {
                                    onToggleIgnoredColumn?.(contextMenu.id);
                                    closeContextMenu();
                                }}
                            >
                                <span>🚫</span>
                                <span>Ignore Column '{contextMenu.id}'</span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
