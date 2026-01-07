import {
    Check,
    ChevronDown,
    ChevronRight,
    Database,
    FileText,
    Loader2,
    Server,
    Shield,
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

    // SQLite fields
    const [filePath, setFilePath] = useState(
        editConnection?.type === "sqlite" ? editConnection.filePath : "",
    );

    // MySQL fields
    const [host, setHost] = useState(
        editConnection?.type === "mysql" ? editConnection.host : "localhost",
    );
    const [port, setPort] = useState(
        editConnection?.type === "mysql" ? editConnection.port : 3306,
    );
    const [database, setDatabase] = useState(
        editConnection?.type === "mysql" ? editConnection.database : "",
    );
    const [username, setUsername] = useState(
        editConnection?.type === "mysql" ? editConnection.username : "root",
    );
    const [password, setPassword] = useState(
        editConnection?.type === "mysql" ? editConnection.password : "",
    );

    // SSH tunnel fields
    const [sshEnabled, setSshEnabled] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.enabled ?? false)
            : false,
    );
    const [sshMode, setSshMode] = useState<"alias" | "manual">(
        editConnection?.type === "mysql" && editConnection.ssh?.configAlias
            ? "alias"
            : "manual",
    );
    const [sshConfigAlias, setSshConfigAlias] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.configAlias ?? "")
            : "",
    );
    const [sshHost, setSshHost] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.host ?? "")
            : "",
    );
    const [sshPort, setSshPort] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.port ?? 22)
            : 22,
    );
    const [sshUsername, setSshUsername] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.username ?? "")
            : "",
    );
    const [sshPrivateKeyPath, setSshPrivateKeyPath] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.privateKeyPath ?? "")
            : "",
    );
    const [sshPassphrase, setSshPassphrase] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.passphrase ?? "")
            : "",
    );
    const [sshPassword, setSshPassword] = useState(
        editConnection?.type === "mysql"
            ? (editConnection.ssh?.password ?? "")
            : "",
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
                filePath,
            } as SQLiteConnection;
        }

        return {
            ...base,
            type: "mysql",
            host,
            port,
            database,
            username,
            password,
            ssh: sshEnabled
                ? {
                      enabled: true,
                      ...(sshMode === "alias"
                          ? { configAlias: sshConfigAlias }
                          : {
                                host: sshHost || host,
                                port: sshPort,
                                username: sshUsername,
                                privateKeyPath: sshPrivateKeyPath || undefined,
                                passphrase: sshPassphrase || undefined,
                                password: sshPassword || undefined,
                            }),
                  }
                : undefined,
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

                    {/* SQLite Fields */}
                    {connectionType === "sqlite" && (
                        <div>
                            <label
                                htmlFor="file-path"
                                className="block text-sm font-medium text-text-secondary mb-1.5"
                            >
                                Database File Path
                            </label>
                            <input
                                id="file-path"
                                type="text"
                                value={filePath}
                                onChange={(e) => setFilePath(e.target.value)}
                                placeholder="/path/to/database.sqlite"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                            />
                        </div>
                    )}

                    {/* MySQL Fields */}
                    {connectionType === "mysql" && (
                        <>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label
                                        htmlFor="mysql-host"
                                        className="block text-sm font-medium text-text-secondary mb-1.5"
                                    >
                                        Host
                                    </label>
                                    <input
                                        id="mysql-host"
                                        type="text"
                                        value={host}
                                        onChange={(e) =>
                                            setHost(e.target.value)
                                        }
                                        placeholder="localhost"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="mysql-port"
                                        className="block text-sm font-medium text-text-secondary mb-1.5"
                                    >
                                        Port
                                    </label>
                                    <input
                                        id="mysql-port"
                                        type="number"
                                        value={port}
                                        onChange={(e) =>
                                            setPort(Number(e.target.value))
                                        }
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="mysql-database"
                                    className="block text-sm font-medium text-text-secondary mb-1.5"
                                >
                                    Database
                                </label>
                                <input
                                    id="mysql-database"
                                    type="text"
                                    value={database}
                                    onChange={(e) =>
                                        setDatabase(e.target.value)
                                    }
                                    placeholder="my_database"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="mysql-username"
                                        className="block text-sm font-medium text-text-secondary mb-1.5"
                                    >
                                        Username
                                    </label>
                                    <input
                                        id="mysql-username"
                                        type="text"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        placeholder="root"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="mysql-password"
                                        className="block text-sm font-medium text-text-secondary mb-1.5"
                                    >
                                        Password
                                    </label>
                                    <input
                                        id="mysql-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        placeholder="••••••••"
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                    />
                                </div>
                            </div>

                            {/* SSH Tunnel Configuration */}
                            <div className="border border-border rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setSshEnabled(!sshEnabled)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-elevated hover:bg-surface-elevated/80 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-text-secondary" />
                                        <span className="text-sm font-medium text-text-primary">
                                            SSH Tunnel
                                        </span>
                                        {sshEnabled && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/20 text-accent">
                                                Enabled
                                            </span>
                                        )}
                                    </div>
                                    {sshEnabled ? (
                                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-text-secondary" />
                                    )}
                                </button>

                                {sshEnabled && (
                                    <div className="p-3 space-y-3 border-t border-border bg-background/50">
                                        {/* SSH Mode Tabs */}
                                        <div className="flex gap-1 p-1 bg-surface-elevated rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSshMode("alias")
                                                }
                                                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                    sshMode === "alias"
                                                        ? "bg-accent text-white"
                                                        : "text-text-secondary hover:text-text-primary"
                                                }`}
                                            >
                                                SSH Config Alias
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSshMode("manual")
                                                }
                                                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                    sshMode === "manual"
                                                        ? "bg-accent text-white"
                                                        : "text-text-secondary hover:text-text-primary"
                                                }`}
                                            >
                                                Manual Config
                                            </button>
                                        </div>

                                        {/* SSH Config Alias Mode */}
                                        {sshMode === "alias" && (
                                            <div>
                                                <label
                                                    htmlFor="ssh-config-alias"
                                                    className="block text-xs font-medium text-text-secondary mb-1"
                                                >
                                                    SSH Config Alias
                                                </label>
                                                <input
                                                    id="ssh-config-alias"
                                                    type="text"
                                                    value={sshConfigAlias}
                                                    onChange={(e) =>
                                                        setSshConfigAlias(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder="my-server (from ~/.ssh/config)"
                                                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                                />
                                                <p className="mt-1 text-xs text-text-muted">
                                                    Uses your SSH config file
                                                    (~/.ssh/config)
                                                </p>
                                            </div>
                                        )}

                                        {/* Manual SSH Configuration */}
                                        {sshMode === "manual" && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="col-span-2">
                                                        <label
                                                            htmlFor="ssh-host"
                                                            className="block text-xs font-medium text-text-secondary mb-1"
                                                        >
                                                            SSH Host
                                                        </label>
                                                        <input
                                                            id="ssh-host"
                                                            type="text"
                                                            value={sshHost}
                                                            onChange={(e) =>
                                                                setSshHost(
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="ssh.example.com"
                                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label
                                                            htmlFor="ssh-port"
                                                            className="block text-xs font-medium text-text-secondary mb-1"
                                                        >
                                                            Port
                                                        </label>
                                                        <input
                                                            id="ssh-port"
                                                            type="number"
                                                            value={sshPort}
                                                            onChange={(e) =>
                                                                setSshPort(
                                                                    Number(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                )
                                                            }
                                                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent transition-colors"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="ssh-username"
                                                        className="block text-xs font-medium text-text-secondary mb-1"
                                                    >
                                                        SSH Username
                                                    </label>
                                                    <input
                                                        id="ssh-username"
                                                        type="text"
                                                        value={sshUsername}
                                                        onChange={(e) =>
                                                            setSshUsername(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="ubuntu"
                                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="ssh-private-key"
                                                        className="block text-xs font-medium text-text-secondary mb-1"
                                                    >
                                                        Private Key Path
                                                        (optional)
                                                    </label>
                                                    <input
                                                        id="ssh-private-key"
                                                        type="text"
                                                        value={
                                                            sshPrivateKeyPath
                                                        }
                                                        onChange={(e) =>
                                                            setSshPrivateKeyPath(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="~/.ssh/id_rsa"
                                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="ssh-passphrase"
                                                        className="block text-xs font-medium text-text-secondary mb-1"
                                                    >
                                                        Key Passphrase
                                                        (optional)
                                                    </label>
                                                    <input
                                                        id="ssh-passphrase"
                                                        type="password"
                                                        value={sshPassphrase}
                                                        onChange={(e) =>
                                                            setSshPassphrase(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="••••••••"
                                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                                    />
                                                </div>

                                                <div>
                                                    <label
                                                        htmlFor="ssh-password"
                                                        className="block text-xs font-medium text-text-secondary mb-1"
                                                    >
                                                        SSH Password (if no key)
                                                    </label>
                                                    <input
                                                        id="ssh-password"
                                                        type="password"
                                                        value={sshPassword}
                                                        onChange={(e) =>
                                                            setSshPassword(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="••••••••"
                                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
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
