import { createApi } from '@reduxjs/toolkit/query/react'
import { NodePayload } from '../src-tauri/bindings/NodePayload'
import { LinkPayload } from '../src-tauri/bindings/LinkPayload'
import { PortPayload } from '../src-tauri/bindings/PortPayload'

export type PipewireState = 
{
    nodes: NodePayload[],
    links: LinkPayload[],
    ports: PortPayload[],
}

export const pipewireApi = createApi({
    reducerPath: 'pipewireApi',
    // a trivial baseQuery that returns nothing, because we're always doing streaming updates
    baseQuery: (() => async () => ({ data: {} }))(),
    endpoints: (builder) => ({
        getPipewireState: builder.query<PipewireState, void>({
            // a trivial queryFn that returns nothing, because we're always doing streaming updates
            queryFn: () => ({
                data: {
                    nodes: [],
                    links: [],
                    ports: []
                }
            })
            // TODO: add streaming update
        }),
    })
})

export const { useGetPipewireStateQuery } = pipewireApi