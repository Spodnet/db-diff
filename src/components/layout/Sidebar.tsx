import { Database, FolderTree, Plus } from "lucide-react";

export function Sidebar() {
	return (
		<aside className="w-[280px] bg-(--color-surface) border-r border-(--color-border) flex flex-col">
			{/* Connections Header */}
			<div className="p-4 border-b border-(--color-border)">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-sm font-medium text-(--color-text-secondary) uppercase tracking-wider">
						Connections
					</h2>
					<button
						type="button"
						className="p-1.5 rounded-md bg-(--color-accent) hover:bg-(--color-accent-hover) transition-colors"
						aria-label="Add connection"
					>
						<Plus className="w-4 h-4 text-white" />
					</button>
				</div>
			</div>

			{/* Connection Tree */}
			<div className="flex-1 overflow-auto p-2">
				{/* Empty state */}
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
			</div>

			{/* Quick Actions */}
			<div className="p-3 border-t border-(--color-border)">
				<button
					type="button"
					className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-(--color-text-secondary) hover:bg-(--color-surface-elevated) transition-colors"
				>
					<FolderTree className="w-4 h-4" />
					Browse Local SQLite
				</button>
			</div>
		</aside>
	);
}
