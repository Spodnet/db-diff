import {
    ChevronDown,
    ChevronRight,
    Database,
    Edit2,
    FileText,
    Loader2,
    MoreVertical,
    Plug,
    Plus,
    RefreshCw,
    Server,
    Table,
    Trash2,
    Unplug,
} from "lucide-react";
import { useState } from "react";
import { useConnections } from "../../hooks/useConnections";
import { useView } from "../../hooks/useView";
import type { Connection } from "../../lib/types";
import { ConnectionFormModal } from "../connections/ConnectionFormModal";

export function Sidebar() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<
        Connection | undefined
    >();
    const [expandedConnections, setExpandedConnections] = useState<Set<string>>(
        new Set(),
    );
    const [contextMenuId, setContextMenuId] = useState<string | null>(null);

    const {
        connections,
        connectionStatuses,
        connectionTables,
        deleteConnection,
        disconnect,
        connectTo,
        fetchTables,
        tableLoadingStatuses,
    } = useConnections();

    const { openTableTab } = useView();

    const toggleExpanded = (id: string) => {
        setExpandedConnections((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleEdit = (connection: Connection) => {
        setEditingConnection(connection);
        setIsModalOpen(true);
        setContextMenuId(null);
    };

    const handleDelete = (id: string) => {
        deleteConnection(id);
        setContextMenuId(null);
    };

    const handleConnect = async (connection: Connection) => {
        setContextMenuId(null);
        await connectTo(connection);
        setExpandedConnections((prev) => new Set(prev).add(connection.id));
    };

    const handleDisconnect = async (connection: Connection) => {
        setContextMenuId(null);
        await disconnect(connection);
    };

    const handleRefresh = async (connection: Connection) => {
        setContextMenuId(null);
        await fetchTables(connection);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingConnection(undefined);
    };

    const getStatusColor = (id: string) => {
        const status = connectionStatuses.get(id);
        switch (status?.status) {
            case "connected":
                return "bg-added";
            case "connecting":
                return "bg-modified";
            case "error":
                return "bg-deleted";
            default:
                return "bg-text-muted";
        }
    };

    const getStatusIndicator = (id: string) => {
        const status = connectionStatuses.get(id);
        if (status?.status === "connecting") {
            return <Loader2 className="w-3 h-3 animate-spin text-modified" />;
        }
        return (
            <span className={`w-2 h-2 rounded-full ${getStatusColor(id)}`} />
        );
    };

    return (
        <>
            <aside className="w-sidebar  bg-surface border-r border-border flex flex-col">
                {/* Connections Header */}
                <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
                            Connections
                        </h2>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="p-1.5 rounded-md bg-accent hover:bg-accent-hover transition-colors"
                            aria-label="Add connection"
                        >
                            <Plus className="w-4 h-4 text-white" />
                        </button>
                    </div>
                </div>

                {/* Connection Tree */}
                <div className="flex-1 overflow-auto p-2">
                    {connections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center mb-3">
                                <Database className="w-6 h-6 text-text-muted" />
                            </div>
                            <p className="text-sm text-text-secondary mb-1">
                                No connections yet
                            </p>
                            <p className="text-xs text-text-muted">
                                Click + to add your first database
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {connections.map((connection) => {
                                const status = connectionStatuses.get(
                                    connection.id,
                                );
                                const tables = connectionTables.get(
                                    connection.id,
                                );
                                const isConnected =
                                    status?.status === "connected";
                                const isExpanded = expandedConnections.has(
                                    connection.id,
                                );

                                return (
                                    <div
                                        key={connection.id}
                                        className="group relative"
                                    >
                                        {/* Connection Row - restructured flex layout */}
                                        <div className="flex items-center gap-1 pr-1">
                                            {/* Main clickable area */}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleExpanded(
                                                        connection.id,
                                                    )
                                                }
                                                className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-text-primary hover:bg-surface-elevated transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 text-text-muted" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 text-text-muted" />
                                                )}
                                                {connection.type ===
                                                "sqlite" ? (
                                                    <FileText
                                                        className="w-4 h-4"
                                                        style={{
                                                            color:
                                                                connection.color ||
                                                                "var(--color-accent)",
                                                        }}
                                                    />
                                                ) : (
                                                    <Server
                                                        className="w-4 h-4"
                                                        style={{
                                                            color:
                                                                connection.color ||
                                                                "var(--color-accent)",
                                                        }}
                                                    />
                                                )}
                                                <span className="flex-1 text-left truncate">
                                                    {connection.name}
                                                </span>
                                            </button>
                                            {/* Menu button - fixed position between name and status */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setContextMenuId(
                                                        contextMenuId ===
                                                            connection.id
                                                            ? null
                                                            : connection.id,
                                                    );
                                                }}
                                                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-elevated transition-all"
                                                aria-label="Connection options"
                                            >
                                                <MoreVertical className="w-4 h-4 text-text-muted" />
                                            </button>
                                            {/* Status indicator - fixed width for alignment */}
                                            <div className="w-5 flex justify-center">
                                                {getStatusIndicator(
                                                    connection.id,
                                                )}
                                            </div>
                                        </div>

                                        {/* Context Menu */}
                                        {contextMenuId === connection.id && (
                                            <div className="absolute right-0 top-8 z-10 w-40 bg-surface-elevated border border-border rounded-lg shadow-xl py-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRefresh(
                                                            connection,
                                                        )
                                                    }
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                                                >
                                                    <RefreshCw className="w-4 h-4" />
                                                    Refresh
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleEdit(connection)
                                                    }
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Edit
                                                </button>
                                                {isConnected ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDisconnect(
                                                                connection,
                                                            )
                                                        }
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                                                    >
                                                        <Unplug className="w-4 h-4" />
                                                        Disconnect
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleConnect(
                                                                connection,
                                                            )
                                                        }
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
                                                    >
                                                        <Plug className="w-4 h-4" />
                                                        Connect
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleDelete(
                                                            connection.id,
                                                        )
                                                    }
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-deleted hover:bg-surface transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        )}

                                        {/* Expanded Content - Tables */}
                                        {isExpanded && (
                                            <div className="ml-6 pl-2 border-l border-border">
                                                {!isConnected ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleConnect(
                                                                connection,
                                                            )
                                                        }
                                                        className="flex items-center gap-2 text-xs text-text-muted py-2 hover:text-accent transition-colors"
                                                    >
                                                        <Plug className="w-3 h-3" />
                                                        Click to connect
                                                    </button>
                                                ) : tableLoadingStatuses.get(
                                                      connection.id,
                                                  ) ? (
                                                    <div className="flex items-center gap-2 text-xs text-text-muted py-2">
                                                        <Loader2 className="w-3 h-3 animate-spin text-accent" />
                                                        <span>
                                                            Fetching tables...
                                                        </span>
                                                    </div>
                                                ) : tables &&
                                                  tables.length > 0 ? (
                                                    <div className="py-1 space-y-0.5">
                                                        {tables.map((table) => (
                                                            <button
                                                                key={table.name}
                                                                type="button"
                                                                onDoubleClick={() =>
                                                                    openTableTab(
                                                                        connection,
                                                                        table.name,
                                                                    )
                                                                }
                                                                className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
                                                            >
                                                                <Table className="w-3 h-3 text-text-muted" />
                                                                <span className="flex-1 text-left truncate">
                                                                    {table.name}
                                                                </span>
                                                                <span className="text-text-muted">
                                                                    {table.rowCount.toLocaleString()}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-text-muted py-2">
                                                        No tables found
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </aside>

            {/* Close context menu when clicking outside */}
            {contextMenuId && (
                <button
                    type="button"
                    aria-label="Close menu"
                    className="fixed inset-0 z-5 cursor-default"
                    onClick={() => setContextMenuId(null)}
                    onKeyDown={(e) =>
                        e.key === "Escape" && setContextMenuId(null)
                    }
                />
            )}

            <ConnectionFormModal
                // Force re-render when switching connection to reset form state
                key={editingConnection?.id || "new"}
                isOpen={isModalOpen}
                onClose={handleModalClose}
                editConnection={editingConnection}
            />
        </>
    );
}
