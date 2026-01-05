import { createContext, useContext, useEffect, useState } from "react";
import type { Connection, ConnectionStatus, TableInfo } from "../lib/types";

interface ConnectionContextType {
	connections: Connection[];
	connectionStatuses: Map<string, ConnectionStatus>;
	connectionTables: Map<string, TableInfo[]>;
	addConnection: (connection: Connection) => void;
	updateConnection: (connection: Connection) => void;
	deleteConnection: (id: string) => void;
	testConnection: (connection: Connection) => Promise<boolean>;
	connectTo: (connection: Connection) => Promise<void>;
	disconnect: (connection: Connection) => Promise<void>;
	fetchTables: (connection: Connection) => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

const STORAGE_KEY = "db-diff-connections";

const CONNECTION_COLORS = [
	"#EF4444", // red-500
	"#F97316", // orange-500
	"#F59E0B", // amber-500
	"#84CC16", // lime-500
	"#10B981", // emerald-500
	"#06B6D4", // cyan-500
	"#3B82F6", // blue-500
	"#6366F1", // indigo-500
	"#8B5CF6", // violet-500
	"#D946EF", // fuchsia-500
	"#EC4899", // pink-500
	"#F43F5E", // rose-500
	"#64748B", // slate-500
	"#14B8A6", // teal-500
	"#A855F7", // purple-500
	"#0EA5E9", // sky-500
];

function assignColor(connections: Connection[]): string {
	const usedColors = new Set(connections.map((c) => c.color).filter(Boolean));
	return (
		CONNECTION_COLORS.find((c) => !usedColors.has(c)) || CONNECTION_COLORS[0]
	);
}

function loadConnections(): Connection[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const loaded: Connection[] = JSON.parse(stored);
			// Assign colors to legacy connections
			let hasChanges = false;
			const updated = loaded.map((c) => {
				if (!c.color) {
					hasChanges = true;
					// Assign next available color logic roughly
					// But for initial load we need to be careful not to reuse same color if possible
					// Ideally we map one by one.
					return { ...c };
				}
				return c;
			});

			// If we have legacy connections without colors, assign unique ones
			if (hasChanges) {
				const used = new Set<string>();
				return updated.map((c) => {
					if (!c.color) {
						const color =
							CONNECTION_COLORS.find((col) => !used.has(col)) ||
							CONNECTION_COLORS[0];
						used.add(color);
						return { ...c, color };
					}
					used.add(c.color);
					return c;
				});
			}

			return loaded;
		}
	} catch (e) {
		console.error("Failed to load connections:", e);
	}
	return [];
}

function saveConnections(connections: Connection[]) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

export function ConnectionProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [connections, setConnections] = useState<Connection[]>([]);
	const [connectionStatuses, setConnectionStatuses] = useState<
		Map<string, ConnectionStatus>
	>(new Map());
	const [connectionTables, setConnectionTables] = useState<
		Map<string, TableInfo[]>
	>(new Map());

	// Load connections from localStorage on mount
	useEffect(() => {
		setConnections(loadConnections());
	}, []);

	// Save connections to localStorage when they change
	useEffect(() => {
		if (connections.length > 0) {
			saveConnections(connections);
		}
	}, [connections]);

	const addConnection = (connection: Connection) => {
		const color = assignColor(connections);
		setConnections((prev) => [...prev, { ...connection, color }]);
	};

	const updateConnection = (connection: Connection) => {
		setConnections((prev) =>
			prev.map((c) => (c.id === connection.id ? connection : c)),
		);
	};

	const deleteConnection = (id: string) => {
		setConnections((prev) => prev.filter((c) => c.id !== id));
		setConnectionStatuses((prev) => {
			const next = new Map(prev);
			next.delete(id);
			return next;
		});
		setConnectionTables((prev) => {
			const next = new Map(prev);
			next.delete(id);
			return next;
		});
	};

	const setStatus = (id: string, status: ConnectionStatus) => {
		setConnectionStatuses((prev) => {
			const next = new Map(prev);
			next.set(id, status);
			return next;
		});
	};

	const testConnection = async (connection: Connection): Promise<boolean> => {
		try {
			const response = await fetch("/api/connections/test", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(connection),
			});
			const result = await response.json();
			return result.success;
		} catch {
			return false;
		}
	};

	const connectTo = async (connection: Connection) => {
		const { id } = connection;
		setStatus(id, { connectionId: id, status: "connecting" });
		try {
			const response = await fetch(`/api/connections/${id}/connect`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(connection),
			});
			const result = await response.json();
			if (result.success) {
				setStatus(id, { connectionId: id, status: "connected" });
				// Automatically fetch tables after connecting
				await fetchTables(connection);
			} else {
				setStatus(id, {
					connectionId: id,
					status: "error",
					error: result.error,
				});
			}
		} catch (e) {
			setStatus(id, {
				connectionId: id,
				status: "error",
				error: e instanceof Error ? e.message : "Unknown error",
			});
		}
	};

	const disconnect = async (connection: Connection) => {
		const { id, type } = connection;
		try {
			await fetch(`/api/connections/${id}/disconnect`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ type }),
			});
		} catch (e) {
			console.error("Failed to disconnect:", e);
		}
		setStatus(id, { connectionId: id, status: "disconnected" });
		setConnectionTables((prev) => {
			const next = new Map(prev);
			next.delete(id);
			return next;
		});
	};

	const fetchTables = async (connection: Connection) => {
		const { id, type } = connection;
		try {
			const response = await fetch(`/api/database/${id}/tables?type=${type}`);
			const result = await response.json();
			if (result.success) {
				setConnectionTables((prev) => {
					const next = new Map(prev);
					next.set(
						id,
						result.tables.sort((a: TableInfo, b: TableInfo) =>
							a.name.localeCompare(b.name),
						),
					);
					return next;
				});
			}
		} catch (e) {
			console.error("Failed to fetch tables:", e);
		}
	};

	return (
		<ConnectionContext.Provider
			value={{
				connections,
				connectionStatuses,
				connectionTables,
				addConnection,
				updateConnection,
				deleteConnection,
				testConnection,
				connectTo,
				disconnect,
				fetchTables,
			}}
		>
			{children}
		</ConnectionContext.Provider>
	);
}

export function useConnections() {
	const context = useContext(ConnectionContext);
	if (!context) {
		throw new Error("useConnections must be used within a ConnectionProvider");
	}
	return context;
}
