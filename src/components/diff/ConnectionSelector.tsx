import {
    CheckSquare,
    ChevronDown,
    Database,
    Loader2,
    Square,
} from "lucide-react";
import { useRef } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import type { Connection, ConnectionStatus, TableInfo } from "../../lib/types";

interface ConnectionSelectorProps {
    label: string;
    connections: Connection[];
    connectionStatuses: Map<string, ConnectionStatus>;
    selectedConnection?: Connection;
    onConnectionClick: (connection: Connection) => void;
    tables: TableInfo[];
    selectedTableNames: string[];

    onTableSelect: (tableNames: string[]) => void;
    isConnectionOpen: boolean;
    onToggleConnection: () => void;
    isTableOpen: boolean;
    onToggleTable: () => void;
    isLoading?: boolean;
}

export function ConnectionSelector({
    label,
    connections,
    connectionStatuses,
    selectedConnection,
    onConnectionClick,
    tables,
    selectedTableNames,
    onTableSelect,
    isConnectionOpen,
    onToggleConnection,
    isTableOpen,
    onToggleTable,
    isLoading,
}: ConnectionSelectorProps) {
    const connectionRef = useRef<HTMLDivElement>(null);
    const tableRef = useRef<HTMLDivElement>(null);

    useClickOutside(connectionRef, onToggleConnection, isConnectionOpen);
    useClickOutside(tableRef, onToggleTable, isTableOpen);

    return (
        <div className="flex-1">
            <span className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                {label}
            </span>
            <div className="space-y-2">
                {/* Connection Dropdown */}
                <div className="relative" ref={connectionRef}>
                    <button
                        type="button"
                        onClick={onToggleConnection}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface border border-border rounded-lg text-sm hover:border-accent transition-colors"
                    >
                        <span
                            className={
                                selectedConnection
                                    ? "text-text-primary"
                                    : "text-text-secondary"
                            }
                        >
                            {selectedConnection?.name || "Select connection..."}
                        </span>
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                    </button>
                    {isConnectionOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-surface-elevated border border-border rounded-lg shadow-xl py-1">
                            {connections.length === 0 ? (
                                <p className="px-4 py-2 text-sm text-text-muted">
                                    No connections available
                                </p>
                            ) : (
                                connections.map((conn) => {
                                    const status = connectionStatuses.get(
                                        conn.id,
                                    );
                                    const isConnected =
                                        status?.status === "connected";
                                    return (
                                        <button
                                            key={conn.id}
                                            type="button"
                                            onClick={() =>
                                                onConnectionClick(conn)
                                            }
                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                                        >
                                            <Database className="w-4 h-4 text-accent" />
                                            <span className="flex-1 text-left">
                                                {conn.name}
                                            </span>
                                            {isConnected ? (
                                                <span className="w-2 h-2 rounded-full bg-added" />
                                            ) : (
                                                <span className="text-xs text-text-muted">
                                                    Connect
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
                {/* Table Dropdown */}
                {selectedConnection && (
                    <div className="relative" ref={tableRef}>
                        <button
                            type="button"
                            onClick={onToggleTable}
                            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-surface border border-border rounded-lg text-sm hover:border-accent transition-colors"
                        >
                            <span
                                className={
                                    selectedTableNames.length > 0
                                        ? "text-text-primary"
                                        : "text-text-secondary"
                                }
                            >
                                {selectedTableNames.length === 0
                                    ? "Select tables..."
                                    : selectedTableNames.length === 1
                                      ? selectedTableNames[0]
                                      : `${selectedTableNames.length} tables selected`}
                            </span>
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                        </button>
                        {isTableOpen && (
                            <div className="absolute z-50 top-full mt-1 w-full bg-surface-elevated border border-border rounded-lg shadow-xl py-1 max-h-[300px] flex flex-col">
                                {isLoading ? (
                                    <div className="px-4 py-8 flex flex-col items-center justify-center text-text-muted gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                                        <span className="text-sm">
                                            Fetching tables...
                                        </span>
                                    </div>
                                ) : tables.length === 0 ? (
                                    <p className="px-4 py-2 text-sm text-text-muted">
                                        No tables found
                                    </p>
                                ) : (
                                    <>
                                        <div className="flex border-b border-border p-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onTableSelect(
                                                        tables.map(
                                                            (t) => t.name,
                                                        ),
                                                    )
                                                }
                                                className="text-xs text-accent hover:text-accent-hover font-medium"
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onTableSelect([])
                                                }
                                                className="text-xs text-text-muted hover:text-text-primary"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                        <div className="overflow-y-auto">
                                            {tables.map((table) => {
                                                const isSelected =
                                                    selectedTableNames.includes(
                                                        table.name,
                                                    );
                                                return (
                                                    <button
                                                        key={table.name}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                onTableSelect(
                                                                    selectedTableNames.filter(
                                                                        (n) =>
                                                                            n !==
                                                                            table.name,
                                                                    ),
                                                                );
                                                            } else {
                                                                onTableSelect([
                                                                    ...selectedTableNames,
                                                                    table.name,
                                                                ]);
                                                            }
                                                        }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare className="w-4 h-4 text-accent" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-text-muted" />
                                                        )}
                                                        <span className="flex-1 text-left">
                                                            {table.name}{" "}
                                                            <span className="text-text-muted text-xs">
                                                                (
                                                                {table.rowCount}
                                                                )
                                                            </span>
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
