import { createContext, useContext, useEffect, useState } from "react";
import type { Connection, ConnectionStatus } from "../lib/types";

interface ConnectionContextType {
	connections: Connection[];
	connectionStatuses: Map<string, ConnectionStatus>;
	addConnection: (connection: Connection) => void;
	updateConnection: (connection: Connection) => void;
	deleteConnection: (id: string) => void;
	testConnection: (connection: Connection) => Promise<boolean>;
	connectTo: (id: string) => Promise<void>;
	disconnect: (id: string) => void;
}

const ConnectionContext = createContext<ConnectionContextType | null>(null);

const STORAGE_KEY = "db-diff-connections";

function loadConnections(): Connection[] {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
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
		setConnections((prev) => [...prev, connection]);
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

	const connectTo = async (id: string) => {
		setStatus(id, { connectionId: id, status: "connecting" });
		try {
			const response = await fetch(`/api/connections/${id}/connect`, {
				method: "POST",
			});
			const result = await response.json();
			if (result.success) {
				setStatus(id, { connectionId: id, status: "connected" });
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

	const disconnect = (id: string) => {
		setStatus(id, { connectionId: id, status: "disconnected" });
		// TODO: Call backend to close connection
	};

	return (
		<ConnectionContext.Provider
			value={{
				connections,
				connectionStatuses,
				addConnection,
				updateConnection,
				deleteConnection,
				testConnection,
				connectTo,
				disconnect,
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
