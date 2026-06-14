// Live-first app - WebGPU owns the root and fallback DOM is managed from Live
import React, { type LC, type PropsWithChildren, useMemo, useResource } from "@use-gpu/live";
import { AutoCanvas, WebGPU } from "@use-gpu/webgpu";
import { PanControls } from "@use-gpu/interact";
import {
  FontLoader,
  FlatCamera,
  Pass,
} from "@use-gpu/workbench";
import { UI, Layout, Flex, Inline, Text } from "@use-gpu/layout";

import { useGetPipewireStateQuery } from "./store";

export const LiveApp: LC = () => {
  const { data, isLoading, error } = useGetPipewireStateQuery();
  const root = document.querySelector("#use-gpu")!;

  const activeNodes = useMemo(
    () => data.nodes.filter((node) => node.exists),
    [data.nodes]
  );
  const activePorts = useMemo(
    () => data.ports.filter((port) => port.exists),
    [data.ports]
  );
  const activeLinks = useMemo(
    () => data.links.filter((link) => link.exists),
    [data.links]
  );

  const statusText = isLoading
    ? "Connecting to PipeWire..."
    : error
      ? `Error: ${String(error)}`
      : `Nodes: ${activeNodes.length} | Ports: ${activePorts.length} | Links: ${activeLinks.length}`;

  return (
    <>
      <FixedChrome
        container={root}
        statusText={statusText}
      />
      <WebGPU
        fallback={(error: Error) => (
          <WebGPUFallback container={root} error={error} />
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
                        height={160}
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
                      </Flex>
                    </Flex>
                  </Layout>
                </UI>
              </Pass>
            </Camera>
          </FontLoader>
        </AutoCanvas>
      </WebGPU>
    </>
  );
};

interface FixedChromeProps {
  container: Element;
  statusText: string;
}

const FixedChrome: LC<FixedChromeProps> = ({ container, statusText }) => {
  const chrome = useResource((dispose) => {
    const wrapper = document.createElement("div");
    const panel = document.createElement("aside");
    const title = document.createElement("strong");
    const status = document.createElement("div");
    const tooltip = document.createElement("div");

    wrapper.className = "fluxduct-chrome";
    panel.className = "fluxduct-panel";
    status.className = "fluxduct-status";
    tooltip.className = "fluxduct-tooltip";
    title.textContent = "Fluxduct";
    tooltip.hidden = true;

    panel.append(title, status);
    wrapper.append(panel, tooltip);
    container.appendChild(wrapper);

    const handlePointerMove = (event: Event) => {
      const pointer = event as PointerEvent;
      tooltip.hidden = false;
      tooltip.style.transform = `translate(${pointer.clientX + 16}px, ${pointer.clientY + 16}px)`;
      tooltip.textContent = `x ${Math.round(pointer.clientX)} / y ${Math.round(pointer.clientY)}`;
    };
    const handlePointerLeave = () => {
      tooltip.hidden = true;
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);
    dispose(() => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeChild(wrapper);
    });

    return { status };
  }, [container]);

  useResource(() => {
    chrome.status.textContent = statusText;
  }, [chrome, statusText]);

  return null;
};

interface WebGPUFallbackProps {
  container: Element;
  error: Error;
}

const WebGPUFallback: LC<WebGPUFallbackProps> = ({ container, error }) => {
  const message = error.toString();

  useResource((dispose) => {
    const div = document.createElement("div");
    div.className = "error-message";
    div.textContent = message;
    container.appendChild(div);

    dispose(() => {
      container.removeChild(div);
    });
  }, [container, message]);

  return null;
};

// Wrap this in its own component to avoid JSX trashing of the view
type CameraProps = PropsWithChildren<object>;
const Camera: LC<CameraProps> = (props: CameraProps) => (
  /* 2D pan controls + flat view */
  <PanControls>
    {(x: number, y: number, zoom: number) => (
      <FlatCamera x={x} y={y} zoom={zoom}>
        {props.children}
      </FlatCamera>
    )}
  </PanControls>
);
