import { createApi } from "@reduxjs/toolkit/query/react";
import { NodePayload } from "../src-tauri/bindings/NodePayload";
import { LinkPayload } from "../src-tauri/bindings/LinkPayload";
import { PortPayload } from "../src-tauri/bindings/PortPayload";
import { IdPayload } from "../src-tauri/bindings/IdPayload";
import { emit, listen } from "@tauri-apps/api/event";
import { MessagePayload } from "../src-tauri/bindings/MessagePayload";

export interface Removable {
  removed: boolean;
}

export type PipewireState = {
  debugMessages: string[];
  nodes: (NodePayload & Removable)[];
  links: (LinkPayload & Removable)[];
  ports: (PortPayload & Removable)[];
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
              data.nodes.push({
                ...event.payload,
                removed: false,
              });
            });
          }
        });
        const unlistenAddLink = listen<LinkPayload>("add_link", (event) => {
          if (isSubscribed) {
            updateCachedData((data) => {
              data.links.push({
                ...event.payload,
                removed: false,
              });
            });
          }
        });
        const unlistenAddPort = listen<PortPayload>("add_port", (event) => {
          if (isSubscribed) {
            updateCachedData((data) => {
              data.ports.push({
                ...event.payload,
                removed: false,
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
                    removed: true,
                  };
                }
                return node;
              });
              data.links = data.links.map((link) => {
                if (link.id === event.payload.id) {
                  return {
                    ...link,
                    removed: true,
                  };
                }
                return link;
              });
              data.ports = data.ports.map((port) => {
                if (port.id === event.payload.id) {
                  return {
                    ...port,
                    removed: true,
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
