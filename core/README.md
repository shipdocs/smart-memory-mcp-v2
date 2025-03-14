# Smart Memory MCP Core Server

This is the core server component of the Smart Memory MCP system, which provides intelligent memory management for VS Code Memory Bank.

## Features

- gRPC-based API for memory management
- Context optimization and tokenization
- Mode-aware memory retrieval
- Usage analytics and metrics

## Building

To build the server:

```bash
cargo build
```

For a release build:

```bash
cargo build --release
```

## Running

To run the server:

```bash
cargo run
```

The server will start on `[::1]:50051` by default.

## API

The server implements the following gRPC API:

### Memory Management
- `StoreMemory`: Store new memory content
- `RetrieveMemory`: Retrieve stored memory
- `OptimizeMemory`: Optimize memory to reduce token usage

### Context Operations
- `GetContext`: Get context for a specific mode
- `UpdateContext`: Update context for a mode
- `PredictContext`: Predict context based on user activity

### Mode Management
- `SwitchMode`: Handle mode switching
- `AnalyzeMode`: Analyze mode effectiveness

### Analytics
- `GetMetrics`: Get usage metrics
- `TrackUsage`: Track memory usage

## Development

The server is built using:
- Tokio for async runtime
- Tonic for gRPC
- Prost for Protocol Buffers
