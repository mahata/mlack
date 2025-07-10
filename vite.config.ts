import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Entry point for client-side code
  build: {
    outDir: "dist/static",
    lib: {
      entry: path.resolve(__dirname, "hono/components/ChatPage.client.ts"),
      name: "ChatPageClient",
      fileName: "chat-page-client",
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        entryFileNames: "chat-page-client.js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    target: "esnext",
    minify: process.env.NODE_ENV === "production", // Minify only in production
    sourcemap: true, // Enable source maps for debugging
  },
  // Development server for HMR
  server: {
    port: 5173,
    open: false,
  },
});
