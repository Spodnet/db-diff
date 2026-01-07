import { useEffect, useRef, useState } from "react";
import { getStatusBgClass } from "../statusUtils";
import type { ViewProps } from "../types";

export function InlineView({
    rows,
    columns,
    primaryKeyColumn,
    getCellValue,
    selectedRows,
    onToggleSelection,
    onSelectAll,
    allSelected,
    onToggleIgnoredColumn,
}: ViewProps) {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
        {},
    );
    const resizingRef = useRef<{
        column: string;
        startX: number;
        startWidth: number;
    } | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        type: "column";
        id: string;
    } | null>(null);

    // Initialize column widths
    useEffect(() => {
        const initialWidths: Record<string, number> = {};
        for (const col of columns) {
            initialWidths[col] = 150; // Default width
        }
        setColumnWidths(initialWidths);
    }, [columns]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            const { column, startX, startWidth } = resizingRef.current;
            const diff = e.pageX - startX;
            const newWidth = Math.max(50, startWidth + diff); // Min width 50px
            setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = null;
                document.body.style.cursor = "";
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, []);

    const startResizing = (
        e: React.MouseEvent,
        column: string,
        width: number,
    ) => {
        e.preventDefault();
        resizingRef.current = { column, startX: e.pageX, startWidth: width };
        document.body.style.cursor = "col-resize";
    };

    const handleAutoResize = (e: React.MouseEvent, column: string) => {
        e.preventDefault();
        e.stopPropagation();

        // Find all cells for this column
        const cells = document.querySelectorAll(`[data-col="${column}"]`);
        if (cells.length === 0) return;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) return;

        // Get font directly from element to be accurate
        const font = window.getComputedStyle(cells[0]).font;
        context.font = font || "12px monospace";

        // Measure header width first (approximate with column name)
        let maxWidth = context.measureText(column).width + 32; // Header needs bit more space for icons

        // Measure all cell contents
        for (const cell of cells) {
            const text = cell.textContent || "";
            const width = context.measureText(text).width;
            // Add 24px buffer (padding + potential icons)
            maxWidth = Math.max(maxWidth, width + 24);
        }

        // Cap between 60px and 600px
        const newWidth = Math.max(60, Math.min(600, maxWidth));
        setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
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
        <div className="relative">
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
                                    <span className="truncate" title={col}>
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
                        const isSelected = selectedRows.has(row.primaryKey);
                        return (
                            <tr
                                key={row.primaryKey}
                                className={`${getStatusBgClass(row.status)} ${
                                    isSelected ? "bg-accent/10" : ""
                                } border-b border-border/50 hover:bg-surface-elevated/50 transition-colors cursor-pointer h-[36.5px]`}
                                onClick={() =>
                                    onToggleSelection(row.primaryKey)
                                }
                            >
                                {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopEvents needed for checkbox */}
                                <td
                                    className="px-2 py-2 text-center"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() =>
                                            onToggleSelection(row.primaryKey)
                                        }
                                        className="rounded border-border text-accent focus:ring-accent bg-surface cursor-pointer"
                                    />
                                </td>
                                {row.cellDiffs.map((cell) => (
                                    <td
                                        key={cell.column}
                                        className={`px-2 py-2 font-mono text-xs truncate border-r border-border/20 last:border-r-0 ${
                                            cell.status === "modified"
                                                ? "text-modified font-medium"
                                                : row.status === "added"
                                                  ? "text-added"
                                                  : row.status === "deleted"
                                                    ? "text-deleted line-through"
                                                    : "text-text-primary"
                                        }`}
                                        style={{ maxWidth: 0 }} // Allow truncate to work with table-fixed
                                    >
                                        <div
                                            data-col={cell.column}
                                            className="truncate"
                                        >
                                            {row.status === "modified" &&
                                            cell.status === "modified" ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-deleted line-through opacity-75 text-[10px]">
                                                        {getCellValue(
                                                            row,
                                                            cell.column,
                                                            "source",
                                                        )}
                                                    </span>
                                                    <span className="text-added">
                                                        {getCellValue(
                                                            row,
                                                            cell.column,
                                                            "target",
                                                        )}
                                                    </span>
                                                </div>
                                            ) : row.status === "added" ? (
                                                getCellValue(
                                                    row,
                                                    cell.column,
                                                    "target",
                                                )
                                            ) : row.status === "deleted" ? (
                                                getCellValue(
                                                    row,
                                                    cell.column,
                                                    "source",
                                                )
                                            ) : (
                                                getCellValue(
                                                    row,
                                                    cell.column,
                                                    "source",
                                                )
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {contextMenu && (
                <>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay */}
                    <div
                        className="fixed inset-0 z-50"
                        onClick={closeContextMenu}
                    />
                    <div
                        className="fixed z-50 bg-surface-elevated border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                    >
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
                    </div>
                </>
            )}
        </div>
    );
}
