import type { ViewProps } from "../types";

export function InlineView({
	rows,
	columns,
	primaryKeyColumn,
	getCellValue,
	getStatusBgClass,
	getStatusTextClass,
	getStatusIcon,
	selectedRows,
	onToggleSelection,
	onSelectAll,
	allSelected,
}: ViewProps) {
	return (
		<table className="w-full text-sm">
			<thead className="sticky top-0 bg-surface-elevated z-10">
				<tr>
					<th className="px-2 py-2 w-8 border-b border-border text-center">
						<input
							type="checkbox"
							checked={allSelected}
							onChange={onSelectAll}
							className="rounded border-border text-accent focus:ring-accent bg-surface"
						/>
					</th>
					<th className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border w-12">
						Status
					</th>
					{columns.map((col) => (
						<th
							key={col}
							className="px-3 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border"
						>
							{col}
							{col === primaryKeyColumn && (
								<span className="ml-1 text-accent">🔑</span>
							)}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{rows.map((row) => {
					const isSelected = selectedRows.has(row.primaryKey);
					return (
						<tr
							key={row.primaryKey}
							className={`${getStatusBgClass(row.status)} ${
								isSelected ? "bg-accent/10" : ""
							} border-b border-border/50 hover:bg-surface-elevated/50 transition-colors cursor-pointer`}
							onClick={() => onToggleSelection(row.primaryKey)}
						>
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: stopEvents needed for checkbox */}
							<td
								className="px-2 py-2 text-center"
								onClick={(e) => e.stopPropagation()}
							>
								<input
									type="checkbox"
									checked={isSelected}
									onChange={() => onToggleSelection(row.primaryKey)}
									className="rounded border-border text-accent focus:ring-accent bg-surface cursor-pointer"
								/>
							</td>
							<td className={`px-3 py-2 ${getStatusTextClass(row.status)}`}>
								<div className="flex items-center justify-center">
									{getStatusIcon(row.status)}
								</div>
							</td>
							{row.cellDiffs.map((cell) => (
								<td
									key={cell.column}
									className={`px-3 py-2 font-mono text-xs ${
										cell.status === "modified"
											? "text-modified font-medium"
											: row.status === "added"
												? "text-added"
												: row.status === "deleted"
													? "text-deleted line-through"
													: "text-text-primary"
									}`}
								>
									{row.status === "modified" && cell.status === "modified" ? (
										<div className="flex flex-col gap-0.5">
											<span className="text-deleted line-through">
												{getCellValue(row, cell.column, "source")}
											</span>
											<span className="text-added">
												{getCellValue(row, cell.column, "target")}
											</span>
										</div>
									) : row.status === "added" ? (
										getCellValue(row, cell.column, "target")
									) : row.status === "deleted" ? (
										getCellValue(row, cell.column, "source")
									) : (
										getCellValue(row, cell.column, "source")
									)}
								</td>
							))}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}
