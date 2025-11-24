import { MessagePayload, NodePayload, LinkPayload, PortPayload, IdPayload } from "./typeshare";

export * from "./typeshare";

export function init(callback: (event: string, payload: MessagePayload | NodePayload | LinkPayload | PortPayload | IdPayload) => void): void;
export function hello(name: string): string;

