import { createContext, useContext, useState } from "react";
import type { Connection, TableInfo } from "../lib/types";

export type ViewType = "diff" | "table";

export interface Tab {
    id: string;
    type: ViewType;
    label: string;
    data?: {
        // Shared
        connection?: Connection;
        // Table View
        tableName?: string;
        // Diff View
        sourceConnection?: Connection;
        targetConnection?: Connection;
        sourceTable?: TableInfo;
        targetTable?: TableInfo;
    };
}

interface ViewContextType {
    tabs: Tab[];
    activeTabId: string;
    activeTab: Tab;
    openTableTab: (connection: Connection, tableName: string) => void;
    openDiffTab: (
        sourceConnection: Connection,
        targetConnection: Connection,
        sourceTable: TableInfo,
        targetTable: TableInfo,
    ) => void;
    closeTab: (tabId: string) => void;
    activateTab: (tabId: string) => void;
    updateTab: (tabId: string, updates: Partial<Tab>) => void;
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

    const openDiffTab = (
        sourceConnection: Connection,
        targetConnection: Connection,
        sourceTable: TableInfo,
        targetTable: TableInfo,
    ) => {
        const tabId = `diff-${sourceConnection.id}-${sourceTable.name}-${targetConnection.id}-${targetTable.name}`;

        const existingTab = tabs.find((t) => t.id === tabId);
        if (existingTab) {
            setActiveTabId(tabId);
            return;
        }

        const newTab: Tab = {
            id: tabId,
            type: "diff",
            label: `${sourceTable.name}`, // Label as table name
            data: {
                sourceConnection,
                targetConnection,
                sourceTable,
                targetTable,
            },
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(tabId);
    };

    const updateTab = (tabId: string, updates: Partial<Tab>) => {
        setTabs((prev) =>
            prev.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
        );
        // If ID changed and it was active, update activeTabId?
        if (updates.id && activeTabId === tabId) {
            setActiveTabId(updates.id);
        }
    };

    const closeTab = (tabId: string) => {
        const tab = tabs.find((t) => t.id === tabId);
        if (!tab) return;

        if (tab.type === "diff") {
            const diffCount = tabs.filter((t) => t.type === "diff").length;
            if (diffCount <= 1) return; // Must keep at least one diff tab
        }

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
                openDiffTab,
                closeTab,
                activateTab,
                updateTab,
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
