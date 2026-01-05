export function StatusBar() {
	return (
		<footer className="h-8 bg-surface border-t border-border flex items-center justify-between px-4 text-xs text-text-muted">
			<div className="flex items-center gap-4">
				<span>Ready</span>
			</div>
			<div className="flex items-center gap-4">
				<span>v0.1.0</span>
			</div>
		</footer>
	);
}
