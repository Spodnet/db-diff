import {
    AlertCircle,
    ArrowRight,
    Check,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    GitMerge,
    Loader2,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { useState } from "react";
import type { FkCascade } from "../../../hooks/useDiff";
import type { Connection, TableInfo } from "../../../lib/types";

interface MergeOperation {
    type: "insert" | "update" | "delete";
    primaryKey: string;
    sql: string;
}

interface MergeConfirmationModalProps {
    onClose: () => void;
    onConfirm: () => void;
    targetConnection?: Connection;
    sourceConnectionName?: string;
    targetConnectionName?: string;
    tableName?: string;
    mergeOperations: MergeOperation[];
    isMerging: boolean;
    mergeError: string | null;
    mergeSuccess: boolean;
    // FK Cascade props
    hasInsertAsNew: boolean;
    targetTables: TableInfo[];
    fkCascadeChain: FkCascade[];
    onAddFkCascade: (parentPath: number[], cascade: FkCascade) => void;
    onRemoveFkCascade: (path: number[]) => void;
}

export function MergeConfirmationModal({
    onClose,
    onConfirm,
    targetConnection,
    sourceConnectionName,
    targetConnectionName,
    tableName,
    mergeOperations,
    isMerging,
    mergeError,
    mergeSuccess,
    hasInsertAsNew,
    targetTables,
    fkCascadeChain,
    onAddFkCascade,
    onRemoveFkCascade,
}: MergeConfirmationModalProps) {
    const [cascadeExpanded, setCascadeExpanded] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string>("");
    const [selectedColumn, setSelectedColumn] = useState<string>("");

    const currentTableInfo = targetTables.find((t) => t.name === selectedTable);

    const handleAddCascade = () => {
        if (selectedTable && selectedColumn) {
            onAddFkCascade([], {
                table: selectedTable,
                column: selectedColumn,
                children: [],
            });
            setSelectedTable("");
            setSelectedColumn("");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-medium text-text-primary flex items-center gap-2">
                        <GitMerge className="w-5 h-5 text-accent" />
                        Confirm Merge
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-auto">
                    <div className="mb-6">
                        <p className="text-text-primary mb-2">
                            You are about to apply{" "}
                            <strong>{mergeOperations.length}</strong> change
                            {mergeOperations.length !== 1 ? "s" : ""} to{" "}
                            <span className="font-mono text-accent">
                                {targetConnection?.name}
                            </span>
                            .
                        </p>
                        <div className="p-3 bg-surface-elevated rounded-lg border border-border text-sm text-text-secondary font-mono">
                            {sourceConnectionName} ({tableName}){" "}
                            <ArrowRight className="inline w-3 h-3 mx-1" />{" "}
                            {targetConnectionName} ({tableName})
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-text-muted uppercase tracking-wider">
                            SQL Operations Preview
                        </h4>
                        <div className="bg-black/30 rounded-lg p-4 font-mono text-xs overflow-auto max-h-60 border border-border">
                            {mergeOperations.map((op, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: pure display
                                <div key={i} className="mb-1 last:mb-0">
                                    <span
                                        className={
                                            op.type === "insert"
                                                ? "text-success"
                                                : op.type === "delete"
                                                  ? "text-error"
                                                  : "text-warning"
                                        }
                                    >
                                        {op.type.toUpperCase()}
                                    </span>{" "}
                                    <span className="text-text-secondary">
                                        {op.sql}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FK Cascade Section - only show when there are insert-as-new rows */}
                    {hasInsertAsNew && (
                        <div className="mt-4 border border-border rounded-lg overflow-hidden">
                            <button
                                type="button"
                                className="w-full p-3 bg-surface-elevated flex items-center justify-between hover:bg-surface transition-colors"
                                onClick={() =>
                                    setCascadeExpanded(!cascadeExpanded)
                                }
                            >
                                <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                                    {cascadeExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                    Copy Linked Data (Optional)
                                </span>
                                {fkCascadeChain.length > 0 && (
                                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded">
                                        {fkCascadeChain.length} mapping
                                        {fkCascadeChain.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </button>
                            {cascadeExpanded && (
                                <div className="p-4 border-t border-border bg-surface">
                                    <p className="text-xs text-text-muted mb-3">
                                        Copy linked rows from related tables
                                        when inserting new records.
                                    </p>
                                    {fkCascadeChain.length > 0 && (
                                        <div className="mb-3 space-y-1">
                                            {fkCascadeChain.map(
                                                (cascade, idx) => (
                                                    <div
                                                        key={`${cascade.table}-${cascade.column}`}
                                                        className="flex items-center justify-between p-2 bg-surface-elevated rounded text-sm"
                                                    >
                                                        <span className="font-mono text-text-primary">
                                                            {cascade.table}.
                                                            {cascade.column}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onRemoveFkCascade(
                                                                    [idx],
                                                                )
                                                            }
                                                            className="text-text-muted hover:text-error transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <label
                                                htmlFor="fk-cascade-table"
                                                className="block text-xs text-text-muted mb-1"
                                            >
                                                Table
                                            </label>
                                            <select
                                                id="fk-cascade-table"
                                                value={selectedTable}
                                                onChange={(e) => {
                                                    setSelectedTable(
                                                        e.target.value,
                                                    );
                                                    setSelectedColumn("");
                                                }}
                                                className="w-full px-2 py-1.5 bg-surface-elevated border border-border rounded text-sm text-text-primary"
                                            >
                                                <option value="">
                                                    Select table...
                                                </option>
                                                {targetTables
                                                    .filter(
                                                        (t) =>
                                                            t.name !==
                                                            tableName,
                                                    )
                                                    .map((t) => (
                                                        <option
                                                            key={t.name}
                                                            value={t.name}
                                                        >
                                                            {t.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label
                                                htmlFor="fk-cascade-column"
                                                className="block text-xs text-text-muted mb-1"
                                            >
                                                Column
                                            </label>
                                            <select
                                                id="fk-cascade-column"
                                                value={selectedColumn}
                                                onChange={(e) =>
                                                    setSelectedColumn(
                                                        e.target.value,
                                                    )
                                                }
                                                disabled={!selectedTable}
                                                className="w-full px-2 py-1.5 bg-surface-elevated border border-border rounded text-sm text-text-primary disabled:opacity-50"
                                            >
                                                <option value="">
                                                    Select column...
                                                </option>
                                                {currentTableInfo?.columns.map(
                                                    (col) => (
                                                        <option
                                                            key={col.name}
                                                            value={col.name}
                                                        >
                                                            {col.name}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddCascade}
                                            disabled={
                                                !selectedTable ||
                                                !selectedColumn
                                            }
                                            className="px-3 py-1.5 bg-accent/20 text-accent rounded text-sm font-medium hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Add
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {mergeError && (
                        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-error text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {mergeError}
                        </div>
                    )}

                    {mergeSuccess && (
                        <div className="mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2 text-success text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Merge completed successfully!
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border flex justify-end gap-3 bg-surface-elevated rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                        disabled={isMerging}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isMerging || mergeSuccess}
                        className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-lg shadow-accent/20"
                    >
                        {isMerging ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Merging...
                            </>
                        ) : mergeSuccess ? (
                            <>
                                <Check className="w-4 h-4" />
                                Merged
                            </>
                        ) : (
                            <>
                                <GitMerge className="w-4 h-4" />
                                Confirm Merge
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
