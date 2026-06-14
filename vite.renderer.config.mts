import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import eslint from "@nabla/vite-plugin-eslint";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import wgslRollup from "@use-gpu/wgsl-loader/rollup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fluxductRoot = __dirname;
const useGpuRoot = path.resolve(__dirname, "use.gpu");

const useGpuPackages = [
  "core",
  "glyph",
  "glsl-loader",
  "gltf",
  "inspect",
  "inspect-gpu",
  "interact",
  "layout",
  "live",
  "map",
  "parse",
  "plot",
  "present",
  "react",
  "scene",
  "shader",
  "state",
  "traits",
  "voxel",
  "webgpu",
  "wgsl",
  "wgsl-loader",
  "workbench",
];

const useGpuPackageAliases = useGpuPackages.map((name) => ({
  find: `@use-gpu/${name}`,
  replacement: path.join(useGpuRoot, `packages/${name}/src/index.ts`),
}));

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react({ jsxRuntime: "classic" }),
    eslint(),
    checker({
      typescript: true,
    }),
    wgslRollup(),
  ],
  resolve: {
    alias: [
      {
        find: /^@use-gpu\/wgsl\/(.+\.wgsl)$/,
        replacement: path.join(useGpuRoot, "packages/wgsl/src/$1.ts"),
      },
      {
        find: /^@use-gpu\/(glsl-loader|wgsl-loader)\/(esbuild|rollup|webpack)$/,
        replacement: path.join(useGpuRoot, "packages/$1/src/$2.ts"),
      },
      {
        find: /^@use-gpu\/(shader)\/(glsl|wgsl)$/,
        replacement: path.join(useGpuRoot, "packages/$1/src/$2/index.ts"),
      },
      {
        find: /^@use-gpu\/(state|traits)\/(live|react)$/,
        replacement: path.join(useGpuRoot, "packages/$1/src/index-$2.ts"),
      },
      {
        find: "@use-gpu/glyph/sdf",
        replacement: path.join(useGpuRoot, "packages/glyph/src/sdf.ts"),
      },
      ...useGpuPackageAliases,
    ],
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["fluxduct-rs"],
    exclude: useGpuPackages.map((name) => `@use-gpu/${name}`),
  },
  server: {
    fs: {
      allow: [fluxductRoot, useGpuRoot],
    },
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
