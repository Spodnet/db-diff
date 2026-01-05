import { createContext, useContext, useState } from "react";
import type { Connection } from "../lib/types";

export type ViewType = "diff" | "table";

export interface Tab {
	id: string;
	type: ViewType;
	label: string;
	data?: {
		connection: Connection;
		tableName: string;
	};
}

interface ViewContextType {
	tabs: Tab[];
	activeTabId: string;
	activeTab: Tab;
	openTableTab: (connection: Connection, tableName: string) => void;
	closeTab: (tabId: string) => void;
	activateTab: (tabId: string) => void;
}

const ViewContext = createContext<ViewContextType | null>(null);

const DIFF_TAB: Tab = {
	id: "diff",
	type: "diff",
	label: "Compare",
};

export function ViewProvider({ children }: { children: React.ReactNode }) {
	const [tabs, setTabs] = useState<Tab[]>([DIFF_TAB]);
	const [activeTabId, setActiveTabId] = useState<string>(DIFF_TAB.id);

	const activeTab = tabs.find((t) => t.id === activeTabId) || DIFF_TAB;

	const activateTab = (tabId: string) => {
		setActiveTabId(tabId);
	};

	const openTableTab = (connection: Connection, tableName: string) => {
		const tabId = `${connection.id}-${tableName}`;

		// Check if tab already exists
		const existingTab = tabs.find((t) => t.id === tabId);
		if (existingTab) {
			setActiveTabId(tabId);
			return;
		}

		// Create new tab
		const newTab: Tab = {
			id: tabId,
			type: "table",
			label: tableName,
			data: {
				connection,
				tableName,
			},
		};

		setTabs((prev) => [...prev, newTab]);
		setActiveTabId(tabId);
	};

	const closeTab = (tabId: string) => {
		if (tabId === "diff") return; // Cannot close diff tab

		setTabs((prev) => {
			const newTabs = prev.filter((t) => t.id !== tabId);

			// If closing active tab, switch to the last available tab (or diff)
			if (activeTabId === tabId) {
				const lastTab = newTabs[newTabs.length - 1];
				setActiveTabId(lastTab ? lastTab.id : "diff");
			}

			return newTabs;
		});
	};

	return (
		<ViewContext.Provider
			value={{
				tabs,
				activeTabId,
				activeTab,
				openTableTab,
				closeTab,
				activateTab,
			}}
		>
			{children}
		</ViewContext.Provider>
	);
}

export function useView() {
	const context = useContext(ViewContext);
	if (!context) {
		throw new Error("useView must be used within a ViewProvider");
	}
	return context;
}
