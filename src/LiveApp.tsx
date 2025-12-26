// Live components only - WebGPU rendering, receives data as props from React
import React, { type LC, type PropsWithChildren } from "@use-gpu/live";
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

import type { PipewireState } from "./store/pipewireApi";

export interface LiveAppProps {
  pipewireState: PipewireState | undefined;
  isLoading: boolean;
  statusText: string;
}

export const LiveApp: LC<LiveAppProps> = (props: LiveAppProps) => {
  const { statusText } = props;
  const root = document.querySelector("#use-gpu")!;
  const inner = document.querySelector("#use-gpu .canvas")!;

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
              <Pass picking={false}>
                <UI>
                  <Layout>
                    <Flex width="100%" height="100%" align="center">
                      <Flex
                        width={600}
                        height={200}
                        fill="#1a1a2e"
                        align="center"
                        direction="y"
                      >
                        <Inline align="center">
                          <Text
                            weight="black"
                            size={48}
                            lineHeight={64}
                            color="#e94560"
                          >
                            Fluxduct
                          </Text>
                        </Inline>
                        <Inline align="center">
                          <Text
                            weight="bold"
                            size={18}
                            lineHeight={32}
                            color="#0f3460"
                          >
                            PipeWire Patchbay
                          </Text>
                        </Inline>
                        <Inline align="center">
                          <Text
                            size={14}
                            lineHeight={24}
                            color="#16213e"
                            opacity={0.8}
                          >
                            {statusText}
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
};

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
