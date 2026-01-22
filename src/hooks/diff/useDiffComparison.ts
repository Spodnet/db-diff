import { useState } from "react";
import type {
    Connection,
    ConnectionType,
    DiffSelection,
    RowDiff,
    TableDiffResult,
    TableInfo,
} from "../../lib/types";

// Diff algorithm
function computeDiff(
    sourceConnectionName: string,
    targetConnectionName: string,
    targetConnectionType: ConnectionType,
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
            const cellDiffs = columns.map((col) => {
                const sv = sourceRow[col];
                const tv = targetRow[col];
                const isEqual = JSON.stringify(sv) === JSON.stringify(tv);
                return {
                    column: col,
                    sourceValue: sv,
                    targetValue: tv,
                    status: isEqual
                        ? ("unchanged" as const)
                        : ("modified" as const),
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

    rows.sort((a, b) => {
        const order = { deleted: 0, modified: 1, added: 2, unchanged: 3 };
        return order[a.status] - order[b.status];
    });

    return {
        sourceConnection: sourceConnectionName,
        targetConnection: targetConnectionName,
        targetConnectionType,
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

export function useDiffComparison(
    selection: DiffSelection,
    resetMergeState: () => void,
) {
    const [diffResult, setDiffResult] = useState<TableDiffResult | null>(null);
    const [isComparing, setIsComparing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Row limit state
    const [rowLimit, setRowLimitState] = useState(500);
    const [totalSourceRows, setTotalSourceRows] = useState<number | null>(null);
    const [totalTargetRows, setTotalTargetRows] = useState<number | null>(null);

    const runComparison = async (
        sourceConnection: Connection,
        targetConnection: Connection,
        sourceTable: TableInfo,
        targetTable: TableInfo,
        limit?: number,
    ) => {
        setIsComparing(true);
        setError(null);
        resetMergeState();

        const effectiveLimit = limit ?? rowLimit;

        try {
            const pkColumn =
                sourceTable.columns.find((c) => c.primaryKey)?.name || "id";

            const sourceRes = await fetch(
                `/api/database/${sourceConnection.id}/tables/${sourceTable.name}/data?type=${sourceConnection.type}&limit=${effectiveLimit}`,
            );
            const sourceData = await sourceRes.json();

            const targetRes = await fetch(
                `/api/database/${targetConnection.id}/tables/${targetTable.name}/data?type=${targetConnection.type}&limit=${effectiveLimit}`,
            );
            const targetData = await targetRes.json();

            if (!sourceData.success || !targetData.success) {
                const errorMsg =
                    sourceData.error ||
                    targetData.error ||
                    "Failed to fetch table data";
                throw new Error(errorMsg);
            }

            // Store total counts
            setTotalSourceRows(sourceData.total ?? null);
            setTotalTargetRows(targetData.total ?? null);

            // Filter out ignored columns
            const effectiveColumns = sourceTable.columns
                .map((c) => c.name)
                .filter((name) => !selection.ignoredColumns.includes(name));

            const result = computeDiff(
                sourceConnection.name,
                targetConnection.name,
                targetConnection.type,
                sourceTable.name,
                pkColumn,
                effectiveColumns,
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
        resetMergeState();
        setTotalSourceRows(null);
        setTotalTargetRows(null);
    };

    const setRowLimit = (limit: number) => {
        setRowLimitState(limit);
    };

    const loadAllRows = () => {
        // Set a very high limit to effectively load all rows
        setRowLimitState(1000000);
    };

    return {
        diffResult,
        setDiffResult,
        isComparing,
        error,
        setError,
        rowLimit,
        totalSourceRows,
        totalTargetRows,
        setRowLimit,
        loadAllRows,
        runComparison,
        clearResult,
    };
}
