/**
 * Copyright (c) 2022 The fluxduct Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * SPDX-License-Identifier: MIT
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import "./App.css";
import { emit, listen } from "@tauri-apps/api/event";
import { MessagePayload } from "../src-tauri/bindings/MessagePayload";
import { NodePayload } from "../src-tauri/bindings/NodePayload";
import { LinkPayload } from "../src-tauri/bindings/LinkPayload";
import { PortPayload } from "../src-tauri/bindings/PortPayload";
import { ForceGraph2D } from "react-force-graph";
import {
  PipewireState,
  useGetPipewireStateQuery,
  Port,
  Node,
  Link,
  Removable
} from "./pipewireApi";
import { prototype } from "stream";

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type NodeObject = ArrayElement<
  NonNullable<React.ComponentProps<typeof ForceGraph2D>["graphData"]>["nodes"]
>;
type LinkObject = ArrayElement<
  NonNullable<React.ComponentProps<typeof ForceGraph2D>["graphData"]>["links"]
>;

type PipewireRenderState = PipewireState & {
  portDerivedCanvasLinks: (LinkObject & Removable)[];
  linkDerivedCanvasLinks: (LinkObject & Removable)[];
};

const initialPipewireRenderState: PipewireRenderState = {
  nodes: [],
  ports: [],
  links: [],
  debugMessages: [],
  // every port has a canvas link to its parent node
  portDerivedCanvasLinks: [],
  // every pipewire link corresponds to a canvas link
  linkDerivedCanvasLinks: [],
};

type PipewireRenderStateAction = {
  type: "Sync";
  payload: PipewireState;
};

const syncArray = <T extends {} & unknown, U extends {} & unknown>(
  target: T[],
  source: U[],
  f: (s: U) => T
): T[] => {
  for (let i = 0; i < source.length; i++) {
    if (i < target.length) {
      Object.assign(target[i], f(source[i]));
    } else {
      target.push(structuredClone(f(source[i])));
    }
  }
  return [...target];
};

function pipewireRenderStateReducer(
  state: PipewireRenderState,
  action: PipewireRenderStateAction
): PipewireRenderState {
  return {
    nodes: syncArray(state.nodes, action.payload.nodes, (x) => x),
    ports: syncArray(state.ports, action.payload.ports, (x) => x),
    links: syncArray(state.links, action.payload.links, (x) => x),
    debugMessages: [],
    portDerivedCanvasLinks: syncArray(
      state.portDerivedCanvasLinks,
      action.payload.ports,
      (port: Port) => {
        if (port.direction === "in") {
          return {
            source: port.serial,
            target: port.node_serial,
            exists: port.exists,
          };
        } else {
          return {
            source: port.node_serial,
            target: port.serial,
            exists: port.exists,
          };
        }
      }
    ),
    linkDerivedCanvasLinks: syncArray(
      state.linkDerivedCanvasLinks,
      action.payload.links,
      (link: Link) => {
        return {
          source: link.output_port_serial,
          target: link.input_port_serial,
          exists: link.exists,
        };
      }
    ),
  };
}

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowDimensions;
}

function App() {
  const { data, error, isLoading } = useGetPipewireStateQuery();
  const { height, width } = useWindowDimensions();
  // we need to make our own copy of the data because
  // 1. We need to keep some references stable to eliminate unwanted d3.js re-renders of the canvas
  // 2. the query hook returns inextensible objects that are unuseable for the graph
  const [pipewireRenderState, dispatch] = useReducer(
    pipewireRenderStateReducer,
    initialPipewireRenderState
  );
  const fgRef = useRef();
  const [fgRefIsSet, setFgRefIsSet] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fgRefIsSet && fgRef.current) {
      setFgRefIsSet(true);
    }
  })
  useEffect(() => {
    if (fgRefIsSet) {
      let ref = fgRef as React.ComponentPropsWithRef<typeof ForceGraph2D>["ref"];
      // disable charge force calculation for nodes that don't exist
      ref?.current?.d3Force("charge")?.strength((node: Node) => {
        return node.exists ? -30 : 0;
      });
      // disable link force calculation for links that don't exist
      let oldLinkStrengthFunc = ref?.current?.d3Force("link")?.strength();
      ref?.current?.d3Force("link")?.strength((link: Link) => {
        return link.exists ? oldLinkStrengthFunc(link) : 0;
      })
    }
  }, [fgRefIsSet])
  useEffect(() => {
    // a memoizing deep copy of data
    if (!isLoading && !error && data) {
      dispatch({
        type: "Sync",
        payload: data,
      });
    }
  }, [data, error, isLoading]);
  const nodes = useMemo(() => {
    return [
      ...pipewireRenderState.nodes,
      ...pipewireRenderState.ports,
    ];
  }, [pipewireRenderState.nodes, pipewireRenderState.ports]);
  const links = useMemo(() => {
    return [
      ...pipewireRenderState.portDerivedCanvasLinks,
      ...pipewireRenderState.linkDerivedCanvasLinks
    ];
  }, [pipewireRenderState.portDerivedCanvasLinks, pipewireRenderState.linkDerivedCanvasLinks]);
  return (
    <div className="App">
      {isLoading || error ? (
        <p>Loading...</p>
      ) : (
        <ForceGraph2D
          ref={fgRef}
          height={height}
          width={width}
          graphData={{
            nodes,
            links,
          }}
          nodeVisibility="exists"
          linkVisibility="exists"
          nodeId="serial"
          nodeAutoColorBy="type"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = `${(node as any).serial}`;
            const fontSize = 8 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions: [number, number] = [
              textWidth + fontSize * 0.2,
              fontSize + fontSize * 0.2,
            ]; // some padding

            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(
              (node as any).x - bckgDimensions[0] / 2,
              (node as any).y - bckgDimensions[1] / 2,
              ...bckgDimensions
            );
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = (node as any).color;
            ctx.fillText(label, (node as any).x, (node as any).y);
            (node as any).__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.fillStyle = color;
            const bckgDimensions = (node as any).__bckgDimensions as [
              number,
              number
            ];
            if (!bckgDimensions) return;
            ctx.fillRect(
              (node as any).x - bckgDimensions[0] / 2,
              (node as any).y - bckgDimensions[1] / 2,
              ...bckgDimensions
            );
          }}
          linkDirectionalParticles={4}
        />
      )}
      {/* {isLoading || error ? (
        <p>Loading...</p>
      ) : (
        [...pipewireState.nodes, ...pipewireState.ports].map((node) => (
          <p>{node.id}</p>
        ))
      )} */}
    </div>
  );
}

export default App;
