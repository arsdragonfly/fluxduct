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

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    let isSubscribed = true;
    setMessages([]);
    const unlistenDebugMessage = listen<MessagePayload>('debug_message', event => {
      if (isSubscribed) {
        setMessages(msgs => msgs.concat([util.inspect(event.payload)]))
      }
    });
    const unlistenAddNode = listen<NodePayload>('add_node', event => {
      if (isSubscribed) {
        setMessages(msgs => msgs.concat([util.inspect(event.payload)]))
      }
    });
    const unlistenAddLink = listen<LinkPayload>('add_link', event => {
      if (isSubscribed) {
        setMessages(msgs => msgs.concat([util.inspect(event.payload)]))
      }
    });
    const unlistenAddPort = listen<PortPayload>('add_port', event => {
      if (isSubscribed) {
        setMessages(msgs => msgs.concat([util.inspect(event.payload)]))
      }
    });
    (async () => {
      await unlistenDebugMessage;
      await unlistenAddNode; 
      await unlistenAddLink;
      await unlistenAddPort;
      emit('frontend_ready', {})
    })()
    return () => {
      isSubscribed = false;
      unlistenDebugMessage.then(f => {
        return f()
      })
      unlistenAddNode.then(f => { 
        return f()
      })
      unlistenAddLink.then(f => {
        return f()
      })
      unlistenAddPort.then(f => {
        return f()
      })
    }
  }, [])
  return (
    <div className="App">
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
      {messages.map(m => <p>{m}</p>)}
    </div>
  );
}

export default App;
