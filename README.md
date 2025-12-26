# Fluxduct

Fluxduct aims to be the best PipeWire patchbay.

## Architecture

### Stack

- **Electron** - Desktop app shell
- **Rust (napi-rs)** - Native PipeWire integration via `fluxduct-rs`
- **Redux Toolkit + RTK Query** - State management with streaming updates
- **Use.GPU (Live)** - WebGPU rendering for the force graph
- **React** - UI shell, Redux Provider, embeds Live via `@use-gpu/react`

### Data Flow

```
PipeWire ──► Rust (fluxduct-rs) ──► RTK Query streaming ──► Redux Store
                                                                 │
                                                                 ▼
                                              React (props: topology, metadata)
                                                                 │
                                                                 ▼
                                              Live (buffers: positions, velocities)
                                                                 │
                                                                 ▼
                                                            WebGPU Canvas
```

### Critical: Props vs Buffers

When rendering the force graph, we separate data by update frequency:

#### Memoized Props (React → Live)

Use props for **structural/topological data** that changes infrequently:

| Data | Why Props |
|------|-----------|
| Node count | Affects buffer allocation |
| Link topology (source→target indices) | Only changes when PipeWire objects add/remove |
| Node metadata (name, type, color) | Rarely changes, drives styling |
| Layout parameters (force strength) | User controls |

**Props changes trigger Live component re-renders and buffer reallocation.**

#### GPU Data Buffers (handles)

Use **typed arrays in GPU buffers** for **high-frequency position/velocity data**:

| Data | Why Buffers |
|------|-------------|
| Node positions `[x, y, x, y, ...]` | Updates every frame during simulation |
| Node velocities | Internal simulation state |
| Link line vertices | Computed per-frame from node positions |

**Buffer updates happen 60fps without triggering React/Live re-renders.**

#### Key Insight

- **Props = "what exists"** — topology changes trigger buffer reallocation
- **Buffers = "where it is"** — positions update every frame without React overhead

When a PipeWire node is added/removed:
→ RTK Query updates → props change → reallocate buffers

When simulation ticks:
→ write directly to buffers → GPU reads new positions → no re-render

## Build

Requires Node.js 22 and Rust. Make sure `$HOME/.cargo/bin` is in `PATH`.

```bash
# Build the Rust native module
cd fluxduct-rs
npm run build
cd ..

# Install dependencies and run
npm i
npm run start
```
