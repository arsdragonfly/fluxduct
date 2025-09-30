import { IdPayload } from "./typeshare";

export * from "./typeshare";

export interface FluxductBindings {
  hello(name: string): string;
  helloId(id: number): IdPayload;
}

export type FluxductAsyncBindings = {
  [K in keyof FluxductBindings]: FluxductBindings[K] extends (
    ...args: infer P
  ) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : FluxductBindings[K];
};

declare const fluxduct: FluxductBindings;
export default fluxduct;
export declare const hello: typeof fluxduct.hello;
export declare const helloId: typeof fluxduct.helloId;
