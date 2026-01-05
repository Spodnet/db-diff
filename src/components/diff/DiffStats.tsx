import { Columns, Minus, Plus, RefreshCw, Rows } from "lucide-react";

import type { TableDiffResult } from "../../lib/types";

interface DiffStatsProps {
	summary: TableDiffResult["summary"];
	viewMode: "side-by-side" | "inline";
	onViewModeChange: (mode: "side-by-side" | "inline") => void;
	tableName: string;
	sourceConnection: string;
	targetConnection: string;
}

export function DiffStats({
	summary,
	viewMode,
	onViewModeChange,
	tableName,
	sourceConnection,
	targetConnection,
}: DiffStatsProps) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-elevated">
			<div className="flex items-center gap-3">
				<h3 className="font-medium text-text-primary">{tableName}</h3>
				<span className="text-sm text-text-muted">
					{sourceConnection} → {targetConnection}
				</span>
			</div>
			<div className="flex items-center gap-4">
				{/* View Mode Toggle */}
				<div className="flex items-center gap-1 bg-surface rounded-lg p-0.5">
					<button
						type="button"
						onClick={() => onViewModeChange("side-by-side")}
						className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
							viewMode === "side-by-side"
								? "bg-accent text-white"
								: "text-text-secondary hover:text-text-primary"
						}`}
					>
						<Columns className="w-3 h-3" />
						Side by side
					</button>
					<button
						type="button"
						onClick={() => onViewModeChange("inline")}
						className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
							viewMode === "inline"
								? "bg-accent text-white"
								: "text-text-secondary hover:text-text-primary"
						}`}
					>
						<Rows className="w-3 h-3" />
						Inline
					</button>
				</div>
				{/* Stats */}
				<div className="flex items-center gap-4 text-sm">
					<span className="flex items-center gap-1 text-added">
						<Plus className="w-3 h-3" />
						{summary.added}
					</span>
					<span className="flex items-center gap-1 text-deleted">
						<Minus className="w-3 h-3" />
						{summary.deleted}
					</span>
					<span className="flex items-center gap-1 text-modified">
						<RefreshCw className="w-3 h-3" />
						{summary.modified}
					</span>
					<span className="text-text-muted">{summary.unchanged} unchanged</span>
				</div>
			</div>
		</div>
	);
}
