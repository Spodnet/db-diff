import { DiffWorkspace } from "./components/diff/DiffWorkspace";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { ConnectionProvider } from "./hooks/useConnections";
import { DiffProvider } from "./hooks/useDiff";

export function App() {
	return (
		<ConnectionProvider>
			<DiffProvider>
				<div className="flex flex-col min-h-screen bg-background">
					<Header />
					<div className="flex flex-1 overflow-hidden">
						<Sidebar />
						<main className="flex-1 overflow-auto">
							<DiffWorkspace />
						</main>
					</div>
					<StatusBar />
				</div>
			</DiffProvider>
		</ConnectionProvider>
	);
}
