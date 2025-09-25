import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(process.cwd(), "src/renderer"),
  base: "./",
  build: {
    outDir: path.resolve(process.cwd(), "dist/renderer"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main_app: path.resolve(process.cwd(), "src/renderer/main_app/index.html"),
        recorder: path.resolve(process.cwd(), "src/renderer/recorder/index.html"),
      }
    },
  },
  server: {
    port: 5173,
  },
});


