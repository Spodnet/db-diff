import { ChevronDown, ChevronRight, Shield } from "lucide-react";
import type { MySQLConnection } from "../../lib/types";

interface MysqlConnectionFormProps {
    config: Partial<MySQLConnection>;
    onChange: (config: Partial<MySQLConnection>) => void;
}

export function MysqlConnectionForm({
    config,
    onChange,
}: MysqlConnectionFormProps) {
    const sshEnabled = config.ssh?.enabled ?? false;
    const sshMode = config.ssh?.configAlias ? "alias" : "manual";

    const updateConfig = (updates: Partial<MySQLConnection>) => {
        onChange({ ...config, ...updates });
    };

    const updateSshConfig = (
        updates: Partial<NonNullable<MySQLConnection["ssh"]>>,
    ) => {
        const currentSsh = config.ssh ?? { enabled: false };
        updateConfig({
            ssh: { ...currentSsh, ...updates },
        });
    };

    const toggleSsh = () => {
        if (sshEnabled) {
            // Disable it
            updateConfig({ ssh: undefined });
        } else {
            // Enable it, default to manual mode if no alias present
            // We use a temporary object to avoid 'enabled' being overwritten by spread
            const existingSsh = config.ssh ?? {
                host: "",
                port: 22,
                username: "",
                privateKeyPath: "",
            };
            
            updateConfig({
                ssh: {
                    ...existingSsh,
                    enabled: true,
                },
            });
        }
    };

    return (
        <div className="space-y-4">
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
                        value={config.host ?? "localhost"}
                        onChange={(e) => updateConfig({ host: e.target.value })}
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
                        value={config.port ?? 3306}
                        onChange={(e) =>
                            updateConfig({ port: Number(e.target.value) })
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
                    value={config.database ?? ""}
                    onChange={(e) => updateConfig({ database: e.target.value })}
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
                        value={config.username ?? "root"}
                        onChange={(e) =>
                            updateConfig({ username: e.target.value })
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
                        value={config.password ?? ""}
                        onChange={(e) =>
                            updateConfig({ password: e.target.value })
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
                    onClick={toggleSsh}
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
                                    updateSshConfig({
                                        configAlias: "my-server",
                                        host: undefined,
                                        username: undefined,
                                        privateKeyPath: undefined,
                                        passphrase: undefined,
                                        password: undefined,
                                    })
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
                                    updateSshConfig({ configAlias: undefined })
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
                                    value={config.ssh?.configAlias ?? ""}
                                    onChange={(e) =>
                                        updateSshConfig({
                                            configAlias: e.target.value,
                                        })
                                    }
                                    placeholder="my-server (from ~/.ssh/config)"
                                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                                />
                                <p className="mt-1 text-xs text-text-muted">
                                    Uses your SSH config file (~/.ssh/config)
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
                                            value={config.ssh?.host ?? ""}
                                            onChange={(e) =>
                                                updateSshConfig({
                                                    host: e.target.value,
                                                })
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
                                            value={config.ssh?.port ?? 22}
                                            onChange={(e) =>
                                                updateSshConfig({
                                                    port: Number(e.target.value),
                                                })
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
                                        value={config.ssh?.username ?? ""}
                                        onChange={(e) =>
                                            updateSshConfig({
                                                username: e.target.value,
                                            })
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
                                        Private Key Path (optional)
                                    </label>
                                    <input
                                        id="ssh-private-key"
                                        type="text"
                                        value={config.ssh?.privateKeyPath ?? ""}
                                        onChange={(e) =>
                                            updateSshConfig({
                                                privateKeyPath: e.target.value,
                                            })
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
                                        Key Passphrase (optional)
                                    </label>
                                    <input
                                        id="ssh-passphrase"
                                        type="password"
                                        value={config.ssh?.passphrase ?? ""}
                                        onChange={(e) =>
                                            updateSshConfig({
                                                passphrase: e.target.value,
                                            })
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
                                        value={config.ssh?.password ?? ""}
                                        onChange={(e) =>
                                            updateSshConfig({
                                                password: e.target.value,
                                            })
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
        </div>
    );
}
