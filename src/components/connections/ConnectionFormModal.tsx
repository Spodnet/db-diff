import {
    Check,
    Database,
    FileText,
    Loader2,
    Server,
    X,
} from "lucide-react";
import { useState } from "react";
import { useConnections } from "../../hooks/useConnections";
import type {
    Connection,
    ConnectionType,
    MySQLConnection,
    SQLiteConnection,
} from "../../lib/types";
import { MysqlConnectionForm } from "./MysqlConnectionForm";
import { SqliteConnectionForm } from "./SqliteConnectionForm";

interface ConnectionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editConnection?: Connection;
}

function generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function ConnectionFormModal({
    isOpen,
    onClose,
    editConnection,
}: ConnectionFormModalProps) {
    const { addConnection, updateConnection, testConnection } =
        useConnections();
    const [connectionType, setConnectionType] = useState<ConnectionType>(
        editConnection?.type ?? "sqlite",
    );
    const [name, setName] = useState(editConnection?.name ?? "");
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<boolean | null>(null);

    // Connection Configurations
    const [sqliteConfig, setSqliteConfig] = useState<Partial<SQLiteConnection>>(
        editConnection?.type === "sqlite" ? editConnection : { filePath: "" },
    );

    const [mysqlConfig, setMysqlConfig] = useState<Partial<MySQLConnection>>(
        editConnection?.type === "mysql"
            ? editConnection
            : {
                  host: "localhost",
                  port: 3306,
                  username: "root",
                  password: "",
                  database: "",
              },
    );

    if (!isOpen) return null;

    const buildConnection = (): Connection => {
        const base = {
            id: editConnection?.id ?? generateId(),
            name:
                name ||
                (connectionType === "sqlite" ? "SQLite DB" : "MySQL DB"),
            createdAt: editConnection?.createdAt ?? new Date().toISOString(),
        };

        if (connectionType === "sqlite") {
            return {
                ...base,
                type: "sqlite",
                filePath: sqliteConfig.filePath ?? "",
            } as SQLiteConnection;
        }

        // MySQL
        const sshConfig = mysqlConfig.ssh?.enabled
            ? {
                  enabled: true,
                  ...(mysqlConfig.ssh.configAlias
                      ? { configAlias: mysqlConfig.ssh.configAlias }
                      : {
                            host: mysqlConfig.ssh.host || mysqlConfig.host,
                            port: mysqlConfig.ssh.port ?? 22,
                            username: mysqlConfig.ssh.username,
                            privateKeyPath:
                                mysqlConfig.ssh.privateKeyPath || undefined,
                            passphrase: mysqlConfig.ssh.passphrase || undefined,
                            password: mysqlConfig.ssh.password || undefined,
                        }),
              }
            : undefined;

        return {
            ...base,
            type: "mysql",
            host: mysqlConfig.host ?? "localhost",
            port: mysqlConfig.port ?? 3306,
            database: mysqlConfig.database ?? "",
            username: mysqlConfig.username ?? "root",
            password: mysqlConfig.password ?? "",
            ssh: sshConfig,
        } as MySQLConnection;
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const connection = buildConnection();
        const success = await testConnection(connection);
        setTestResult(success);
        setIsTesting(false);
    };

    const handleSave = () => {
        const connection = buildConnection();
        if (editConnection) {
            updateConnection(connection);
        } else {
            addConnection(connection);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close modal"
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
                onClick={onClose}
                onKeyDown={(e) => e.key === "Escape" && onClose()}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-xl border border-border shadow-2xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-text-primary">
                        {editConnection ? "Edit Connection" : "New Connection"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-surface-elevated transition-colors"
                    >
                        <X className="w-5 h-5 text-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Connection Type Tabs */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setConnectionType("sqlite")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                                connectionType === "sqlite"
                                    ? "bg-accent border-accent text-white"
                                    : "bg-surface-elevated border-border text-text-secondary hover:border-accent"
                            }`}
                        >
                            <FileText className="w-4 h-4" />
                            SQLite
                        </button>
                        <button
                            type="button"
                            onClick={() => setConnectionType("mysql")}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                                connectionType === "mysql"
                                    ? "bg-accent border-accent text-white"
                                    : "bg-surface-elevated border-border text-text-secondary hover:border-accent"
                            }`}
                        >
                            <Server className="w-4 h-4" />
                            MySQL
                        </button>
                    </div>

                    {/* Connection Name */}
                    <div>
                        <label
                            htmlFor="connection-name"
                            className="block text-sm font-medium text-text-secondary mb-1.5"
                        >
                            Connection Name
                        </label>
                        <input
                            id="connection-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={
                                connectionType === "sqlite"
                                    ? "My SQLite DB"
                                    : "My MySQL Server"
                            }
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                        />
                    </div>

                    {/* Forms */}
                    {connectionType === "sqlite" ? (
                        <SqliteConnectionForm
                            config={sqliteConfig}
                            onChange={setSqliteConfig}
                        />
                    ) : (
                        <MysqlConnectionForm
                            config={mysqlConfig}
                            onChange={setMysqlConfig}
                        />
                    )}

                    {/* Test Result */}
                    {testResult !== null && (
                        <div
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                testResult
                                    ? "bg-added-bg text-added"
                                    : "bg-deleted-bg text-deleted"
                            }`}
                        >
                            {testResult ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Connection successful!
                                </>
                            ) : (
                                <>
                                    <X className="w-4 h-4" />
                                    Connection failed. Check your settings.
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-border">
                    <button
                        type="button"
                        onClick={handleTest}
                        disabled={isTesting}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    >
                        {isTesting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Database className="w-4 h-4" />
                        )}
                        Test Connection
                    </button>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
                        >
                            {editConnection ? "Save Changes" : "Add Connection"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
