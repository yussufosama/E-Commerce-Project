import { defineConfig } from "vite";
export default defineConfig({
  build: { outDir: "../backend/frontend-dist", emptyOutDir: true },
  server: { proxy: { "/api": "http://127.0.0.1:5000" } },
});
