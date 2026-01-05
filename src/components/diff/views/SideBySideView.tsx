import { useEffect, useRef, useState } from "react";
import type { ViewProps } from "../types";

export function SideBySideView({
	rows,
	columns,
	primaryKeyColumn,
	sourceConnection,
	targetConnection,
	getCellValue,
	getStatusBgClass,
	selectedRows,
	onToggleSelection,
	onSelectAll,
	allSelected,
}: ViewProps) {
	const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
	const resizingRef = useRef<{
		column: string;
		startX: number;
		startWidth: number;
	} | null>(null);

	// Initialize column widths
	useEffect(() => {
		const initialWidths: Record<string, number> = {};
		for (const col of columns) {
			initialWidths[col] = 150; // Default width
		}
		setColumnWidths(initialWidths);
	}, [columns]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!resizingRef.current) return;
			const { column, startX, startWidth } = resizingRef.current;
			const diff = e.pageX - startX;
			const newWidth = Math.max(50, startWidth + diff); // Min width 50px
			setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
		};

		const handleMouseUp = () => {
			if (resizingRef.current) {
				resizingRef.current = null;
				document.body.style.cursor = "";
			}
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	const startResizing = (
		e: React.MouseEvent,
		column: string,
		width: number,
	) => {
		e.preventDefault();
		resizingRef.current = { column, startX: e.pageX, startWidth: width };
		document.body.style.cursor = "col-resize";
	};

	const handleAutoResize = (e: React.MouseEvent, column: string) => {
		e.preventDefault();
		e.stopPropagation();

		// Find all cells for this column (in both source and target tables)
		const cells = document.querySelectorAll(`[data-col="${column}"]`);

		let maxWidth = column.length * 8; // Start with approximate header width

		// Measure actual DOM elements
		for (const cell of cells) {
			maxWidth = Math.max(maxWidth, cell.scrollWidth);
		}

		// Add padding (px-2 = 8px * 2 = 16px) + buffer
		const newWidth = Math.max(60, Math.min(500, maxWidth + 24));
		setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
	};

	return (
		<div className="flex h-full overflow-hidden">
			{/* Source Side */}
			<div className="flex-1 flex flex-col min-w-0 border-r border-border bg-surface">
				<div className="bg-surface-elevated px-3 py-2 border-b border-border flex-none">
					<span className="text-xs font-medium text-text-muted uppercase tracking-wider">
						Source: {sourceConnection}
					</span>
				</div>
				<div className="flex-1 overflow-auto">
					<table className="w-full text-sm table-fixed border-collapse">
						<thead className="sticky top-0 bg-surface-elevated z-10 shadow-sm">
							<tr>
								<th className="px-2 py-2 w-8 min-w-8 max-w-8 border-b border-border text-center">
									<input
										type="checkbox"
										checked={allSelected}
										onChange={onSelectAll}
										className="rounded border-border text-accent focus:ring-accent bg-surface"
									/>
								</th>
								{columns.map((col) => (
									<th
										key={col}
										className="relative px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border group"
										style={{
											width: columnWidths[col],
											minWidth: columnWidths[col],
										}}
									>
										<div className="flex items-center gap-1 truncate">
											<span className="truncate" title={col}>
												{col}
											</span>
											{col === primaryKeyColumn && (
												<span className="flex-none text-accent">🔑</span>
											)}
										</div>
										{/* Resizer */}
										{/* biome-ignore lint/a11y/noStaticElementInteractions: resizer needs mouse events */}
										<div
											className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 group-hover:bg-border transition-colors z-20"
											onMouseDown={(e) =>
												startResizing(e, col, columnWidths[col] || 150)
											}
											onDoubleClick={(e) => handleAutoResize(e, col)}
										/>
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const isAdded = row.status === "added";
								const isSelected = selectedRows.has(row.primaryKey);

								return (
									<tr
										key={row.primaryKey}
										className={`${getStatusBgClass(row.status)} ${
											isSelected ? "bg-accent/10" : ""
										} border-b border-border/50 hover:bg-surface-elevated/50 transition-colors cursor-pointer h-[36.5px]`}
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
										{columns.map((col) => {
											const cellDiff = row.cellDiffs.find(
												(c) => c.column === col,
											);
											const isCellModified = cellDiff?.status === "modified";
											const isDeleted = row.status === "deleted";

											return (
												<td
													key={col}
													className={`px-2 py-2 font-mono text-xs truncate border-r border-border/20 last:border-r-0 ${
														isAdded
															? "text-text-muted"
															: isDeleted
																? "text-deleted"
																: isCellModified
																	? "text-modified bg-modified-bg/50 font-medium"
																	: "text-text-primary"
													}`}
													style={{ maxWidth: 0 }} // Allow truncate to work with table-fixed
												>
													<div
														data-col={col}
														className="truncate"
														title={
															!isAdded
																? getCellValue(row, col, "source")
																: undefined
														}
													>
														{isAdded ? "—" : getCellValue(row, col, "source")}
													</div>
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

			{/* Target Side */}
			<div className="flex-1 flex flex-col min-w-0 bg-surface">
				<div className="bg-surface-elevated px-3 py-2 border-b border-border flex-none">
					<span className="text-xs font-medium text-text-muted uppercase tracking-wider">
						Target: {targetConnection}
					</span>
				</div>
				<div className="flex-1 overflow-auto">
					<table className="w-full text-sm table-fixed border-collapse">
						<thead className="sticky top-0 bg-surface-elevated z-10 shadow-sm">
							<tr>
								<th className="h-[37px] px-2 py-2 w-8 min-w-8 max-w-8 border-b border-border" />
								{columns.map((col) => (
									<th
										key={col}
										className="relative px-2 py-2 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border group"
										style={{
											width: columnWidths[col],
											minWidth: columnWidths[col],
										}}
									>
										<div className="flex items-center gap-1 truncate">
											<span className="truncate" title={col}>
												{col}
											</span>
											{col === primaryKeyColumn && (
												<span className="flex-none text-accent">🔑</span>
											)}
										</div>
										{/* Resizer */}
										{/* biome-ignore lint/a11y/noStaticElementInteractions: resizer needs mouse events */}
										<div
											className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 group-hover:bg-border transition-colors z-20"
											onMouseDown={(e) =>
												startResizing(e, col, columnWidths[col] || 150)
											}
											onDoubleClick={(e) => handleAutoResize(e, col)}
										/>
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
										} h-[36.5px]`}
										onClick={() => onToggleSelection(row.primaryKey)}
									>
										<td className="px-2 py-2 text-center" />
										{columns.map((col) => {
											const cellDiff = row.cellDiffs.find(
												(c) => c.column === col,
											);
											const isCellModified = cellDiff?.status === "modified";

											return (
												<td
													key={col}
													className={`px-2 py-2 font-mono text-xs truncate border-r border-border/20 last:border-r-0 ${
														isDeleted
															? "text-text-muted"
															: isAdded
																? "text-added"
																: isCellModified
																	? "text-modified bg-modified-bg/50 font-medium"
																	: "text-text-primary"
													}`}
													style={{ maxWidth: 0 }} // Allow truncate
												>
													<div
														data-col={col}
														className="truncate"
														title={
															!isDeleted
																? getCellValue(row, col, "target")
																: undefined
														}
													>
														{isDeleted ? "—" : getCellValue(row, col, "target")}
													</div>
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
		</div>
	);
}
