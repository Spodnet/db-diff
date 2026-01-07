import { Check, Columns, Settings2 } from "lucide-react";
import { useState } from "react";
import type { ColumnInfo } from "../../lib/types";

interface ColumnIgnorePanelProps {
    columns: ColumnInfo[];
    ignoredColumns: string[];
    onToggleColumn: (columnName: string) => void;
}

export function ColumnIgnorePanel({
    columns,
    ignoredColumns,
    onToggleColumn,
}: ColumnIgnorePanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ignoredSet = new Set(ignoredColumns);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                    ignoredColumns.length > 0
                        ? "bg-surface-elevated border-accent/50 text-text-primary"
                        : "bg-surface border-border text-text-secondary hover:text-text-primary"
                }`}
                title="Select columns to ignore"
            >
                <Settings2 className="w-4 h-4" />
                <span className="text-sm font-medium">Columns</span>
                {ignoredColumns.length > 0 && (
                    <span className="flex items-center justify-center bg-accent/10 text-accent text-xs font-bold px-1.5 h-5 rounded-full">
                        {columns.length - ignoredColumns.length}/
                        {columns.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: overlay */}
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: overlay */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-surface-elevated border border-border rounded-xl shadow-xl z-20 overflow-hidden flex flex-col max-h-[400px]">
                        <div className="p-3 border-b border-border bg-surface/50">
                            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                                Visible Columns
                            </h4>
                        </div>
                        <div className="overflow-y-auto p-1">
                            {columns.map((col) => {
                                const isIgnored = ignoredSet.has(col.name);
                                return (
                                    <button
                                        key={col.name}
                                        type="button"
                                        onClick={() => onToggleColumn(col.name)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-surface transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Columns className="w-3 h-3 text-text-muted shrink-0" />
                                            <span
                                                className={`truncate ${isIgnored ? "text-text-muted decoration-line-through" : "text-text-primary"}`}
                                            >
                                                {col.name}
                                            </span>
                                        </div>
                                        {!isIgnored && (
                                            <Check className="w-4 h-4 text-accent shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
