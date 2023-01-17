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

import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { emit, listen } from '@tauri-apps/api/event';
import { MessagePayload } from '../src-tauri/bindings/MessagePayload';
import { NodePayload } from '../src-tauri/bindings/NodePayload';
import { LinkPayload } from '../src-tauri/bindings/LinkPayload';
import { PortPayload } from '../src-tauri/bindings/PortPayload';
import util from 'util';
import { ForceGraph2D } from 'react-force-graph';
import { PipewireState, useGetPipewireStateQuery } from './pipewireApi';

function App() {
  const { data, error, isLoading } = useGetPipewireStateQuery();
  const nodes = useMemo(() => data ? getGraphNodesFromPipewireState(data) : [], [data]);
  const links = useMemo(() => data ? getGraphLinksFromPipewireState(data) : [], [data]);
  return (
    <div className="App">
      {(isLoading || error) ? <p>Loading...</p> : (data?.debugMessages.map(message => <p>{message}</p>))}
      <ForceGraph2D graphData={({
        nodes,
        links
      })} />
    </div>
  );
}

type ArrayElement<ArrayType extends readonly unknown[]> = 
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

type NodeObject = ArrayElement<NonNullable<React.ComponentProps<typeof ForceGraph2D>['graphData']>['nodes']>;
type LinkObject = ArrayElement<NonNullable<React.ComponentProps<typeof ForceGraph2D>['graphData']>['links']>;

function getGraphNodesFromPipewireState(state: PipewireState): NodeObject[] {
  // every pipewire node and pipewire port corresponds to a graph node
  const nodes = state.nodes.map(node => ({
    id: `node-${node.id}`,
    name: node.name,
  }));
  const ports = state.ports.map(port => ({
    id: `port-${port.id}`,
    name: port.name,
  }));
  return [...nodes, ...ports];
}

function getGraphLinksFromPipewireState(state: PipewireState): LinkObject[] {
  // every port has a link to its node
  const portsToNodes = state.ports.filter(port => port.direction === "in")
  .map(port => ({
    source: `port-${port.id}`,
    target: `node-${port.node_id}`,
  }))
  const nodesToPorts = state.ports.filter(port => port.direction === "out")
  .map(port => ({
    source: `node-${port.node_id}`,
    target: `port-${port.id}`,
  }))
  // every pipewire link corresponds to a graph link
  const links = state.links.map(link => ({
    source: `port-${link.output_port_id}`,
    target: `port-${link.input_port_id}`,
  }));
  return [...portsToNodes, ...nodesToPorts, ...links];
}

export default App;
