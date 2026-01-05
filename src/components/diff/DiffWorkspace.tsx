import { ChevronDown, GitCompare } from "lucide-react";

export function DiffWorkspace() {
	return (
		<div className="h-full flex flex-col p-6">
			{/* Source/Target Selection */}
			<div className="flex items-center gap-4 mb-6">
				{/* Source Selector */}
				<div className="flex-1">
					<span className="block text-xs font-medium text-(--color-text-muted) mb-1.5 uppercase tracking-wider">
						Source
					</span>
					<button
						type="button"
						className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-(--color-surface) border border-(--color-border) rounded-lg text-sm text-(--color-text-secondary) hover:border-(--color-accent) transition-colors"
					>
						<span>Select connection...</span>
						<ChevronDown className="w-4 h-4" />
					</button>
				</div>

				{/* Compare Arrow */}
				<div className="pt-6">
					<div className="w-10 h-10 rounded-full bg-(--color-accent) flex items-center justify-center">
						<GitCompare className="w-5 h-5 text-white" />
					</div>
				</div>

				{/* Target Selector */}
				<div className="flex-1">
					<span className="block text-xs font-medium text-(--color-text-muted) mb-1.5 uppercase tracking-wider">
						Target
					</span>
					<button
						type="button"
						className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-(--color-surface) border border-(--color-border) rounded-lg text-sm text-(--color-text-secondary) hover:border-(--color-accent) transition-colors"
					>
						<span>Select connection...</span>
						<ChevronDown className="w-4 h-4" />
					</button>
				</div>

				{/* Compare Button */}
				<div className="pt-6">
					<button
						type="button"
						disabled
						className="px-6 py-3 bg-(--color-accent) text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-(--color-accent-hover) transition-colors"
					>
						Compare
					</button>
				</div>
			</div>

			{/* Empty State */}
			<div className="flex-1 flex flex-col items-center justify-center bg-(--color-surface) rounded-xl border border-(--color-border)">
				<div className="w-20 h-20 rounded-full bg-(--color-surface-elevated) flex items-center justify-center mb-4">
					<GitCompare className="w-10 h-10 text-(--color-text-muted)" />
				</div>
				<h2 className="text-xl font-semibold text-(--color-text-primary) mb-2">
					Ready to Compare
				</h2>
				<p className="text-sm text-(--color-text-secondary) text-center max-w-md">
					Select a source and target database connection, then choose tables to
					compare their contents side by side.
				</p>
			</div>
		</div>
	);
}
