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
import logo from './logo.svg';
import './App.css';
import { emit, listen } from '@tauri-apps/api/event';
import { Payload } from '../src-tauri/bindings/Payload';

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    let isSubscribed = true;
    setMessages([]);
    const unlisten = listen<Payload>('pipewire_global', event => {
      if (isSubscribed) {
        setMessages(msgs => msgs.concat([event.payload.message]))
      }
    });
    (async () => {

      await unlisten; 
      emit('frontend_ready', {})
    })()
    return () => {
      isSubscribed = false;
      unlisten.then(f => { 
        return f()
      })
    }
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {messages.map(m => <p>{m}</p>)}
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
