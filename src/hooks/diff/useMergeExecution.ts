import { useState } from "react";
import type { Connection, FkCascade, MergeOperation } from "../../lib/types";

export function useMergeExecution(resetSelection: () => void) {
    const [isMerging, setIsMerging] = useState(false);
    const [mergeError, setMergeError] = useState<string | null>(null);
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const [fkCascadeChain, setFkCascadeChain] = useState<FkCascade[]>([]);

    const executeMerge = async (
        targetConnection: Connection,
        mergeOperations: MergeOperation[],
    ) => {
        if (mergeOperations.length === 0) return;

        setIsMerging(true);
        setMergeError(null);
        setMergeSuccess(false);

        try {
            const response = await fetch(
                `/api/database/${targetConnection.id}/execute`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: targetConnection.type,
                        operations: mergeOperations,
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
                resetSelection();
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

    return {
        isMerging,
        mergeError,
        mergeSuccess,
        fkCascadeChain,
        executeMerge,
        clearMergeState,
        addFkCascade,
        removeFkCascade,
        clearFkCascades,
    };
}
