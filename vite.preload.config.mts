import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
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
