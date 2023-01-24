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

import { useEffect, useMemo, useReducer, useState } from "react";
import "./App.css";
import { emit, listen } from "@tauri-apps/api/event";
import { MessagePayload } from "../src-tauri/bindings/MessagePayload";
import { NodePayload } from "../src-tauri/bindings/NodePayload";
import { LinkPayload } from "../src-tauri/bindings/LinkPayload";
import { PortPayload } from "../src-tauri/bindings/PortPayload";
import util from "util";
import { ForceGraph2D } from "react-force-graph";
import { PipewireState, useGetPipewireStateQuery } from "./pipewireApi";
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
  portDerivedCanvasLinks: LinkObject[];
  linkDerivedCanvasLinks: LinkObject[];
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
      (port: PortPayload) => {
        if (port.direction === "in") {
          return {
            source: port.id,
            target: port.node_id,
          };
        } else {
          return {
            source: port.node_id,
            target: port.id,
          };
        }
      }
    ),
    linkDerivedCanvasLinks: syncArray(
      state.linkDerivedCanvasLinks,
      action.payload.links,
      (link: LinkPayload) => {
        return {
          source: link.output_port_id,
          target: link.input_port_id,
        };
      }
    ),
  };
}

function App() {
  const { data, error, isLoading } = useGetPipewireStateQuery();
  // we need to make our own copy of the data because
  // 1. We need to keep some references stable to eliminate unwanted d3.js re-renders of the canvas
  // 2. the query hook returns inextensible objects that are unuseable for the graph
  const [pipewireRenderState, dispatch] = useReducer(
    pipewireRenderStateReducer,
    initialPipewireRenderState
  );
  useEffect(() => {
    // a memoizing deep copy of data
    if (!isLoading && !error && data) {
      dispatch({
        type: "Sync",
        payload: data,
      });
    }
  }, [data, error, isLoading]);
  return (
    <div className="App">
      {isLoading || error ? (
        <p>Loading...</p>
      ) : (
        <ForceGraph2D
          graphData={{
            nodes: [...pipewireRenderState.nodes, ...pipewireRenderState.ports],
            links: [...pipewireRenderState.portDerivedCanvasLinks, ...pipewireRenderState.linkDerivedCanvasLinks],
          }}
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
