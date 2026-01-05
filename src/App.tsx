import { DiffWorkspace } from "./components/diff/DiffWorkspace";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";

export function App() {
	return (
		<div className="flex flex-col min-h-screen bg-(--color-background)">
			<Header />
			<div className="flex flex-1 overflow-hidden">
				<Sidebar />
				<main className="flex-1 overflow-auto">
					<DiffWorkspace />
				</main>
			</div>
			<StatusBar />
		</div>
	);
}
