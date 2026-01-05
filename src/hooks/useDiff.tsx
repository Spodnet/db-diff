import { createContext, useContext, useState } from "react";
import type {
	Connection,
	DiffSelection,
	RowDiff,
	TableDiffResult,
	TableInfo,
} from "../lib/types";

interface DiffContextType {
	selection: DiffSelection;
	diffResult: TableDiffResult | null;
	isComparing: boolean;
	error: string | null;
	setSourceConnection: (connectionId: string | null) => void;
	setSourceTable: (tableName: string | null) => void;
	setTargetConnection: (connectionId: string | null) => void;
	setTargetTable: (tableName: string | null) => void;
	runComparison: (
		sourceConnection: Connection,
		targetConnection: Connection,
		sourceTable: TableInfo,
		targetTable: TableInfo,
	) => Promise<void>;
	clearResult: () => void;
}

const DiffContext = createContext<DiffContextType | null>(null);

export function DiffProvider({ children }: { children: React.ReactNode }) {
	const [selection, setSelection] = useState<DiffSelection>({
		sourceConnectionId: null,
		sourceTableName: null,
		targetConnectionId: null,
		targetTableName: null,
	});
	const [diffResult, setDiffResult] = useState<TableDiffResult | null>(null);
	const [isComparing, setIsComparing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const setSourceConnection = (connectionId: string | null) => {
		setSelection((prev) => ({
			...prev,
			sourceConnectionId: connectionId,
			sourceTableName: null,
		}));
		setDiffResult(null);
	};

	const setSourceTable = (tableName: string | null) => {
		setSelection((prev) => ({ ...prev, sourceTableName: tableName }));
		setDiffResult(null);
	};

	const setTargetConnection = (connectionId: string | null) => {
		setSelection((prev) => ({
			...prev,
			targetConnectionId: connectionId,
			targetTableName: null,
		}));
		setDiffResult(null);
	};

	const setTargetTable = (tableName: string | null) => {
		setSelection((prev) => ({ ...prev, targetTableName: tableName }));
		setDiffResult(null);
	};

	const runComparison = async (
		sourceConnection: Connection,
		targetConnection: Connection,
		sourceTable: TableInfo,
		targetTable: TableInfo,
	) => {
		setIsComparing(true);
		setError(null);

		try {
			// Find primary key column
			const pkColumn =
				sourceTable.columns.find((c) => c.primaryKey)?.name || "id";

			// Fetch source data
			const sourceRes = await fetch(
				`/api/database/${sourceConnection.id}/tables/${sourceTable.name}/data?type=${sourceConnection.type}`,
			);
			const sourceData = await sourceRes.json();

			// Fetch target data
			const targetRes = await fetch(
				`/api/database/${targetConnection.id}/tables/${targetTable.name}/data?type=${targetConnection.type}`,
			);
			const targetData = await targetRes.json();

			if (!sourceData.success || !targetData.success) {
				throw new Error("Failed to fetch table data");
			}

			// Build diff
			const result = computeDiff(
				sourceConnection.name,
				targetConnection.name,
				sourceTable.name,
				pkColumn,
				sourceTable.columns.map((c) => c.name),
				sourceData.rows,
				targetData.rows,
			);

			setDiffResult(result);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Comparison failed");
		} finally {
			setIsComparing(false);
		}
	};

	const clearResult = () => {
		setDiffResult(null);
		setError(null);
	};

	return (
		<DiffContext.Provider
			value={{
				selection,
				diffResult,
				isComparing,
				error,
				setSourceConnection,
				setSourceTable,
				setTargetConnection,
				setTargetTable,
				runComparison,
				clearResult,
			}}
		>
			{children}
		</DiffContext.Provider>
	);
}

export function useDiff() {
	const context = useContext(DiffContext);
	if (!context) {
		throw new Error("useDiff must be used within a DiffProvider");
	}
	return context;
}

// Diff algorithm
function computeDiff(
	sourceConnectionName: string,
	targetConnectionName: string,
	tableName: string,
	pkColumn: string,
	columns: string[],
	sourceRows: Record<string, unknown>[],
	targetRows: Record<string, unknown>[],
): TableDiffResult {
	const sourceMap = new Map<string, Record<string, unknown>>();
	const targetMap = new Map<string, Record<string, unknown>>();

	for (const row of sourceRows) {
		const pk = String(row[pkColumn]);
		sourceMap.set(pk, row);
	}

	for (const row of targetRows) {
		const pk = String(row[pkColumn]);
		targetMap.set(pk, row);
	}

	const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);
	const rows: RowDiff[] = [];

	let added = 0;
	let deleted = 0;
	let modified = 0;
	let unchanged = 0;

	for (const pk of allKeys) {
		const sourceRow = sourceMap.get(pk);
		const targetRow = targetMap.get(pk);

		if (!sourceRow && targetRow) {
			// Added in target
			rows.push({
				primaryKey: pk,
				status: "added",
				targetRow,
				cellDiffs: columns.map((col) => ({
					column: col,
					sourceValue: undefined,
					targetValue: targetRow[col],
					status: "added",
				})),
			});
			added++;
		} else if (sourceRow && !targetRow) {
			// Deleted from target
			rows.push({
				primaryKey: pk,
				status: "deleted",
				sourceRow,
				cellDiffs: columns.map((col) => ({
					column: col,
					sourceValue: sourceRow[col],
					targetValue: undefined,
					status: "deleted",
				})),
			});
			deleted++;
		} else if (sourceRow && targetRow) {
			// Check for modifications
			const cellDiffs = columns.map((col) => {
				const sv = sourceRow[col];
				const tv = targetRow[col];
				const isEqual = JSON.stringify(sv) === JSON.stringify(tv);
				return {
					column: col,
					sourceValue: sv,
					targetValue: tv,
					status: isEqual ? ("unchanged" as const) : ("modified" as const),
				};
			});

			const hasChanges = cellDiffs.some((c) => c.status === "modified");

			rows.push({
				primaryKey: pk,
				status: hasChanges ? "modified" : "unchanged",
				sourceRow,
				targetRow,
				cellDiffs,
			});

			if (hasChanges) {
				modified++;
			} else {
				unchanged++;
			}
		}
	}

	// Sort: deleted first, then modified, then added, then unchanged
	rows.sort((a, b) => {
		const order = { deleted: 0, modified: 1, added: 2, unchanged: 3 };
		return order[a.status] - order[b.status];
	});

	return {
		sourceConnection: sourceConnectionName,
		targetConnection: targetConnectionName,
		tableName,
		primaryKeyColumn: pkColumn,
		columns,
		rows,
		summary: {
			added,
			deleted,
			modified,
			unchanged,
			total: rows.length,
		},
	};
}
