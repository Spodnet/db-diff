import { Database, HelpCircle, Settings } from "lucide-react";

export function Header() {
	return (
		<header className="h-14 bg-(--color-surface) border-b border-(--color-border) flex items-center justify-between px-4">
			<div className="flex items-center gap-3">
				<Database className="w-6 h-6 text-(--color-accent)" />
				<h1 className="text-lg font-semibold text-(--color-text-primary)">
					DB-Diff
				</h1>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					className="p-2 rounded-lg hover:bg-(--color-surface-elevated) transition-colors"
					aria-label="Settings"
				>
					<Settings className="w-5 h-5 text-(--color-text-secondary)" />
				</button>
				<button
					type="button"
					className="p-2 rounded-lg hover:bg-(--color-surface-elevated) transition-colors"
					aria-label="Help"
				>
					<HelpCircle className="w-5 h-5 text-(--color-text-secondary)" />
				</button>
			</div>
		</header>
	);
}
