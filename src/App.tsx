import { DiffWorkspace } from "./components/diff/DiffWorkspace";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { TabBar } from "./components/layout/TabBar";
import { TableDataWorkspace } from "./components/table/TableDataWorkspace";
import { ConnectionProvider } from "./hooks/useConnections";
import { DiffProvider } from "./hooks/useDiff";
import { useView, ViewProvider } from "./hooks/useView";

function MainLayout() {
    const { activeTab } = useView();

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <TabBar />
                    <div className="flex-1 overflow-auto">
                        {activeTab.type === "diff" && <DiffWorkspace />}
                        {activeTab.type === "table" && activeTab.data && (
                            <TableDataWorkspace
                                connection={activeTab.data.connection}
                                tableName={activeTab.data.tableName}
                            />
                        )}
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
                <DiffProvider>
                    <MainLayout />
                </DiffProvider>
            </ViewProvider>
        </ConnectionProvider>
    );
}
