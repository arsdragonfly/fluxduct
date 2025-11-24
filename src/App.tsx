import React, { type LC, type PropsWithChildren, hot, useResource, useState } from "@use-gpu/live";
import { makeFallback } from "./Fallback";
import { HTML } from "@use-gpu/react";
import { AutoCanvas, WebGPU } from "@use-gpu/webgpu";
import { PanControls } from "@use-gpu/interact";
import {
  DebugProvider,
  FontLoader,
  FlatCamera,
  Pass,
} from "@use-gpu/workbench";
import { UI, Layout, Flex, Inline, Text } from "@use-gpu/layout";

import { UseInspect } from "@use-gpu/inspect";
import { inspectGPU } from "@use-gpu/inspect-gpu";
import '@use-gpu/inspect/theme.css';

export const App: LC = hot(() => {
  const root = document.querySelector("#use-gpu")!;
  const inner = document.querySelector("#use-gpu .canvas")!;
  const [greeting, setGreeting] = useState<string>("…");

  useResource(() => {
    window.fluxduct?.init((event, payload) => {
      console.log("Received event:", event, payload);
      if (event === 'debug_message' && 'message' in payload) {
         setGreeting(payload.message);
      }
    });
    const x = window.fluxduct?.hello("Use.GPU");
    if (x) setGreeting(`${x}`);
  })
  return (
    <UseInspect container={root} provider={DebugProvider} extensions={[inspectGPU]}>
      <WebGPU
        fallback={(error: Error) => (
          <HTML container={inner}>{makeFallback(error)}</HTML>
        )}
      >
        <AutoCanvas selector="#use-gpu .canvas" samples={4}>
          <FontLoader>
            <Camera>
              <Pass>
                <UI>
                  <Layout>
                    <Flex width="100%" height="100%" align="center">
                      <Flex
                        width={500}
                        height={150}
                        fill="#3090ff"
                        align="center"
                        direction="y"
                      >
                        <Inline align="center">
                          <Text
                            weight="black"
                            size={48}
                            lineHeight={64}
                            color="#ffffff"
                          >
                            -~ Use.GPU ~-
                          </Text>
                        </Inline>
                        <Inline align="center">
                          <Text
                            weight="black"
                            size={16}
                            lineHeight={64}
                            color="#ffffff"
                            opacity={0.5}
                          >
                            {greeting}
                          </Text>
                        </Inline>
                      </Flex>
                    </Flex>
                  </Layout>
                </UI>
              </Pass>
            </Camera>
          </FontLoader>
        </AutoCanvas>
      </WebGPU>
    </UseInspect>
  );
}, import.meta);

// Wrap this in its own component to avoid JSX trashing of the view
type CameraProps = PropsWithChildren<object>;
const Camera: LC<CameraProps> = (props: CameraProps) => (
  /* 2D pan controls + flat view */
  <PanControls>
    {(x, y, zoom) => (
      <FlatCamera x={x} y={y} zoom={zoom}>
        {props.children}
      </FlatCamera>
    )}
  </PanControls>
);