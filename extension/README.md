# Smart Memory MCP VS Code Extension

This directory contains the VS Code extension for the Smart Memory MCP server. The extension connects to the MCP server and provides a user interface for interacting with the memory bank.

## Setup

1. Install Node.js and npm
2. Install the VS Code Extension CLI
   ```bash
   npm install -g @vscode/vsce
   ```
3. Initialize the extension
   ```bash
   cd extension
   npm init -y
   npm install --save vscode @types/vscode
   ```

## Extension Structure

The extension will have the following structure:

```
extension/
├── .vscode/            # VS Code settings
├── src/                # TypeScript source code
│   ├── extension.ts    # Extension entry point
│   ├── mcp-client.ts   # MCP client implementation
│   ├── commands.ts     # Command implementations
│   └── views/          # UI components
├── package.json        # Extension manifest
├── tsconfig.json       # TypeScript configuration
└── README.md           # Documentation
```

## Implementation Plan

1. Create a client for the MCP server using gRPC-Web
2. Implement VS Code commands for memory operations
3. Create a sidebar view for memory management
4. Add context menu items for storing code snippets
5. Implement status bar items for context information
6. Add settings for configuring the MCP server

## Features

- Store code snippets as memories
- Retrieve and insert memories into the editor
- Optimize memory usage
- View context for the current mode
- Switch between modes
- View memory usage metrics

## Integration with Memory Bank

The extension will integrate with the VS Code Memory Bank by:

1. Storing memories when the user updates the memory bank
2. Retrieving relevant context when switching modes
3. Optimizing memory usage to reduce token consumption
4. Providing analytics on memory usage

## Development

To start development:

```bash
cd extension
npm run watch
```

To package the extension:

```bash
cd extension
vsce package
```

## Testing

To test the extension:

1. Start the MCP server
   ```bash
   cd ../core
   cargo run
   ```
2. Launch the extension in debug mode from VS Code
3. Use the extension commands to interact with the server
