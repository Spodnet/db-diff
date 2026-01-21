/**
 * Shared types for merge operations.
 * These types allow the client to send structured operation intents
 * rather than raw SQL, improving security.
 */

export type MergeOperationType = "insert" | "update" | "delete";

/**
 * Represents a single merge operation to be performed on the target database.
 */
export interface MergeOperation {
    /** The type of operation to perform */
    type: MergeOperationType;
    /** The table to operate on */
    tableName: string;
    /** The primary key column name */
    primaryKeyColumn: string;
    /** The primary key value for this row */
    primaryKeyValue: string | number;
    /** Column names (for insert/update) */
    columns?: string[];
    /** Column values keyed by column name (for insert/update) */
    values?: Record<string, unknown>;
    /** If true, insert as new row (omit PK, let auto-increment assign) */
    isInsertAsNew?: boolean;
}

/**
 * FK Cascade mapping for recursive row duplication
 */
export interface FkCascadeMapping {
    table: string;
    column: string;
    children: FkCascadeMapping[];
}

/**
 * Request body for merge execution
 */
export interface MergeRequest {
    /** Database type */
    type: "sqlite" | "mysql";
    /** List of merge operations to execute */
    operations: MergeOperation[];
    /** FK cascade chain for insert-as-new operations */
    fkCascadeChain?: FkCascadeMapping[];
}

/**
 * Response from merge execution
 */
export interface MergeResponse {
    success: boolean;
    error?: string;
    /** Map of original PK -> new PK for insert-as-new operations */
    newIdMap?: Record<string, number>;
}
