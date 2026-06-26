import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: [
        "**/vite.config.*",
        "**/vitest.config.*",
        "**/.env",
        "**/.env.*",
      ],
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/cytoscape")) {
            return "cytoscape";
          }
          if (id.includes("node_modules/mermaid")) {
            return "mermaid";
          }
          if (id.includes("node_modules/dagre")) {
            return "dagre";
          }
          if (id.includes("node_modules/katex")) {
            return "katex";
          }
          if (id.includes("node_modules/framer-motion") || id.includes("node_modules/motion-")) {
            return "motion";
          }
          if (id.includes("node_modules/@radix-ui")) {
            return "radix";
          }
        },
      },
    },
  },
}));
