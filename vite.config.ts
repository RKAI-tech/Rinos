import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const rootPath = process.cwd();

  const viteEnv = loadEnv(mode, rootPath, "VITE_");

  const defineValue = JSON.stringify({
    BASE_URL: './',
    MODE: mode,
    DEV: mode !== 'production',
    PROD: mode === 'production',
    SSR: false,
    ...viteEnv,
  });

  return {
    plugins: [react()],
    root: path.resolve(rootPath, "src/renderer"),
    base: "./",
    envDir: rootPath,
    
    // SỬA LỖI 1: Thêm optimizeDeps để esbuild không quét vào các file .node khi chạy dev
    optimizeDeps: {
      exclude: ['ssh2', 'cpu-features']
    },

    define: {
      'import.meta.env': defineValue,
    },
    
    build: {
      outDir: path.resolve(rootPath, "dist/renderer"),
      emptyOutDir: true,
      
      // SỬA LỖI 2: Đưa external ra đúng cấp của rollupOptions
      rollupOptions: {
        // Khai báo các thư viện native ở đây để Rollup không bundle chúng vào file JS
        external: ['ssh2', 'cpu-features', 'node:path', 'node:fs', 'node:os'], 
        
        input: {
          main: path.resolve(rootPath, "src/renderer/main_app/index.html"),
          recorder: path.resolve(rootPath, "src/renderer/recorder/index.html"),
          trackingScript: path.resolve(rootPath, "src/browser/tracker/trackingScript.js"),
        },
        output: {
          // Đảm bảo định dạng đầu ra là CommonJS nếu bạn dùng native modules trong Electron
          format: 'cjs', 
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "trackingScript") {
              return "browser/tracker/trackingScript.js";
            }
            return 'assets/[name]-[hash].js';
          }
        },
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    server: {
      port: 5173,
    },
  };
});