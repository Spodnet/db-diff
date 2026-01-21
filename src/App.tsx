import { ErrorBoundary } from "./components/ErrorBoundary";
import { DiffWorkspace } from "./components/diff/DiffWorkspace";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { TabBar } from "./components/layout/TabBar";
import { TableDataWorkspace } from "./components/table/TableDataWorkspace";
import { ConnectionProvider } from "./hooks/useConnections";
import { useView, ViewProvider } from "./hooks/useView";

function MainLayout() {
    const { tabs, activeTabId } = useView();

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <TabBar />
                    <div className="flex-1 overflow-auto relative">
                        {tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`absolute inset-0 bg-background ${
                                    tab.id === activeTabId
                                        ? "z-10"
                                        : "z-0 invisible"
                                }`}
                            >
                                <ErrorBoundary>
                                    {tab.type === "diff" && (
                                        <DiffWorkspace initialData={tab.data} />
                                    )}
                                    {tab.type === "table" && tab.data && (
                                        <TableDataWorkspace
                                            connection={
                                                tab.data.connection ||
                                                (tab.data as any).connection
                                            }
                                            tableName={
                                                tab.data.tableName ||
                                                (tab.data as any).tableName
                                            }
                                        />
                                    )}
                                </ErrorBoundary>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
            <StatusBar />
        </div>
    );
}

export function App() {
    return (
        <ConnectionProvider>
            <ViewProvider>
                <MainLayout />
            </ViewProvider>
        </ConnectionProvider>
    );
}
