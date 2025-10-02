import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    root: path.resolve(process.cwd(), "src/renderer"),
    base: "./",
    define: {
      "process.env": JSON.stringify(env),
    },
    build: {
      outDir: path.resolve(process.cwd(), "dist/renderer"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(process.cwd(), "src/renderer/main_app/index.html"),
          recorder: path.resolve(process.cwd(), "src/renderer/recorder/index.html"),
          trackingScript: path.resolve(process.cwd(), "src/browser/tracker/trackingScript.js"),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "trackingScript") {
              return "browser/tracker/trackingScript.js";
            }
            return 'assets/[name]-[hash].js';
          }
        }
      },
    },
    server: {
      port: 5173,
    },
  }
});


