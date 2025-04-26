# Smart Memory MCP VS Code Extension Installation Guide

This guide explains how to build and install the Smart Memory MCP VS Code extension locally.

## Prerequisites

- Node.js (v18 or later)
- npm (comes with Node.js)
- VS Code
- vsce (Visual Studio Code Extension Manager)

## Steps

1. Open a terminal and navigate to the extension directory:

```bash
cd smart-memory-mcp-v2/extension
```

2. Install dependencies:

```bash
npm install
```

3. Compile the TypeScript source code:

```bash
npm run compile
```

4. Package the extension into a `.vsix` file:

```bash
npx vsce package
```

This will create a file like `smart-memory-mcp-extension-0.1.0.vsix`.

5. Open VS Code.

6. Open the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).

7. Click on the ellipsis menu (three dots) in the top right corner.

8. Select **Install from VSIX...**

9. Browse to the `.vsix` file created in step 4 and select it.

10. The extension will be installed and ready to use.

## Optional

- To publish the extension to the VS Code Marketplace, you need a Personal Access Token (PAT) and use `vsce publish`.

## Configuration

The extension supports several configuration options accessible via VS Code settings:

- `smartMemory.serverAddress`: Address of the Smart Memory MCP server (default: `localhost:50051`)
- `smartMemory.autoOptimize`: Automatically optimize memory usage (default: `true`)
- `smartMemory.maxTokens`: Maximum number of tokens to use for context (default: `2000`)
- `smartMemory.customBinaryPath`: Custom path to the Smart Memory MCP server binary
- `smartMemory.customDataPath`: Custom path to the Smart Memory MCP data directory
- `smartMemory.autoStartServer`: Automatically start the Smart Memory MCP server when VS Code starts (default: `true`)
- `smartMemory.checkServerInterval`: Interval in milliseconds to check if the server is running (default: `30000`)

For more details, refer to the extension's `package.json` file.

---

If you need assistance with any step, please let me know.
