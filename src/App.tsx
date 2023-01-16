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

import { useEffect, useState } from 'react';
import './App.css';
import { emit, listen } from '@tauri-apps/api/event';
import { MessagePayload } from '../src-tauri/bindings/MessagePayload';
import { NodePayload } from '../src-tauri/bindings/NodePayload';
import { LinkPayload } from '../src-tauri/bindings/LinkPayload';
import { PortPayload } from '../src-tauri/bindings/PortPayload';
import util from 'util';
import { ForceGraph2D } from 'react-force-graph';
import { useGetPipewireStateQuery } from './pipewireApi';

function App() {
  const { data, error, isLoading } = useGetPipewireStateQuery();
  return (
    <div className="App">
      {(isLoading || error) ? <p>Loading...</p> : <p>{util.inspect(data)}</p>}
      <ForceGraph2D graphData={({
        nodes: [
          {
            id: "1",
          },
          {
            id: "2",
          }
        ],
        links: [
          {
            source: "1",
            target: "2"
          }
        ]
      })} />
    </div>
  );
}

export default App;
