import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { emit, listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api';
import util from 'util';
import { Payload } from '../src-tauri/bindings/Payload'

function App() {
  const [messages, setMessages] = useState<string[]>([]);
  useEffect(() => {
    const unlisten = listen<Payload>('pipewire_global', event => {
      setMessages(msgs => msgs.concat([event.payload.message]))
    })
    emit('frontend_ready', {})
    return () => {
      unlisten.then(f => f())
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
