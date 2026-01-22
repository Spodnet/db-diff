import { useState } from "react";
import type { RowDiff } from "../../lib/types";

export function useMergeSelection() {
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [mergedCells, setMergedCells] = useState<Map<string, Set<string>>>(
        new Map(),
    );
    const [insertAsNewRows, setInsertAsNewRows] = useState<Set<string>>(
        new Set(),
    );

    const toggleRowSelection = (primaryKey: string) => {
        setSelectedRows((prev) => {
            const next = new Set(prev);
            if (next.has(primaryKey)) {
                next.delete(primaryKey);
            } else {
                next.add(primaryKey);
            }
            return next;
        });
    };

    const selectAllRows = (rows: RowDiff[]) => {
        const changedRows = rows.filter((r) => r.status !== "unchanged");
        setSelectedRows(new Set(changedRows.map((r) => r.primaryKey)));
    };

    const deselectAllRows = () => {
        setSelectedRows(new Set());
        setMergedCells(new Map());
    };

    const mergeCell = (primaryKey: string, column: string) => {
        setMergedCells((prev) => {
            const next = new Map(prev);
            const cellSet = next.get(primaryKey) || new Set();
            cellSet.add(column);
            next.set(primaryKey, cellSet);
            return next;
        });
    };

    const toggleInsertAsNew = (primaryKey: string) => {
        setInsertAsNewRows((prev) => {
            const next = new Set(prev);
            if (next.has(primaryKey)) {
                next.delete(primaryKey);
            } else {
                next.add(primaryKey);
            }
            return next;
        });
    };

    const resetMergeSelection = () => {
        setSelectedRows(new Set());
        setMergedCells(new Map());
        setInsertAsNewRows(new Set());
    };

    return {
        selectedRows,
        mergedCells,
        insertAsNewRows,
        toggleRowSelection,
        selectAllRows,
        deselectAllRows,
        mergeCell,
        toggleInsertAsNew,
        resetMergeSelection,
    };
}
