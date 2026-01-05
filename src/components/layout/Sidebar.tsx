import {
	ChevronDown,
	ChevronRight,
	Database,
	Edit2,
	FileText,
	FolderTree,
	MoreVertical,
	Plug,
	Plus,
	Server,
	Trash2,
	Unplug,
} from "lucide-react";
import { useState } from "react";
import { useConnections } from "../../hooks/useConnections";
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

	const { connections, connectionStatuses, deleteConnection, disconnect } =
		useConnections();

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

	const handleModalClose = () => {
		setIsModalOpen(false);
		setEditingConnection(undefined);
	};

	const getStatusColor = (id: string) => {
		const status = connectionStatuses.get(id);
		switch (status?.status) {
			case "connected":
				return "bg-(--color-added)";
			case "connecting":
				return "bg-(--color-modified)";
			case "error":
				return "bg-(--color-deleted)";
			default:
				return "bg-(--color-text-muted)";
		}
	};

	return (
		<>
			<aside className="w-[280px] bg-(--color-surface) border-r border-(--color-border) flex flex-col">
				{/* Connections Header */}
				<div className="p-4 border-b border-(--color-border)">
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-sm font-medium text-(--color-text-secondary) uppercase tracking-wider">
							Connections
						</h2>
						<button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="p-1.5 rounded-md bg-(--color-accent) hover:bg-(--color-accent-hover) transition-colors"
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
							<div className="w-12 h-12 rounded-full bg-(--color-surface-elevated) flex items-center justify-center mb-3">
								<Database className="w-6 h-6 text-(--color-text-muted)" />
							</div>
							<p className="text-sm text-(--color-text-secondary) mb-1">
								No connections yet
							</p>
							<p className="text-xs text-(--color-text-muted)">
								Click + to add your first database
							</p>
						</div>
					) : (
						<div className="space-y-1">
							{connections.map((connection) => (
								<div key={connection.id} className="group relative">
									{/* Connection Row */}
									<button
										type="button"
										onClick={() => toggleExpanded(connection.id)}
										className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-(--color-text-primary) hover:bg-(--color-surface-elevated) transition-colors"
									>
										{expandedConnections.has(connection.id) ? (
											<ChevronDown className="w-4 h-4 text-(--color-text-muted)" />
										) : (
											<ChevronRight className="w-4 h-4 text-(--color-text-muted)" />
										)}
										{connection.type === "sqlite" ? (
											<FileText className="w-4 h-4 text-(--color-accent)" />
										) : (
											<Server className="w-4 h-4 text-(--color-accent)" />
										)}
										<span className="flex-1 text-left truncate">
											{connection.name}
										</span>
										<span
											className={`w-2 h-2 rounded-full ${getStatusColor(connection.id)}`}
										/>
									</button>

									{/* Context Menu Trigger */}
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											setContextMenuId(
												contextMenuId === connection.id ? null : connection.id,
											);
										}}
										className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-(--color-surface-elevated) transition-all"
									>
										<MoreVertical className="w-4 h-4 text-(--color-text-muted)" />
									</button>

									{/* Context Menu */}
									{contextMenuId === connection.id && (
										<div className="absolute right-0 top-8 z-10 w-40 bg-(--color-surface-elevated) border border-(--color-border) rounded-lg shadow-xl py-1">
											<button
												type="button"
												onClick={() => handleEdit(connection)}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-(--color-text-primary) hover:bg-(--color-surface) transition-colors"
											>
												<Edit2 className="w-4 h-4" />
												Edit
											</button>
											{connectionStatuses.get(connection.id)?.status ===
											"connected" ? (
												<button
													type="button"
													onClick={() => disconnect(connection.id)}
													className="w-full flex items-center gap-2 px-3 py-2 text-sm text-(--color-text-primary) hover:bg-(--color-surface) transition-colors"
												>
													<Unplug className="w-4 h-4" />
													Disconnect
												</button>
											) : (
												<button
													type="button"
													onClick={() => {
														/* TODO: connect */
													}}
													className="w-full flex items-center gap-2 px-3 py-2 text-sm text-(--color-text-primary) hover:bg-(--color-surface) transition-colors"
												>
													<Plug className="w-4 h-4" />
													Connect
												</button>
											)}
											<button
												type="button"
												onClick={() => handleDelete(connection.id)}
												className="w-full flex items-center gap-2 px-3 py-2 text-sm text-(--color-deleted) hover:bg-(--color-surface) transition-colors"
											>
												<Trash2 className="w-4 h-4" />
												Delete
											</button>
										</div>
									)}

									{/* Expanded Content (tables will go here) */}
									{expandedConnections.has(connection.id) && (
										<div className="ml-6 pl-2 border-l border-(--color-border)">
											<p className="text-xs text-(--color-text-muted) py-2">
												Connect to view tables
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* Quick Actions */}
				<div className="p-3 border-t border-(--color-border)">
					<button
						type="button"
						onClick={() => {
							setEditingConnection(undefined);
							setIsModalOpen(true);
						}}
						className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-(--color-text-secondary) hover:bg-(--color-surface-elevated) transition-colors"
					>
						<FolderTree className="w-4 h-4" />
						Browse Local SQLite
					</button>
				</div>
			</aside>

			{/* Close context menu when clicking outside */}
			{contextMenuId && (
				<div
					role="button"
					tabIndex={0}
					aria-label="Close menu"
					className="fixed inset-0 z-5"
					onClick={() => setContextMenuId(null)}
					onKeyDown={(e) => e.key === "Escape" && setContextMenuId(null)}
				/>
			)}

			<ConnectionFormModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				editConnection={editingConnection}
			/>
		</>
	);
}
