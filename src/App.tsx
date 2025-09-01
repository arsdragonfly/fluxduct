import React, { type LC, type PropsWithChildren, hot } from '@use-gpu/live';
import { makeFallback } from './Fallback';
import { HTML } from '@use-gpu/react';

export const App: LC = hot(() => {
    const inner = document.querySelector('#use-gpu .canvas')!;
    return (
        <HTML container={inner}>
            {makeFallback(new Error('WebGPU is not supported on this device.'))}
        </HTML>
    )
}, module);