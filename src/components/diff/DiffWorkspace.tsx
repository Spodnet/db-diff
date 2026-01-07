import { GitCompare, GitMerge, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useConnections } from "../../hooks/useConnections";
import { DiffProvider, useDiff } from "../../hooks/useDiff";
import { type Tab, useView } from "../../hooks/useView";
import type { Connection, TableInfo } from "../../lib/types";
import { ColumnIgnorePanel } from "./ColumnIgnorePanel";
import { ConnectionSelector } from "./ConnectionSelector";
import { DiffResultsGrid } from "./DiffResultsGrid";
import { MergeConfirmationModal } from "./modals/MergeConfirmationModal";

interface DiffWorkspaceProps {
    initialData?: Tab["data"];
}

function DiffView({ initialData }: DiffWorkspaceProps) {
    const { openDiffTab, activeTabId, updateTab } = useView();
    const {
        connections,
        connectionStatuses,
        connectTo,
        connectionTables,
        tableLoadingStatuses,
    } = useConnections();
    const {
        selection,
        diffResult,
        isComparing,
        error,
        setSourceConnection,
        setSourceTable,
        setTargetConnection,
        setTargetTable,
        runComparison,
        selectedRows,
        mergedCells,
        mergeOperations,
        executeMerge,
        isMerging,
        mergeSuccess,
        mergeError,
        clearMergeState,
        insertAsNewRows,
        fkCascadeChain,
        addFkCascade,
        removeFkCascade,
        toggleIgnoredColumn,
    } = useDiff();

    const [sourceConnOpen, setSourceConnOpen] = useState(false);
    const [sourceTableOpen, setSourceTableOpen] = useState(false);
    const [targetConnOpen, setTargetConnOpen] = useState(false);
    const [targetTableOpen, setTargetTableOpen] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // Local selection state for setup
    const [selectedSourceConnId, setSelectedSourceConnId] = useState<
        string | null
    >(null);
    const [selectedTargetConnId, setSelectedTargetConnId] = useState<
        string | null
    >(null);
    const [selectedSourceTables, setSelectedSourceTables] = useState<string[]>(
        [],
    );
    const [selectedTargetTables, setSelectedTargetTables] = useState<string[]>(
        [],
    );

    // Initialize from initialData if provided
    useEffect(() => {
        if (
            !initialized &&
            initialData?.sourceConnection &&
            initialData?.targetConnection &&
            initialData?.sourceTable &&
            initialData?.targetTable
        ) {
            // Set context state for the runner
            setSourceConnection(initialData.sourceConnection.id);
            setTargetConnection(initialData.targetConnection.id);
            setSourceTable(initialData.sourceTable.name);
            setTargetTable(initialData.targetTable.name);

            // Set local UI state
            setSelectedSourceConnId(initialData.sourceConnection.id);
            setSelectedTargetConnId(initialData.targetConnection.id);
            setSelectedSourceTables([initialData.sourceTable.name]);
            setSelectedTargetTables([initialData.targetTable.name]);

            runComparison(
                initialData.sourceConnection,
                initialData.targetConnection,
                initialData.sourceTable,
                initialData.targetTable,
            );
            setInitialized(true);
        }
    }, [
        initialized,
        initialData,
        setSourceConnection,
        setTargetConnection,
        setSourceTable,
        setTargetTable,
        runComparison,
    ]);

    const getConnection = (id: string | null): Connection | undefined =>
        connections.find((c) => c.id === id);

    const sourceConnection = getConnection(selectedSourceConnId);
    const targetConnection = getConnection(selectedTargetConnId);
    const sourceTables = selectedSourceConnId
        ? connectionTables.get(selectedSourceConnId) || []
        : [];
    const targetTables = selectedTargetConnId
        ? connectionTables.get(selectedTargetConnId) || []
        : [];

    const canCompare =
        selectedSourceConnId &&
        selectedSourceTables.length > 0 &&
        selectedTargetConnId &&
        selectedTargetTables.length > 0;

    const selectedRowCount =
        selectedRows.size +
        [...(mergedCells?.keys() || [])].filter((k) => !selectedRows.has(k))
            .length +
        [...(insertAsNewRows || [])].filter(
            (k) => !selectedRows.has(k) && !mergedCells?.has(k),
        ).length;
    const hasSelection = selectedRowCount > 0;

    const currentSourceTable = connectionTables
        .get(selectedSourceConnId || "")
        ?.find((t) => t.name === (selectedSourceTables[0] || ""));

    const handleCompare = useCallback(async () => {
        if (!canCompare || !sourceConnection || !targetConnection) return;

        const pairs: { src: TableInfo; tgt: TableInfo }[] = [];
        if (
            selectedSourceTables.length === 1 &&
            selectedTargetTables.length === 1
        ) {
            // Explicit 1-to-1
            const srcTable = sourceTables.find(
                (t) => t.name === selectedSourceTables[0],
            );
            const tgtTable = targetTables.find(
                (t) => t.name === selectedTargetTables[0],
            );
            if (srcTable && tgtTable) {
                const pair = { src: srcTable, tgt: tgtTable };

                // If it matches current view (initialData), run directly
                if (
                    initialData &&
                    initialData.sourceTable?.name === srcTable.name &&
                    initialData.targetTable?.name === tgtTable.name &&
                    sourceConnection.id === initialData.sourceConnection?.id &&
                    targetConnection.id === initialData.targetConnection?.id
                ) {
                    runComparison(
                        sourceConnection,
                        targetConnection,
                        srcTable,
                        tgtTable,
                    );
                } else {
                    pairs.push(pair);
                }
            }
        } else {
            // Batch by name
            const tgtTableMap = new Set(selectedTargetTables);
            for (const srcName of selectedSourceTables) {
                if (tgtTableMap.has(srcName)) {
                    const srcTable = sourceTables.find(
                        (t) => t.name === srcName,
                    );
                    const tgtTable = targetTables.find(
                        (t) => t.name === srcName,
                    );
                    if (srcTable && tgtTable) {
                        pairs.push({ src: srcTable, tgt: tgtTable });
                    }
                }
            }
        }

        if (pairs.length === 0) return;

        const pairsToOpen = [...pairs];

        // If in launcher mode (no initialData), reuse current tab for first pair
        if (!initialData && pairsToOpen.length > 0) {
            const first = pairsToOpen.shift();
            if (first) {
                const newId = `diff-${sourceConnection.id}-${first.src.name}-${targetConnection.id}-${first.tgt.name}`;
                updateTab(activeTabId, {
                    id: newId,
                    label: first.src.name,
                    type: "diff",
                    data: {
                        sourceConnection,
                        targetConnection,
                        sourceTable: first.src,
                        targetTable: first.tgt,
                    },
                });
            }
        }

        // Open remaining pairs
        pairsToOpen.forEach((pair) => {
            openDiffTab(sourceConnection, targetConnection, pair.src, pair.tgt);
        });
    }, [
        canCompare,
        sourceConnection,
        targetConnection,
        selectedSourceTables,
        selectedTargetTables,
        sourceTables,
        targetTables,
        openDiffTab,
        activeTabId,
        updateTab,
        initialData,
        runComparison,
    ]);

    // Close modal and refresh after successful merge
    useEffect(() => {
        if (mergeSuccess && showMergeModal) {
            const timer = setTimeout(() => {
                setShowMergeModal(false);
                clearMergeState();
                handleCompare();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [mergeSuccess, showMergeModal, clearMergeState, handleCompare]);

    // Track previous ignored columns to trigger auto-recompare
    const prevIgnoredColumnsRef = useRef(selection.ignoredColumns);

    // Auto-recompare when ignored columns change
    useEffect(() => {
        if (prevIgnoredColumnsRef.current !== selection.ignoredColumns) {
            prevIgnoredColumnsRef.current = selection.ignoredColumns;

            if (
                !isComparing &&
                diffResult &&
                sourceConnection &&
                targetConnection &&
                selection.sourceTableName &&
                selection.targetTableName
            ) {
                const srcTable = sourceTables.find(
                    (t) => t.name === selection.sourceTableName,
                );
                const tgtTable = targetTables.find(
                    (t) => t.name === selection.targetTableName,
                );

                if (srcTable && tgtTable) {
                    runComparison(
                        sourceConnection,
                        targetConnection,
                        srcTable,
                        tgtTable,
                    );
                }
            }
        }
    }, [
        selection.ignoredColumns,
        selection.sourceTableName,
        selection.targetTableName,
        isComparing,
        diffResult,
        sourceConnection,
        targetConnection,
        sourceTables,
        targetTables,
        runComparison,
    ]);

    const handleConnectAndSelect = async (
        connection: Connection,
        side: "source" | "target",
    ) => {
        await connectTo(connection);
        if (side === "source") {
            setSelectedSourceConnId(connection.id);
            setSourceConnOpen(false);
            setSourceTableOpen(true); // Open table dropdown after connection
        } else {
            setSelectedTargetConnId(connection.id);
            setTargetConnOpen(false);
            setTargetTableOpen(true);
        }
    };

    const handleMergeClick = () => {
        setShowMergeModal(true);
    };

    const handleConfirmMerge = async () => {
        if (!targetConnection) return;
        await executeMerge(targetConnection);
    };

    // If we have initial data (it's a result tab) and we have a result, we might want to hide the selectors?
    // For now, let's keep them visible so user can adjust.
    // But specific requirement "Auto-create tabs" implies they are separate things.
    // If this is a separate tab, we probably don't need to change selection there?
    // Actually, allowing change is fine, it just stays in this tab.

    return (
        <div className="h-full flex flex-col p-6">
            {/* Source/Target Selection */}
            <div className="flex items-center gap-4 mb-6">
                {/* Source Selector */}
                <ConnectionSelector
                    label="Source"
                    connections={connections}
                    connectionStatuses={connectionStatuses}
                    selectedConnection={sourceConnection}
                    onConnectionClick={(conn) => {
                        const status = connectionStatuses.get(conn.id);
                        if (status?.status === "connected") {
                            setSelectedSourceConnId(conn.id);
                            setSourceConnOpen(false);
                        } else {
                            handleConnectAndSelect(conn, "source");
                        }
                    }}
                    tables={sourceTables}
                    selectedTableNames={selectedSourceTables}
                    onTableSelect={(names) => {
                        setSelectedSourceTables(names);
                        // Auto-select matching tables in target if target connection selected
                        if (targetConnection && targetTables.length > 0) {
                            const matchingTargets = names.filter((n) =>
                                targetTables.some((t) => t.name === n),
                            );
                            if (matchingTargets.length > 0) {
                                setSelectedTargetTables(matchingTargets);
                            }
                        }
                    }}
                    isConnectionOpen={sourceConnOpen}
                    onToggleConnection={() => {
                        setSourceConnOpen(!sourceConnOpen);
                        if (!sourceConnOpen) setSourceTableOpen(false);
                    }}
                    isTableOpen={sourceTableOpen}
                    onToggleTable={() => {
                        setSourceTableOpen(!sourceTableOpen);
                        if (!sourceTableOpen) setSourceConnOpen(false);
                    }}
                    isLoading={
                        sourceConnection
                            ? tableLoadingStatuses.get(sourceConnection.id)
                            : false
                    }
                />

                {/* Compare Arrow */}
                <div className="pt-6">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                        <GitCompare className="w-5 h-5 text-white" />
                    </div>
                </div>

                {/* Target Selector */}
                <ConnectionSelector
                    label="Target"
                    connections={connections}
                    connectionStatuses={connectionStatuses}
                    selectedConnection={targetConnection}
                    onConnectionClick={(conn) => {
                        const status = connectionStatuses.get(conn.id);
                        if (status?.status === "connected") {
                            setSelectedTargetConnId(conn.id);
                            setTargetConnOpen(false);
                        } else {
                            handleConnectAndSelect(conn, "target");
                        }
                    }}
                    tables={targetTables}
                    selectedTableNames={selectedTargetTables}
                    onTableSelect={setSelectedTargetTables}
                    isConnectionOpen={targetConnOpen}
                    onToggleConnection={() => {
                        setTargetConnOpen(!targetConnOpen);
                        if (!targetConnOpen) setTargetTableOpen(false);
                    }}
                    isTableOpen={targetTableOpen}
                    onToggleTable={() => {
                        setTargetTableOpen(!targetTableOpen);
                        if (!targetTableOpen) setTargetConnOpen(false);
                    }}
                    isLoading={
                        targetConnection
                            ? tableLoadingStatuses.get(targetConnection.id)
                            : false
                    }
                />

                {/* Compare Button */}
                <div className="flex flex-col gap-2 pt-6">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCompare}
                            disabled={!canCompare || isComparing}
                            className="flex-1 px-6 py-3 bg-accent text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
                        >
                            {isComparing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Comparing...
                                </>
                            ) : (
                                "Compare"
                            )}
                        </button>
                        {currentSourceTable && (
                            <ColumnIgnorePanel
                                columns={currentSourceTable.columns}
                                ignoredColumns={selection.ignoredColumns}
                                onToggleColumn={toggleIgnoredColumn}
                            />
                        )}
                    </div>

                    {diffResult && hasSelection && (
                        <button
                            type="button"
                            onClick={handleMergeClick}
                            className="px-6 py-3 bg-success text-white rounded-lg font-medium hover:bg-success/90 shadow-lg shadow-success/20 transition-all flex items-center gap-2"
                        >
                            <GitMerge className="w-4 h-4" />
                            Merge ({selectedRowCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 px-4 py-3 bg-deleted-bg text-deleted rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Selection Summary (appears when there's a selection) */}
            {diffResult && hasSelection && (
                <div className="flex items-center gap-4 bg-surface-elevated px-4 py-2 border-t border-border animate-in slide-in-from-bottom duration-200 mb-4 rounded-lg">
                    <span className="text-sm text-text-primary">
                        {selectedRowCount} rows selected for merge.
                    </span>
                </div>
            )}

            {/* Results or Empty State */}
            {diffResult ? (
                <DiffResultsGrid
                    result={diffResult}
                    onRecompare={(newLimit?: number) => {
                        // Re-run comparison with new limit if provided
                        if (
                            sourceConnection &&
                            targetConnection &&
                            selection.sourceTableName && // Use selection from context as we are in Result Mode
                            selection.targetTableName
                        ) {
                            const srcTable = sourceTables.find(
                                (t) => t.name === selection.sourceTableName,
                            );
                            const tgtTable = targetTables.find(
                                (t) => t.name === selection.targetTableName,
                            );
                            if (srcTable && tgtTable) {
                                runComparison(
                                    sourceConnection,
                                    targetConnection,
                                    srcTable,
                                    tgtTable,
                                    newLimit,
                                );
                            }
                        }
                    }}
                />
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center bg-surface rounded-xl border border-border">
                    <div className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
                        <GitCompare className="w-10 h-10 text-text-muted" />
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary mb-2">
                        Ready to Compare
                    </h2>
                    <p className="text-sm text-text-secondary text-center max-w-md">
                        Select a source and target database connection, then
                        choose tables to compare their contents side by side.
                    </p>
                </div>
            )}

            {/* Merge Confirmation Modal */}
            {showMergeModal && (
                <MergeConfirmationModal
                    onClose={() => setShowMergeModal(false)}
                    onConfirm={handleConfirmMerge}
                    targetConnection={targetConnection}
                    sourceConnectionName={diffResult?.sourceConnection}
                    targetConnectionName={diffResult?.targetConnection}
                    tableName={diffResult?.tableName}
                    mergeOperations={mergeOperations}
                    isMerging={isMerging}
                    mergeError={mergeError}
                    mergeSuccess={mergeSuccess}
                    hasInsertAsNew={insertAsNewRows.size > 0}
                    targetTables={targetTables}
                    fkCascadeChain={fkCascadeChain}
                    onAddFkCascade={addFkCascade}
                    onRemoveFkCascade={removeFkCascade}
                />
            )}
        </div>
    );
}

export function DiffWorkspace(props: DiffWorkspaceProps) {
    return (
        <DiffProvider>
            <DiffView {...props} />
        </DiffProvider>
    );
}
