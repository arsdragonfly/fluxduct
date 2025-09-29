import type { FluxductAsyncBindings } from "fluxduct-rs";

declare global {
  interface Window {
    fluxduct: FluxductAsyncBindings
  }
}