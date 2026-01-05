import type { ViewProps } from "../types";

export function SideBySideView({
	rows,
	columns,
	primaryKeyColumn,
	sourceConnection,
	targetConnection,
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
		<div className="flex">
			{/* Source Side */}
			<div className="flex-1 border-r border-border">
				<div className="sticky top-0 bg-surface-elevated px-3 py-2 border-b border-border">
					<span className="text-xs font-medium text-text-muted uppercase tracking-wider">
						Source: {sourceConnection}
					</span>
				</div>
				<table className="w-full text-sm">
					<thead className="sticky top-8 bg-surface-elevated">
						<tr>
							<th className="px-2 py-2 w-8 border-b border-border text-center">
								<input
									type="checkbox"
									checked={allSelected}
									onChange={onSelectAll}
									className="rounded border-border text-accent focus:ring-accent bg-surface"
								/>
							</th>
							<th className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border w-8" />
							{columns.map((col) => (
								<th
									key={col}
									className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border"
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
							const isDeleted = row.status === "deleted";
							const isAdded = row.status === "added";
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
									<td className={`px-2 py-2 ${getStatusTextClass(row.status)}`}>
										{getStatusIcon(row.status)}
									</td>
									{columns.map((col) => {
										const cellDiff = row.cellDiffs.find(
											(c) => c.column === col,
										);
										const isCellModified = cellDiff?.status === "modified";

										return (
											<td
												key={col}
												className={`px-2 py-2 font-mono text-xs ${
													isAdded
														? "text-text-muted"
														: isDeleted
															? "text-deleted"
															: isCellModified
																? "text-modified bg-modified-bg/50 font-medium"
																: "text-text-primary"
												}`}
											>
												{isAdded ? "—" : getCellValue(row, col, "source")}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Target Side */}
			<div className="flex-1">
				<div className="sticky top-0 bg-surface-elevated px-3 py-2 border-b border-border z-10">
					<span className="text-xs font-medium text-text-muted uppercase tracking-wider">
						Target: {targetConnection}
					</span>
				</div>
				<table className="w-full text-sm">
					<thead className="sticky top-8 bg-surface-elevated z-10">
						<tr>
							<th className="px-2 py-2 w-8 border-b border-border" />
							<th className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border w-8" />
							{columns.map((col) => (
								<th
									key={col}
									className="px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border"
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
							const isAdded = row.status === "added";
							const isModified = row.status === "modified";
							const isDeleted = row.status === "deleted";
							const isSelected = selectedRows.has(row.primaryKey);

							return (
								<tr
									key={row.primaryKey}
									className={`border-b border-border/50 ${
										isSelected ? "bg-accent/5" : ""
									} ${
										isAdded
											? "bg-added-bg"
											: isModified
												? "bg-modified-bg/30"
												: ""
									}`}
									onClick={() => onToggleSelection(row.primaryKey)}
								>
									<td className="px-2 py-2 text-center" />
									<td className={`px-2 py-2 ${getStatusTextClass(row.status)}`}>
										{getStatusIcon(row.status)}
									</td>
									{columns.map((col) => {
										const cellDiff = row.cellDiffs.find(
											(c) => c.column === col,
										);
										const isCellModified = cellDiff?.status === "modified";

										return (
											<td
												key={col}
												className={`px-2 py-2 font-mono text-xs ${
													isDeleted
														? "text-text-muted"
														: isAdded
															? "text-added"
															: isCellModified
																? "text-modified bg-modified-bg/50 font-medium"
																: "text-text-primary"
												}`}
											>
												{isDeleted ? "—" : getCellValue(row, col, "target")}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
