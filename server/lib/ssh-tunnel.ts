import { type ChildProcess, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import { Client } from "ssh2";

interface TunnelInfo {
    type: "ssh2" | "process";
    localPort: number;
    client?: Client;
    process?: ChildProcess;
    server?: net.Server;
}

// Store active tunnels keyed by connectionId
const activeTunnels = new Map<string, TunnelInfo>();

export interface SSHConfig {
    enabled: boolean;
    configAlias?: string;
    host?: string;
    port?: number;
    username?: string;
    privateKeyPath?: string;
    passphrase?: string;
    password?: string;
}

// Find an available port for local forwarding
async function findAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (address && typeof address === "object") {
                const port = address.port;
                server.close(() => resolve(port));
            } else {
                reject(new Error("Could not get port"));
            }
        });
        server.on("error", reject);
    });
}

// Create SSH tunnel using ssh2 library (manual config)
async function createSSH2Tunnel(
    connectionId: string,
    sshConfig: SSHConfig,
    dbHost: string,
    dbPort: number,
): Promise<number> {
    const localPort = await findAvailablePort();

    return new Promise((resolve, reject) => {
        const client = new Client();

        client.on("ready", () => {
            // Create a local server that forwards to the remote DB
            const server = net.createServer((sock) => {
                client.forwardOut(
                    "127.0.0.1",
                    localPort,
                    dbHost,
                    dbPort,
                    (err, stream) => {
                        if (err) {
                            sock.destroy();
                            return;
                        }
                        sock.pipe(stream);
                        stream.pipe(sock);
                    },
                );
            });

            server.listen(localPort, "127.0.0.1", () => {
                activeTunnels.set(connectionId, {
                    type: "ssh2",
                    localPort,
                    client,
                    server,
                });
                resolve(localPort);
            });

            server.on("error", (err) => {
                client.end();
                reject(err);
            });
        });

        client.on("error", (err) => {
            reject(err);
        });

        // Build connection config
        const connectConfig: {
            host: string;
            port: number;
            username: string;
            privateKey?: Buffer;
            passphrase?: string;
            password?: string;
        } = {
            host: sshConfig.host || "localhost",
            port: sshConfig.port || 22,
            username: sshConfig.username || process.env.USER || "root",
        };

        // Try private key auth first
        if (sshConfig.privateKeyPath) {
            try {
                connectConfig.privateKey = fs.readFileSync(
                    sshConfig.privateKeyPath,
                );
                if (sshConfig.passphrase) {
                    connectConfig.passphrase = sshConfig.passphrase;
                }
            } catch (_e) {
                return reject(
                    new Error(
                        `Could not read private key: ${sshConfig.privateKeyPath}`,
                    ),
                );
            }
        } else if (sshConfig.password) {
            connectConfig.password = sshConfig.password;
        } else {
            // Try default key paths
            const defaultKeyPaths = [
                `${process.env.HOME}/.ssh/id_rsa`,
                `${process.env.HOME}/.ssh/id_ed25519`,
            ];
            for (const keyPath of defaultKeyPaths) {
                try {
                    if (fs.existsSync(keyPath)) {
                        connectConfig.privateKey = fs.readFileSync(keyPath);
                        break;
                    }
                } catch (_e) {
                    // Continue to next
                }
            }
        }

        client.connect(connectConfig);
    });
}

// Create SSH tunnel using system ssh command (config alias mode)
async function createProcessTunnel(
    connectionId: string,
    configAlias: string,
    dbHost: string,
    dbPort: number,
): Promise<number> {
    const localPort = await findAvailablePort();

    return new Promise((resolve, reject) => {
        // Use ssh -N -L for local port forwarding
        const sshProcess = spawn(
            "ssh",
            ["-N", "-L", `${localPort}:${dbHost}:${dbPort}`, configAlias],
            {
                stdio: ["pipe", "pipe", "pipe"],
            },
        );

        let stderr = "";
        sshProcess.stderr?.on("data", (data) => {
            stderr += data.toString();
        });

        // Give it a moment to establish the connection
        const timeout = setTimeout(() => {
            // Check if process is still running (meaning tunnel is up)
            if (sshProcess.exitCode === null) {
                activeTunnels.set(connectionId, {
                    type: "process",
                    localPort,
                    process: sshProcess,
                });
                resolve(localPort);
            } else {
                reject(new Error(`SSH tunnel failed: ${stderr}`));
            }
        }, 2000);

        sshProcess.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        sshProcess.on("exit", (code) => {
            clearTimeout(timeout);
            if (code !== 0 && code !== null) {
                reject(new Error(`SSH exited with code ${code}: ${stderr}`));
            }
        });
    });
}

/**
 * Create an SSH tunnel for a MySQL connection
 * Returns the local port to connect to
 */
export async function createTunnel(
    connectionId: string,
    sshConfig: SSHConfig,
    dbHost: string,
    dbPort: number,
): Promise<{ success: boolean; localPort?: number; error?: string }> {
    try {
        // Close any existing tunnel for this connection
        await closeTunnel(connectionId);

        let localPort: number;

        if (sshConfig.configAlias) {
            // Use system ssh command with config alias
            localPort = await createProcessTunnel(
                connectionId,
                sshConfig.configAlias,
                dbHost,
                dbPort,
            );
        } else {
            // Use ssh2 library with manual config
            localPort = await createSSH2Tunnel(
                connectionId,
                sshConfig,
                dbHost,
                dbPort,
            );
        }

        return { success: true, localPort };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Close an SSH tunnel for a connection
 */
export async function closeTunnel(connectionId: string): Promise<void> {
    const tunnel = activeTunnels.get(connectionId);
    if (!tunnel) return;

    if (tunnel.type === "ssh2") {
        tunnel.server?.close();
        tunnel.client?.end();
    } else if (tunnel.type === "process") {
        tunnel.process?.kill();
    }

    activeTunnels.delete(connectionId);
}

/**
 * Check if a tunnel exists for a connection
 */
export function hasTunnel(connectionId: string): boolean {
    return activeTunnels.has(connectionId);
}

/**
 * Get the local port for an active tunnel
 */
export function getTunnelPort(connectionId: string): number | undefined {
    return activeTunnels.get(connectionId)?.localPort;
}
