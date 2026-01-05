import {
	AlertCircle,
	ArrowRight,
	Check,
	CheckCircle,
	GitMerge,
	Loader2,
	X,
} from "lucide-react";
import type { Connection } from "../../../lib/types";

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
	selectedCount: number;
	mergeOperations: MergeOperation[];
	isMerging: boolean;
	mergeError: string | null;
	mergeSuccess: boolean;
}

export function MergeConfirmationModal({
	onClose,
	onConfirm,
	targetConnection,
	sourceConnectionName,
	targetConnectionName,
	tableName,
	selectedCount,
	mergeOperations,
	isMerging,
	mergeError,
	mergeSuccess,
}: MergeConfirmationModalProps) {
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
							You are about to apply <strong>{selectedCount}</strong> change
							{selectedCount !== 1 ? "s" : ""} to{" "}
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
									<span className="text-text-secondary">{op.sql}</span>
								</div>
							))}
						</div>
					</div>

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
