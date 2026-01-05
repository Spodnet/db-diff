import { GitCompare, Table as TableIcon, X } from "lucide-react";
import { useView } from "../../hooks/useView";

export function TabBar() {
	const { tabs, activeTabId, activateTab, closeTab } = useView();

	return (
		<div
			role="tablist"
			className="flex items-center bg-surface border-b border-border overflow-x-auto no-scrollbar"
		>
			{tabs.map((tab) => {
				const isActive = tab.id === activeTabId;
				return (
					<div
						key={tab.id}
						role="tab"
						aria-selected={isActive}
						tabIndex={isActive ? 0 : -1}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								activateTab(tab.id);
							}
						}}
						className={`
                            group flex items-center gap-2 px-4 py-2 text-sm font-medium border-r border-border cursor-pointer select-none transition-colors min-w-[120px] max-w-[200px] relative
                            ${
															isActive
																? "bg-background text-text-primary"
																: "bg-surface-elevated text-text-secondary hover:bg-surface hover:text-text-primary"
														}
                        `}
						style={{
							borderTopWidth: "2px",
							borderTopColor: isActive
								? tab.type === "diff"
									? "var(--color-accent)"
									: tab.data?.connection.color || "var(--color-accent)"
								: "transparent",
						}}
						onClick={() => activateTab(tab.id)}
					>
						{tab.type === "diff" ? (
							<GitCompare
								className={`w-4 h-4 ${isActive ? "text-accent" : "text-text-muted"}`}
							/>
						) : (
							<TableIcon
								className="w-4 h-4"
								style={{
									color:
										tab.data?.connection.color || "var(--color-text-muted)",
								}}
							/>
						)}
						<span className="truncate flex-1">{tab.label}</span>
						{tab.type !== "diff" && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									closeTab(tab.id);
								}}
								className={`
                                    p-0.5 rounded-full hover:bg-surface-elevated transition-colors
                                    ${isActive ? "text-text-secondary" : "text-text-muted opacity-0 group-hover:opacity-100"}
                                `}
							>
								<X className="w-3 h-3" />
							</button>
						)}
					</div>
				);
			})}
		</div>
	);
}
