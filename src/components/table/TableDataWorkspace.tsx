import {
    ArrowLeft,
    ArrowRight,
    Database,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useColumnResizing } from "../../hooks/useColumnResizing";
import { useConnections } from "../../hooks/useConnections";
import { useView } from "../../hooks/useView";
import type { Connection } from "../../lib/types";
import { formatCellValue } from "../../lib/utils";

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

    const { columnWidths, setColumnWidths, startResizing, handleAutoResize } =
        useColumnResizing("data-col-id");

    const { connectionTables } = useConnections();
    const { presetDiff } = useView();

    const handleUseAsSource = () => {
        const tables = connectionTables.get(connection.id) || [];
        const tableInfo = tables.find((t) => t.name === tableName);
        if (tableInfo) {
            presetDiff({
                sourceConnection: connection,
                sourceTable: tableInfo,
            });
        }
    };

    const handleUseAsTarget = () => {
        const tables = connectionTables.get(connection.id) || [];
        const tableInfo = tables.find((t) => t.name === tableName);
        if (tableInfo) {
            presetDiff({
                targetConnection: connection,
                targetTable: tableInfo,
            });
        }
    };

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
                // Initialize default column widths
                if (result.rows.length > 0) {
                    const initials: Record<string, number> = {};
                    for (const key of Object.keys(result.rows[0])) {
                        initials[key] = 150; // Default width
                    }
                    setColumnWidths(initials);
                }
            } else {
                setError(result.error || "Failed to fetch table data");
            }
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Failed to fetch table data",
            );
        } finally {
            setLoading(false);
        }
    }, [connection.id, connection.type, tableName, setColumnWidths]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="h-full flex flex-col bg-surface">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated">
                <div className="flex items-center gap-4">
                    <div>
                        <h2 className="text-lg font-medium text-text-primary flex items-center gap-2">
                            <Database
                                className="w-5 h-5"
                                style={{
                                    color:
                                        connection.color ||
                                        "var(--color-accent)",
                                }}
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
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
                        title="Use as Source for Comparison"
                    >
                        <ArrowRight className="w-4 h-4" />
                        Use as source
                    </button>
                    <button
                        type="button"
                        onClick={handleUseAsTarget}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
                        title="Use as Target for Comparison"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Use as target
                    </button>
                    <div className="w-px h-6 bg-border mx-1" />
                    <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors disabled:opacity-50"
                        title="Refresh Data"
                    >
                        <RefreshCw
                            className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                        />
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
                        <p className="text-text-secondary">
                            Loading table data...
                        </p>
                    </div>
                ) : data && data.rows.length > 0 ? (
                    <div className="bg-surface border border-border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left table-fixed">
                                <thead className="bg-surface-elevated text-text-muted font-medium border-b border-border">
                                    <tr>
                                        {Object.keys(data.rows[0]).map(
                                            (header) => (
                                                <th
                                                    key={header}
                                                    className="relative px-4 py-3 whitespace-nowrap group"
                                                    style={{
                                                        width: columnWidths[
                                                            header
                                                        ],
                                                        minWidth:
                                                            columnWidths[
                                                                header
                                                            ],
                                                    }}
                                                >
                                                    <span className="truncate block">
                                                        {header}
                                                    </span>
                                                    {/* Resizer */}
                                                    {/* biome-ignore lint/a11y/noStaticElementInteractions: resizer needs mouse events */}
                                                    <div
                                                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 group-hover:bg-border transition-colors z-20"
                                                        onMouseDown={(e) =>
                                                            startResizing(
                                                                e,
                                                                header,
                                                                columnWidths[
                                                                    header
                                                                ] || 150,
                                                            )
                                                        }
                                                        onDoubleClick={(e) =>
                                                            handleAutoResize(
                                                                e,
                                                                header,
                                                            )
                                                        }
                                                    />
                                                </th>
                                            ),
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.rows.map((row) => (
                                        <tr
                                            key={JSON.stringify(
                                                Object.values(row),
                                            )}
                                            className="hover:bg-surface-elevated/50"
                                        >
                                            {Object.entries(row).map(
                                                ([key, cell], j) => {
                                                    return (
                                                        <td
                                                            key={`${String(cell)}-${j}`}
                                                            className="px-4 py-3 text-text-primary whitespace-nowrap overflow-hidden text-ellipsis"
                                                            data-col-id={key}
                                                        >
                                                            {cell === null ? (
                                                                <span className="text-text-muted italic">
                                                                    NULL
                                                                </span>
                                                            ) : (
                                                                formatCellValue(
                                                                    cell,
                                                                )
                                                            )}
                                                        </td>
                                                    );
                                                },
                                            )}
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
