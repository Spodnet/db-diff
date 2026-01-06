import type { DiffStatus, RowDiff } from "../../lib/types";

export interface ViewProps {
	rows: RowDiff[];
	columns: string[];
	primaryKeyColumn: string;
	getCellValue: (
		row: RowDiff,
		col: string,
		side: "source" | "target",
	) => string;
	getStatusBgClass: (status: DiffStatus) => string;
	getStatusTextClass: (status: DiffStatus) => string;
	getStatusIcon: (status: DiffStatus) => React.ReactNode;
	sourceConnection?: string;
	targetConnection?: string;
	selectedRows: Set<string>;
	onToggleSelection: (id: string) => void;
	onSelectAll: () => void;
	allSelected: boolean;
	mergedCells?: Map<string, Set<string>>;
	onMergeCell?: (primaryKey: string, column: string) => void;
	// Insert as new
	insertAsNewRows?: Set<string>;
	onToggleInsertAsNew?: (primaryKey: string) => void;
}
