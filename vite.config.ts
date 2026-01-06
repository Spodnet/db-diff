import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const port = env.PORT || 3001;
	const uiPort = Number(env.UI_PORT) || 5173;

	return {
		plugins: [react(), tailwindcss()],
		server: {
			port: uiPort,
			proxy: {
				"/api": {
					target: `http://localhost:${port}`,
					changeOrigin: true,
				},
			},
		},
	};
});
