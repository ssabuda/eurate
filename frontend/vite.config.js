import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In Docker the API runs in the `web` service; locally on port 8000.
// `changeOrigin` sends the target's host (`web` / `localhost`) instead of the
// browser's, which may be any IP since the dev server listens on the network;
// Django's ALLOWED_HOSTS lists those hosts.
const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
});
