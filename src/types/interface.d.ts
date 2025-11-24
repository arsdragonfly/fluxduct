import type { MessagePayload, NodePayload, LinkPayload, PortPayload, IdPayload } from "fluxduct-rs";

export interface IFluxductAPI {
  hello(name: string): Promise<string>;
  init(): Promise<void>;
  onEvent(callback: (event: string, payload: MessagePayload | NodePayload | LinkPayload | PortPayload | IdPayload) => void): void;
}

declare global {
  interface Window {
    fluxduct: IFluxductAPI
  }
}