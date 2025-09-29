import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import eslint from "@nabla/vite-plugin-eslint";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import wgslRollup from "@use-gpu/wgsl-loader/rollup";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    eslint(),
    checker({
      typescript: true,
    }),
    wgslRollup(),
  ],
  optimizeDeps: {
    exclude: ["fluxduct-rs"],
  },
  build: {
    rollupOptions: {
      external: ["fluxduct-rs"],
    },
    commonjsOptions: {
      include: [/fluxduct-rs/, /node_modules/],
    },
  },
});
