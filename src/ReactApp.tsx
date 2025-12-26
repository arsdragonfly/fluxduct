// React components - Redux Provider and RTK Query, embeds Live via <Live>
import React, { useMemo } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { useGetPipewireStateQuery } from './store/pipewireApi';
import { Live } from '@use-gpu/react';
import { LiveApp } from './LiveApp';

// Inner component that uses RTK Query hook
function PipewireDataProvider() {
  const { data, isLoading, error } = useGetPipewireStateQuery();

  // Memoize filtered arrays - RTK Query + Immer maintains object identity
  // Stable serial IDs ensure React keys work correctly for list rendering
  const activeNodes = useMemo(
    () => data?.nodes.filter(n => n.exists) ?? [],
    [data?.nodes]
  );
  const activePorts = useMemo(
    () => data?.ports.filter(p => p.exists) ?? [],
    [data?.ports]
  );
  const activeLinks = useMemo(
    () => data?.links.filter(l => l.exists) ?? [],
    [data?.links]
  );

  // Memoize counts to avoid recalculation
  const nodeCount = activeNodes.length;
  const portCount = activePorts.length;
  const linkCount = activeLinks.length;

  const statusText = isLoading 
    ? "Connecting to PipeWire..." 
    : error 
      ? `Error: ${String(error)}` 
      : `Nodes: ${nodeCount} | Ports: ${portCount} | Links: ${linkCount}`;

  return (
    <Live>
      <LiveApp 
        pipewireState={data}
        isLoading={isLoading}
        statusText={statusText}
      />
    </Live>
  );
}

// Root React component with Redux Provider
export function ReactApp() {
  return (
    <Provider store={store}>
      <PipewireDataProvider />
    </Provider>
  );
}
