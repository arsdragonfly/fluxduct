export interface FluxductBindings {
  hello(name: string): string;
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
