declare global {
  interface Window {
    fluxduct: typeof import("fluxduct-rs");
  }
}
export {}