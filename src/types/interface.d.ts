import type { EventWrapper } from "fluxduct-rs";

declare global {
  interface Window {
    fluxduct: {
      hello(name: string): string;
      init(callback: (event: EventWrapper) => void): void;
    }
  }
}