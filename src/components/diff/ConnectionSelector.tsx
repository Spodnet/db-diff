import { ChevronDown, Database } from "lucide-react";
import type { Connection, ConnectionStatus, TableInfo } from "../../lib/types";

interface ConnectionSelectorProps {
    label: string;
    connections: Connection[];
    connectionStatuses: Map<string, ConnectionStatus>;
    selectedConnection?: Connection;
    onConnectionClick: (connection: Connection) => void;
    tables: TableInfo[];
    selectedTableName: string | null;
    onTableSelect: (tableName: string | null) => void;
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
    selectedTableName,
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
                        <select
                            value={selectedTableName || ""}
                            onChange={(e) =>
                                onTableSelect(e.target.value || null)
                            }
                            className="w-full px-4 py-3 pr-10 bg-surface border border-border rounded-lg text-sm text-text-primary appearance-none focus:border-accent focus:outline-none cursor-pointer"
                        >
                            <option value="">Select table...</option>
                            {tables.map((table) => (
                                <option key={table.name} value={table.name}>
                                    {table.name} ({table.rowCount} rows)
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                    </div>
                )}
            </div>
        </div>
    );
}
