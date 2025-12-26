import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  NodePayload,
  LinkPayload,
  PortPayload,
  IdPayload,
  MessagePayload,
  EventWrapper,
} from "fluxduct-rs";

// Extended types for frontend state management
interface Removable {
  exists: boolean;
}

export type Node = NodePayload & Removable & {
  type: "node";
};

export type Port = PortPayload & Removable & {
  type: "port";
  nodeSerial: number;
};

export type Link = LinkPayload & Removable & {
  type: "link";
  inputPortSerial: number;
  outputPortSerial: number;
  inputNodeSerial: number;
  outputNodeSerial: number;
};

export interface PipewireState {
  debugMessages: string[];
  nodes: Node[];
  ports: Port[];
  links: Link[];
}

export const pipewireApi = createApi({
  reducerPath: "pipewireApi",
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getPipewireState: builder.query<PipewireState, void>({
      queryFn: () => ({
        data: {
          debugMessages: [],
          nodes: [],
          ports: [],
          links: [],
        },
      }),
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        // Wait for initial cache data
        await cacheDataLoaded;

        // Set up event handler
        const handleEvent = (event: EventWrapper) => {
          try {
            const payload = JSON.parse(event.payload);
            
            switch (event.eventName) {
              case "debug_message": {
                const msg = payload as MessagePayload;
                updateCachedData((data) => {
                  data.debugMessages.push(msg.message);
                  // Keep only last 100 messages
                  if (data.debugMessages.length > 100) {
                    data.debugMessages.shift();
                  }
                });
                break;
              }

              case "add_node": {
                const node = payload as NodePayload;
                updateCachedData((data) => {
                  // Check if node already exists
                  const existing = data.nodes.find(
                    (n) => n.id === node.id && n.exists
                  );
                  if (existing) {
                    console.warn(`Node with id ${node.id} already exists`);
                    return;
                  }
                  data.nodes.push({
                    ...node,
                    type: "node",
                    exists: true,
                  });
                });
                break;
              }

              case "add_port": {
                const port = payload as PortPayload;
                updateCachedData((data) => {
                  // Check if port already exists
                  const existing = data.ports.find(
                    (p) => p.id === port.id && p.exists
                  );
                  if (existing) {
                    console.warn(`Port with id ${port.id} already exists`);
                    return;
                  }
                  // Find parent node to get its serial
                  const parentNode = data.nodes.find(
                    (n) => n.id === port.nodeId && n.exists
                  );
                  if (!parentNode) {
                    console.warn(`Parent node with id ${port.nodeId} not found for port ${port.id}`);
                    return;
                  }
                  data.ports.push({
                    ...port,
                    type: "port",
                    exists: true,
                    nodeSerial: parentNode.serial,
                  });
                });
                break;
              }

              case "add_link": {
                const link = payload as LinkPayload;
                updateCachedData((data) => {
                  // Find referenced ports and nodes
                  const inputPort = data.ports.find(
                    (p) => p.id === link.inputPortId && p.exists
                  );
                  const outputPort = data.ports.find(
                    (p) => p.id === link.outputPortId && p.exists
                  );
                  const inputNode = data.nodes.find(
                    (n) => n.id === link.inputNodeId && n.exists
                  );
                  const outputNode = data.nodes.find(
                    (n) => n.id === link.outputNodeId && n.exists
                  );

                  if (!inputPort) {
                    console.warn(`Input port ${link.inputPortId} not found`);
                    return;
                  }
                  if (!outputPort) {
                    console.warn(`Output port ${link.outputPortId} not found`);
                    return;
                  }
                  if (!inputNode) {
                    console.warn(`Input node ${link.inputNodeId} not found`);
                    return;
                  }
                  if (!outputNode) {
                    console.warn(`Output node ${link.outputNodeId} not found`);
                    return;
                  }

                  data.links.push({
                    ...link,
                    type: "link",
                    exists: true,
                    inputPortSerial: inputPort.serial,
                    outputPortSerial: outputPort.serial,
                    inputNodeSerial: inputNode.serial,
                    outputNodeSerial: outputNode.serial,
                  });
                });
                break;
              }

              case "remove_id": {
                const { id } = payload as IdPayload;
                updateCachedData((data) => {
                  // Soft-delete: mark as not existing
                  for (const node of data.nodes) {
                    if (node.id === id) {
                      node.exists = false;
                    }
                  }
                  for (const port of data.ports) {
                    if (port.id === id) {
                      port.exists = false;
                    }
                  }
                  for (const link of data.links) {
                    if (link.id === id) {
                      link.exists = false;
                    }
                  }
                });
                break;
              }
            }
          } catch (e) {
            console.error("Failed to handle event:", event, e);
          }
        };

        // Initialize PipeWire listener
        window.fluxduct?.init(handleEvent);

        // Wait for cache entry to be removed (cleanup)
        await cacheEntryRemoved;
        // Note: We can't really "uninit" the PipeWire listener currently
        // This would require adding an uninit function to the Rust side
      },
    }),
  }),
});

export const { useGetPipewireStateQuery } = pipewireApi;

