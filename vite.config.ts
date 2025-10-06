// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const rootPath = process.cwd();
  console.log('--- Vite Config Debug ---');
  console.log('CWD:', rootPath);
  console.log('Mode:', mode);

  // Load all .env variables (no prefix restriction here for diagnostic)
  const allEnv = loadEnv(mode, rootPath, '');
  console.log('All .env variables found (no prefix):', JSON.stringify(allEnv, null, 2)); // Use JSON.stringify for clear output

  // Load VITE_ prefixed variables
  const viteEnv = loadEnv(mode, rootPath, "VITE_");
  console.log('VITE_ prefixed variables found:', JSON.stringify(viteEnv, null, 2)); // Use JSON.stringify for clear output

  const defineValue = JSON.stringify({
      BASE_URL: './',
      MODE: mode,
      DEV: mode !== 'production',
      PROD: mode === 'production',
      SSR: false,
      ...viteEnv,
  });

  console.log('Final import.meta.env definition content (raw string):', defineValue);
  // Optional: Try parsing it back to see the object structure
  try {
    console.log('Parsed define value object:', JSON.parse(defineValue));
  } catch (e) {
    console.error('Error parsing defineValue:', e);
  }
  console.log('--- End Vite Config Debug ---');
  console.log(path.resolve(rootPath, "src/renderer"));


  return {
    plugins: [react()],
    root: path.resolve(rootPath, "src/renderer"),
    // root: "./src",
    base: "./",
    envDir: rootPath,
    define: {
      'import.meta.env': defineValue, // Assign the stringified value
    },
    build: {
      outDir: path.resolve(rootPath, "dist/renderer"),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(rootPath, "src/renderer/main_app/index.html"),
          recorder: path.resolve(rootPath, "src/renderer/recorder/index.html"),
          trackingScript: path.resolve(rootPath, "src/browser/tracker/trackingScript.js"),
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
  };
});