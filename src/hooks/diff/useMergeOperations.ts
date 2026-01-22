import { useMemo } from "react";
import type { MergeOperation, TableDiffResult } from "../../lib/types";

export function useMergeOperations(
    diffResult: TableDiffResult | null,
    selectedRows: Set<string>,
    mergedCells: Map<string, Set<string>>,
    insertAsNewRows: Set<string>,
) {
    const mergeOperations: MergeOperation[] = useMemo(() => {
        if (!diffResult) return [];

        const ops: MergeOperation[] = [];
        const { tableName, primaryKeyColumn, columns } = diffResult;

        for (const row of diffResult.rows) {
            const isRowSelected = selectedRows.has(row.primaryKey);
            const cellMerges = mergedCells.get(row.primaryKey);
            const hasCellMerges = cellMerges && cellMerges.size > 0;
            const isInsertAsNew = insertAsNewRows.has(row.primaryKey);

            // Skip if nothing is selected for this row
            if (!isRowSelected && !hasCellMerges && !isInsertAsNew) continue;
            if (row.status === "unchanged") continue;

            if (row.status === "deleted" && isRowSelected) {
                // Row exists in source but not in target - INSERT into target
                const values: Record<string, unknown> = {};
                for (const col of columns) {
                    values[col] = row.sourceRow?.[col];
                }
                ops.push({
                    type: "insert",
                    tableName,
                    primaryKeyColumn,
                    primaryKeyValue: row.primaryKey,
                    columns,
                    values,
                });
            } else if (row.status === "added" && isRowSelected) {
                // Row exists in target but not in source - DELETE from target
                ops.push({
                    type: "delete",
                    tableName,
                    primaryKeyColumn,
                    primaryKeyValue: row.primaryKey,
                });
            } else if (row.status === "modified") {
                // Check if this row should be inserted as a new row
                if (isInsertAsNew) {
                    // Insert source data as NEW row (without PK, let auto-increment assign)
                    const values: Record<string, unknown> = {};
                    for (const col of columns) {
                        if (col !== primaryKeyColumn) {
                            values[col] = row.sourceRow?.[col];
                        }
                    }
                    ops.push({
                        type: "insert",
                        tableName,
                        primaryKeyColumn,
                        primaryKeyValue: row.primaryKey,
                        columns,
                        values,
                        isInsertAsNew: true,
                    });
                } else if (isRowSelected || hasCellMerges) {
                    // Row exists in both but differs - UPDATE target to match source
                    const values: Record<string, unknown> = {};
                    for (const c of row.cellDiffs) {
                        if (c.status !== "modified") continue;
                        if (isRowSelected || cellMerges?.has(c.column)) {
                            values[c.column] = c.sourceValue;
                        }
                    }

                    if (Object.keys(values).length > 0) {
                        ops.push({
                            type: "update",
                            tableName,
                            primaryKeyColumn,
                            primaryKeyValue: row.primaryKey,
                            values,
                        });
                    }
                }
            }
        }

        return ops;
    }, [diffResult, selectedRows, mergedCells, insertAsNewRows]);

    return mergeOperations;
}
