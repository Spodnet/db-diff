import { CheckSquare, ChevronDown, Database, Square } from "lucide-react";
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
    isOpen: boolean;
    onToggle: () => void;
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
    isOpen,
    onToggle,
}: ConnectionSelectorProps) {
    return (
        <div className="flex-1">
            <span className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">
                {label}
            </span>
            <div className="space-y-2">
                {/* Connection Dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={onToggle}
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
                    {isOpen && (
                        <div className="absolute z-10 top-full mt-1 w-full bg-surface-elevated border border-border rounded-lg shadow-xl py-1">
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
                    <div className="relative">
                        <button
                            type="button"
                            onClick={onToggle}
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

                        {isOpen && (
                            <div className="absolute z-10 top-full mt-1 w-full bg-surface-elevated border border-border rounded-lg shadow-xl py-1 max-h-[300px] flex flex-col">
                                {tables.length === 0 ? (
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
