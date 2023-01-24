import { createApi } from "@reduxjs/toolkit/query/react";
import { NodePayload } from "../src-tauri/bindings/NodePayload";
import { LinkPayload } from "../src-tauri/bindings/LinkPayload";
import { PortPayload } from "../src-tauri/bindings/PortPayload";
import { IdPayload } from "../src-tauri/bindings/IdPayload";
import { emit, listen } from "@tauri-apps/api/event";
import { MessagePayload } from "../src-tauri/bindings/MessagePayload";
import { prototype } from "events";

export interface Removable {
  exists: boolean;
}

export type Node = NodePayload &
  Removable & {
    type: "node";
  };

export type Link = LinkPayload &
  Removable & {
    type: "link";
    input_port_serial: number;
    output_port_serial: number;
    input_node_serial: number;
    output_node_serial: number;
  };

export type Port = PortPayload &
  Removable & {
    type: "port";
    node_serial: number;
  };

export type PipewireState = {
  debugMessages: string[];
  nodes: Node[];
  links: Link[];
  ports: Port[];
};

export const pipewireApi = createApi({
  reducerPath: "pipewireApi",
  // a trivial baseQuery that returns nothing, because we're always doing streaming updates
  baseQuery: (() => async () => ({ data: {} }))(),
  endpoints: (builder) => ({
    getPipewireState: builder.query<PipewireState, void>({
      // a trivial queryFn that returns nothing, because we're always doing streaming updates
      queryFn: () => ({
        data: {
          debugMessages: [],
          nodes: [],
          links: [],
          ports: [],
        },
      }),
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        // data need to be append-only so that memoizing deep copy works
        let isSubscribed = true;
        const unlistenDebugMessage = listen<MessagePayload>(
          "debug_message",
          (event) => {
            if (isSubscribed) {
              updateCachedData((data) => {
                data.debugMessages.push(event.payload.message);
              });
            }
          }
        );
        const unlistenAddNode = listen<NodePayload>("add_node", (event) => {
          if (isSubscribed) {
            updateCachedData((data) => {
              // there shouldn't be two non-removed nodes with the same id
              let node = data.nodes.find(
                (node) => node.id === event.payload.id && node.exists
              );
              if (node !== undefined) {
                console.error(
                  `node with id ${event.payload.id} already exists`
                );
                return;
              }
              data.nodes.push({
                ...event.payload,
                type: "node",
                exists: true,
              });
            });
          }
        });
        const unlistenAddLink = listen<LinkPayload>("add_link", (event) => {
          if (isSubscribed) {
            updateCachedData((data) => {
              let input_port = data.ports.find(
                  (port) =>
                    port.id === event.payload.input_port_id && port.exists
                ),
                output_port = data.ports.find(
                  (port) =>
                    port.id === event.payload.output_port_id && port.exists
                ),
                input_node = data.nodes.find(
                  (node) =>
                    node.id === event.payload.input_node_id && node.exists
                ),
                output_node = data.nodes.find(
                  (node) =>
                    node.id === event.payload.output_node_id && node.exists
                );
              if (input_port === undefined) {
                console.error(
                  `input port with id ${event.payload.input_port_id} does not exist`
                );
                return;
              }
              if (output_port === undefined) {
                console.error(
                  `output port with id ${event.payload.output_port_id} does not exist`
                );
                return;
              }
              if (input_node === undefined) {
                console.error(
                  `input node with id ${event.payload.input_node_id} does not exist`
                );
                return;
              }
              if (output_node === undefined) {
                console.error(
                  `output node with id ${event.payload.output_node_id} does not exist`
                );
                return;
              }
              data.links.push({
                ...event.payload,
                type: "link",
                exists: true,
                input_port_serial: input_port.serial,
                output_port_serial: output_port.serial,
                input_node_serial: input_node.serial,
                output_node_serial: output_node.serial,
              });
            });
          }
        });
        const unlistenAddPort = listen<PortPayload>("add_port", (event) => {
          if (isSubscribed) {
            updateCachedData((data) => {
              // there shouldn't be two non-removed ports with the same id
              let port = data.ports.find(
                (port) => port.id === event.payload.id && port.exists
              );
              if (port !== undefined) {
                console.error(
                  `port with id ${event.payload.id} already exists`
                );
                return;
              }
              let node_id = event.payload.node_id;
              let node = data.nodes.find(
                (node) => node.id === node_id && node.exists
              );
              if (node === undefined) {
                console.error(`node with id ${node_id} does not exist`);
                return;
              }
              data.ports.push({
                ...event.payload,
                type: "port",
                exists: true,
                node_serial: node.serial,
              });
            });
          }
        });
        const unlistenRemoveId = listen<IdPayload>("remove_id", (event) => {
          if (isSubscribed) {
            updateCachedData((data) => {
              data.nodes = data.nodes.map((node) => {
                if (node.id === event.payload.id) {
                  return {
                    ...node,
                    exists: false,
                  };
                }
                return node;
              });
              data.links = data.links.map((link) => {
                if (link.id === event.payload.id) {
                  return {
                    ...link,
                    exists: false,
                  };
                }
                return link;
              });
              data.ports = data.ports.map((port) => {
                if (port.id === event.payload.id) {
                  return {
                    ...port,
                    exists: false,
                  };
                }
                return port;
              });
            });
          }
        });
        await unlistenDebugMessage;
        await unlistenAddNode;
        await unlistenAddLink;
        await unlistenAddPort;
        await unlistenRemoveId;
        emit("frontend_ready", {});

        await cacheEntryRemoved;
        isSubscribed = false;
        unlistenDebugMessage.then((f) => {
          return f();
        });
        unlistenAddNode.then((f) => {
          return f();
        });
        unlistenAddLink.then((f) => {
          return f();
        });
        unlistenAddPort.then((f) => {
          return f();
        });
        unlistenRemoveId.then((f) => {
          return f();
        });
      },
    }),
  }),
});

export const { useGetPipewireStateQuery } = pipewireApi;
