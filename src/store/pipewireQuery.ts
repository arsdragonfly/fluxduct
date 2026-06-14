import type { QueryObserverOptions } from "@tanstack/query-core";
import { queryClient, useQuery } from "./query";
import type {
  NodePayload,
  LinkPayload,
  PortPayload,
  IdPayload,
  MessagePayload,
  EventWrapper,
} from "fluxduct-rs";

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

const initialPipewireState: PipewireState = {
  debugMessages: [],
  nodes: [],
  ports: [],
  links: [],
};

const pipewireStateQueryKey = ["pipewire-state"] as const;

let initialized = false;

const getPipewireState = () =>
  queryClient.getQueryData<PipewireState>(pipewireStateQueryKey) ?? initialPipewireState;

const setPipewireState = (updater: (state: PipewireState) => PipewireState) => {
  queryClient.setQueryData<PipewireState>(pipewireStateQueryKey, (state) =>
    updater(state ?? initialPipewireState)
  );
};

const handlePipewireEvent = (event: EventWrapper) => {
  try {
    const payload = JSON.parse(event.payload);

    switch (event.eventName) {
      case "debug_message": {
        const msg = payload as MessagePayload;
        setPipewireState((state) => ({
          ...state,
          debugMessages: [...state.debugMessages, msg.message].slice(-100),
        }));
        break;
      }

      case "add_node": {
        const node = payload as NodePayload;
        setPipewireState((state) => {
          const existing = state.nodes.find(
            (n) => n.id === node.id && n.exists
          );
          if (existing) {
            console.warn(`Node with id ${node.id} already exists`);
            return state;
          }

          return {
            ...state,
            nodes: [
              ...state.nodes,
              {
                ...node,
                type: "node",
                exists: true,
              },
            ],
          };
        });
        break;
      }

      case "add_port": {
        const port = payload as PortPayload;
        setPipewireState((state) => {
          const existing = state.ports.find(
            (p) => p.id === port.id && p.exists
          );
          if (existing) {
            console.warn(`Port with id ${port.id} already exists`);
            return state;
          }

          const parentNode = state.nodes.find(
            (n) => n.id === port.nodeId && n.exists
          );
          if (!parentNode) {
            console.warn(`Parent node with id ${port.nodeId} not found for port ${port.id}`);
            return state;
          }

          return {
            ...state,
            ports: [
              ...state.ports,
              {
                ...port,
                type: "port",
                exists: true,
                nodeSerial: parentNode.serial,
              },
            ],
          };
        });
        break;
      }

      case "add_link": {
        const link = payload as LinkPayload;
        setPipewireState((state) => {
          const inputPort = state.ports.find(
            (p) => p.id === link.inputPortId && p.exists
          );
          const outputPort = state.ports.find(
            (p) => p.id === link.outputPortId && p.exists
          );
          const inputNode = state.nodes.find(
            (n) => n.id === link.inputNodeId && n.exists
          );
          const outputNode = state.nodes.find(
            (n) => n.id === link.outputNodeId && n.exists
          );

          if (!inputPort) {
            console.warn(`Input port ${link.inputPortId} not found`);
            return state;
          }
          if (!outputPort) {
            console.warn(`Output port ${link.outputPortId} not found`);
            return state;
          }
          if (!inputNode) {
            console.warn(`Input node ${link.inputNodeId} not found`);
            return state;
          }
          if (!outputNode) {
            console.warn(`Output node ${link.outputNodeId} not found`);
            return state;
          }

          return {
            ...state,
            links: [
              ...state.links,
              {
                ...link,
                type: "link",
                exists: true,
                inputPortSerial: inputPort.serial,
                outputPortSerial: outputPort.serial,
                inputNodeSerial: inputNode.serial,
                outputNodeSerial: outputNode.serial,
              },
            ],
          };
        });
        break;
      }

      case "remove_id": {
        const { id } = payload as IdPayload;
        setPipewireState((state) => ({
          ...state,
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, exists: false } : node
          ),
          ports: state.ports.map((port) =>
            port.id === id ? { ...port, exists: false } : port
          ),
          links: state.links.map((link) =>
            link.id === id ? { ...link, exists: false } : link
          ),
        }));
        break;
      }
    }
  } catch (e) {
    console.error("Failed to handle event:", event, e);
  }
};

const initPipewireListener = () => {
  if (initialized) {
    return;
  }

  window.fluxduct?.init(handlePipewireEvent);
  initialized = true;
};

const pipewireStateQueryOptions: QueryObserverOptions<
  PipewireState,
  Error,
  PipewireState,
  PipewireState,
  typeof pipewireStateQueryKey
> = {
  queryKey: pipewireStateQueryKey,
  queryFn: async () => {
    initPipewireListener();
    return getPipewireState();
  },
  staleTime: Infinity,
};

interface PipewireStateQueryResult {
  data: PipewireState;
  isLoading: boolean;
  error: Error | null;
}

export function useGetPipewireStateQuery(): PipewireStateQueryResult {
  const queryResult = useQuery<
    PipewireState,
    Error,
    PipewireState,
    PipewireState,
    typeof pipewireStateQueryKey
  >(pipewireStateQueryOptions);

  return {
    ...queryResult,
    data: queryResult.data ?? initialPipewireState,
  };
}