import { createContext, useContext, useState } from "react";
import type {
    Connection,
    ConnectionType,
    DiffSelection,
    RowDiff,
    TableDiffResult,
    TableInfo,
} from "../lib/types";

interface MergeOperation {
    type: "insert" | "update" | "delete";
    primaryKey: string;
    sql: string;
    isInsertAsNew?: boolean;
}

// FK Cascade structure (recursive)
export interface FkCascade {
    table: string;
    column: string;
    children: FkCascade[];
}

interface DiffContextType {
    selection: DiffSelection;
    diffResult: TableDiffResult | null;
    isComparing: boolean;
    error: string | null;
    // Merge state
    selectedRows: Set<string>;
    mergedCells: Map<string, Set<string>>;
    mergeOperations: MergeOperation[];
    isMerging: boolean;
    mergeError: string | null;
    mergeSuccess: boolean;
    // Selection actions
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
    // Merge actions
    toggleRowSelection: (primaryKey: string) => void;
    selectAllRows: () => void;
    deselectAllRows: () => void;
    executeMerge: (targetConnection: Connection) => Promise<void>;
    clearMergeState: () => void;
    mergeCell: (primaryKey: string, column: string) => void;
    // Insert as new
    insertAsNewRows: Set<string>;
    toggleInsertAsNew: (primaryKey: string) => void;
    // FK Cascade
    fkCascadeChain: FkCascade[];
    addFkCascade: (parentPath: number[], cascade: FkCascade) => void;
    removeFkCascade: (path: number[]) => void;
    clearFkCascades: () => void;
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

    // Merge state
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isMerging, setIsMerging] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const [mergedCells, setMergedCells] = useState<Map<string, Set<string>>>(
        new Map(),
    );
    const [insertAsNewRows, setInsertAsNewRows] = useState<Set<string>>(
        new Set(),
    );
    const [fkCascadeChain, setFkCascadeChain] = useState<FkCascade[]>([]);

    const setSourceConnection = (connectionId: string | null) => {
        setSelection((prev) => ({
            ...prev,
            sourceConnectionId: connectionId,
            sourceTableName: null,
        }));
        setDiffResult(null);
        setSelectedRows(new Set());
        setMergedCells(new Map());
    };

    const setSourceTable = (tableName: string | null) => {
        setSelection((prev) => ({ ...prev, sourceTableName: tableName }));
        setDiffResult(null);
        setSelectedRows(new Set());
        setMergedCells(new Map());
        setInsertAsNewRows(new Set());
    };

    const setTargetConnection = (connectionId: string | null) => {
        setSelection((prev) => ({
            ...prev,
            targetConnectionId: connectionId,
            targetTableName: null,
        }));
        setDiffResult(null);
        setSelectedRows(new Set());
        setMergedCells(new Map());
    };

    const setTargetTable = (tableName: string | null) => {
        setSelection((prev) => ({ ...prev, targetTableName: tableName }));
        setDiffResult(null);
        setSelectedRows(new Set());
        setMergedCells(new Map());
        setInsertAsNewRows(new Set());
    };

    const runComparison = async (
        sourceConnection: Connection,
        targetConnection: Connection,
        sourceTable: TableInfo,
        targetTable: TableInfo,
    ) => {
        setIsComparing(true);
        setError(null);
        setSelectedRows(new Set());
        setMergedCells(new Map());
        setMergeSuccess(false);
        setMergeError(null);

        try {
            const pkColumn =
                sourceTable.columns.find((c) => c.primaryKey)?.name || "id";

            const sourceRes = await fetch(
                `/api/database/${sourceConnection.id}/tables/${sourceTable.name}/data?type=${sourceConnection.type}`,
            );
            const sourceData = await sourceRes.json();

            const targetRes = await fetch(
                `/api/database/${targetConnection.id}/tables/${targetTable.name}/data?type=${targetConnection.type}`,
            );
            const targetData = await targetRes.json();

            if (!sourceData.success || !targetData.success) {
                const errorMsg =
                    sourceData.error ||
                    targetData.error ||
                    "Failed to fetch table data";
                throw new Error(errorMsg);
            }

            const result = computeDiff(
                sourceConnection.name,
                targetConnection.name,
                targetConnection.type,
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
        setSelectedRows(new Set());
        setMergedCells(new Map());
        setInsertAsNewRows(new Set());
    };

    // Merge actions
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

    const selectAllRows = () => {
        if (!diffResult) return;
        const changedRows = diffResult.rows.filter(
            (r) => r.status !== "unchanged",
        );
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

    // Generate merge operations for selected rows
    const mergeOperations: MergeOperation[] = (() => {
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
                const values = columns.map((col) =>
                    formatValue(
                        row.sourceRow?.[col],
                        diffResult.targetConnectionType,
                    ),
                );
                ops.push({
                    type: "insert",
                    primaryKey: row.primaryKey,
                    sql: `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`,
                });
            } else if (row.status === "added" && isRowSelected) {
                // Row exists in target but not in source - DELETE from target
                ops.push({
                    type: "delete",
                    primaryKey: row.primaryKey,
                    sql: `DELETE FROM ${tableName} WHERE ${primaryKeyColumn} = ${formatValue(row.primaryKey, diffResult.targetConnectionType)};`,
                });
            } else if (row.status === "modified") {
                // Check if this row should be inserted as a new row
                if (isInsertAsNew) {
                    // Insert source data as NEW row (without PK, let auto-increment assign)
                    const nonPkColumns = columns.filter(
                        (col) => col !== primaryKeyColumn,
                    );
                    const values = nonPkColumns.map((col) =>
                        formatValue(
                            row.sourceRow?.[col],
                            diffResult.targetConnectionType,
                        ),
                    );
                    ops.push({
                        type: "insert",
                        primaryKey: row.primaryKey,
                        sql: `INSERT INTO ${tableName} (${nonPkColumns.join(", ")}) VALUES (${values.join(", ")});`,
                        isInsertAsNew: true,
                    });
                } else if (isRowSelected || hasCellMerges) {
                    // Row exists in both but differs - UPDATE target to match source
                    // If row selected, update ALL modified columns
                    // If not selected but has cell merges, update ONLY specified columns
                    const setClauses = row.cellDiffs
                        .filter((c) => {
                            if (c.status !== "modified") return false;
                            if (isRowSelected) return true;
                            return cellMerges?.has(c.column);
                        })
                        .map(
                            (c) =>
                                `${c.column} = ${formatValue(c.sourceValue, diffResult.targetConnectionType)}`,
                        );

                    if (setClauses.length > 0) {
                        ops.push({
                            type: "update",
                            primaryKey: row.primaryKey,
                            sql: `UPDATE ${tableName} SET ${setClauses.join(", ")} WHERE ${primaryKeyColumn} = ${formatValue(row.primaryKey, diffResult.targetConnectionType)};`,
                        });
                    }
                }
            }
        }

        return ops;
    })();

    const executeMerge = async (targetConnection: Connection) => {
        if (mergeOperations.length === 0) return;

        setIsMerging(true);
        setMergeError(null);
        setMergeSuccess(false);

        try {
            // Build insertAsNewOps for operations that need ID capture
            const insertAsNewOps = mergeOperations
                .filter((op) => op.isInsertAsNew)
                .map((op) => ({ sql: op.sql, originalPK: op.primaryKey }));

            const response = await fetch(
                `/api/database/${targetConnection.id}/execute`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: targetConnection.type,
                        statements: mergeOperations.map((op) => op.sql),
                        insertAsNewOps:
                            insertAsNewOps.length > 0
                                ? insertAsNewOps
                                : undefined,
                        fkCascadeChain:
                            fkCascadeChain.length > 0
                                ? fkCascadeChain
                                : undefined,
                    }),
                },
            );

            const result = await response.json();

            if (result.success) {
                setMergeSuccess(true);
                setSelectedRows(new Set());
                setMergedCells(new Map());
                setInsertAsNewRows(new Set());
            } else {
                setMergeError(result.error || "Merge failed");
            }
        } catch (e) {
            setMergeError(e instanceof Error ? e.message : "Merge failed");
        } finally {
            setIsMerging(false);
        }
    };

    const clearMergeState = () => {
        setMergeError(null);
        setMergeSuccess(false);
    };

    // FK Cascade management
    const addFkCascade = (parentPath: number[], cascade: FkCascade) => {
        setFkCascadeChain((prev) => {
            if (parentPath.length === 0) {
                // Add at root level
                return [...prev, cascade];
            }
            // Deep clone and navigate to parent
            const next = JSON.parse(JSON.stringify(prev)) as FkCascade[];
            let current = next;
            for (let i = 0; i < parentPath.length - 1; i++) {
                current = current[parentPath[i]].children;
            }
            current[parentPath[parentPath.length - 1]].children.push(cascade);
            return next;
        });
    };

    const removeFkCascade = (path: number[]) => {
        if (path.length === 0) return;
        setFkCascadeChain((prev) => {
            const next = JSON.parse(JSON.stringify(prev)) as FkCascade[];
            if (path.length === 1) {
                next.splice(path[0], 1);
                return next;
            }
            let current = next;
            for (let i = 0; i < path.length - 1; i++) {
                current = current[path[i]].children;
            }
            current.splice(path[path.length - 1], 1);
            return next;
        });
    };

    const clearFkCascades = () => setFkCascadeChain([]);

    return (
        <DiffContext.Provider
            value={{
                selection,
                diffResult,
                isComparing,
                error,
                selectedRows,
                mergedCells,
                mergeOperations,
                isMerging,
                mergeError,
                mergeSuccess,
                setSourceConnection,
                setSourceTable,
                setTargetConnection,
                setTargetTable,
                runComparison,
                clearResult,
                toggleRowSelection,
                selectAllRows,
                deselectAllRows,
                executeMerge,
                clearMergeState,
                mergeCell,
                insertAsNewRows,
                toggleInsertAsNew,
                fkCascadeChain,
                addFkCascade,
                removeFkCascade,
                clearFkCascades,
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

// Format value for SQL
function formatValue(value: unknown, type: ConnectionType): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "number") return String(value);
    if (typeof value === "boolean") return value ? "1" : "0";

    // Handle Date objects (MySQL returns dates as Date objects)
    if (value instanceof Date) {
        if (type === "mysql") {
            // Format as YYYY-MM-DD HH:MM:SS for MySQL
            return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
        }
        return `'${value.toISOString()}'`;
    }

    // Handle objects (e.g., JSON columns)
    if (typeof value === "object") {
        const jsonStr = JSON.stringify(value);
        return `'${jsonStr.replace(/'/g, "''")}'`;
    }

    if (typeof value === "string") {
        // Handle Dates for MySQL
        if (
            type === "mysql" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
        ) {
            try {
                const date = new Date(value);
                if (!Number.isNaN(date.getTime())) {
                    // Format as YYYY-MM-DD HH:MM:SS
                    return `'${date.toISOString().slice(0, 19).replace("T", " ")}'`;
                }
            } catch (_e) {
                // ignore invalid dates
            }
        }
        // Escape single quotes for strings
        return `'${String(value).replace(/'/g, "''")}'`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}

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
