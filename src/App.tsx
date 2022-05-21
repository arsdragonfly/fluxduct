import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { emit, listen } from '@tauri-apps/api/event'
import util from 'util';

function App() {
  const [str, setStr] = useState("");
  useEffect(() => {
    const unlisten = listen('pipewire_global', event => {
      setStr(util.inspect(event.payload));
    })
    return () => {
      unlisten.then(f => f())
    }
  }, [])
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>{str}</p>
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
