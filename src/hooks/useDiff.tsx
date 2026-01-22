import { createContext, useContext, useState } from "react";
import type {
    Connection,
    DiffSelection,
    FkCascade,
    MergeOperation,
    TableDiffResult,
    TableInfo,
} from "../lib/types";
import { useDiffComparison } from "./diff/useDiffComparison";
import { useMergeExecution } from "./diff/useMergeExecution";
import { useMergeOperations } from "./diff/useMergeOperations";
import { useMergeSelection } from "./diff/useMergeSelection";

interface DiffContextType {
    selection: DiffSelection;
    diffResult: TableDiffResult | null;
    isComparing: boolean;
    error: string | null;
    // Row limit controls
    rowLimit: number;
    totalSourceRows: number | null;
    totalTargetRows: number | null;
    setRowLimit: (limit: number) => void;
    loadAllRows: () => void;
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
        limit?: number,
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
    // Column actions
    toggleIgnoredColumn: (columnName: string) => void;
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
        ignoredColumns: [],
    });

    const mergeSelection = useMergeSelection();

    const diffComparison = useDiffComparison(
        selection,
        mergeSelection.resetMergeSelection,
    );

    const mergeOperations = useMergeOperations(
        diffComparison.diffResult,
        mergeSelection.selectedRows,
        mergeSelection.mergedCells,
        mergeSelection.insertAsNewRows,
    );

    const mergeExecution = useMergeExecution(
        mergeSelection.resetMergeSelection,
    );

    const setSourceConnection = (connectionId: string | null) => {
        setSelection((prev) => ({
            ...prev,
            sourceConnectionId: connectionId,
            sourceTableName: null,
        }));
        diffComparison.clearResult();
    };

    const setSourceTable = (tableName: string | null) => {
        setSelection((prev) => ({ ...prev, sourceTableName: tableName }));
        diffComparison.clearResult();
    };

    const setTargetConnection = (connectionId: string | null) => {
        setSelection((prev) => ({
            ...prev,
            targetConnectionId: connectionId,
            targetTableName: null,
        }));
        diffComparison.clearResult();
    };

    const setTargetTable = (tableName: string | null) => {
        setSelection((prev) => ({ ...prev, targetTableName: tableName }));
        diffComparison.clearResult();
    };

    const toggleIgnoredColumn = (columnName: string) => {
        setSelection((prev) => {
            const ignored = new Set(prev.ignoredColumns);
            if (ignored.has(columnName)) {
                ignored.delete(columnName);
            } else {
                ignored.add(columnName);
            }
            return {
                ...prev,
                ignoredColumns: Array.from(ignored),
            };
        });
    };

    const selectAllRows = () => {
        if (diffComparison.diffResult) {
            mergeSelection.selectAllRows(diffComparison.diffResult.rows);
        }
    };

    const executeMerge = async (targetConnection: Connection) => {
        await mergeExecution.executeMerge(targetConnection, mergeOperations);
    };

    return (
        <DiffContext.Provider
            value={{
                selection,
                diffResult: diffComparison.diffResult,
                isComparing: diffComparison.isComparing,
                error: diffComparison.error,
                rowLimit: diffComparison.rowLimit,
                totalSourceRows: diffComparison.totalSourceRows,
                totalTargetRows: diffComparison.totalTargetRows,
                setRowLimit: diffComparison.setRowLimit,
                loadAllRows: diffComparison.loadAllRows,

                selectedRows: mergeSelection.selectedRows,
                mergedCells: mergeSelection.mergedCells,
                insertAsNewRows: mergeSelection.insertAsNewRows,
                mergeOperations,

                isMerging: mergeExecution.isMerging,
                mergeError: mergeExecution.mergeError,
                mergeSuccess: mergeExecution.mergeSuccess,

                setSourceConnection,
                setSourceTable,
                setTargetConnection,
                setTargetTable,
                runComparison: diffComparison.runComparison,
                clearResult: diffComparison.clearResult,

                toggleRowSelection: mergeSelection.toggleRowSelection,
                selectAllRows,
                deselectAllRows: mergeSelection.deselectAllRows,
                mergeCell: mergeSelection.mergeCell,
                toggleInsertAsNew: mergeSelection.toggleInsertAsNew,

                executeMerge,
                clearMergeState: mergeExecution.clearMergeState,

                toggleIgnoredColumn,

                fkCascadeChain: mergeExecution.fkCascadeChain,
                addFkCascade: mergeExecution.addFkCascade,
                removeFkCascade: mergeExecution.removeFkCascade,
                clearFkCascades: mergeExecution.clearFkCascades,
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
