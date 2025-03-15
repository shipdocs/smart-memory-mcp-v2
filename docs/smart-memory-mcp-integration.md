# Smart Memory MCP Integration Plan

## Overview

This document outlines the integration steps for the Smart Memory MCP server with Roo Code. The integration follows the Model Context Protocol (MCP) standard for extending Roo Code's capabilities.

## Configuration Setup

### 1. MCP Server Configuration

Create/edit `~/.vscode/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "smart-memory": {
      "command": "${workspaceRoot}/core/target/release/smart-memory-mcp-core",
      "args": [],
      "env": {
        "RUST_LOG": "info",
        "DB_PATH": "${workspaceRoot}/.smart-memory/db",
        "CONFIG_PATH": "${workspaceRoot}/.smart-memory/config.json"
      },
      "alwaysAllow": [
        "HandleUmbCommand",
        "UpdateMemoryBank",
        "StoreMemory",
        "RetrieveMemory",
        "OptimizeMemory",
        "GetContext"
      ],
      "disabled": false,
      "timeout": 60
    }
  }
}
```

### 2. Directory Structure

Create required directories:
```bash
mkdir -p .smart-memory/db
```

### 3. Implementation Steps

1. **Proto File Configuration**
   - Use proto file at `proto/smart_memory.proto`
   - Update MCP client to use correct path and namespace

2. **Server Integration**
   - Build server binary with `cargo build --release`
   - Configure VS Code extension to find server
   - Set up automatic server discovery

3. **Extension Changes**
   - Update MCP client configuration
   - Implement proper error handling
   - Add server status monitoring

4. **Testing Steps**
   - Verify server auto-discovery
   - Test server connection
   - Validate UMB command functionality
   - Check Memory Bank operations

## Usage

1. **Server Start**
   ```bash
   # Start server manually (if needed)
   ./core/target/release/smart-memory-mcp-core
   ```

2. **VS Code Integration**
   - Use command palette: "Smart Memory: Start Server"
   - Or use auto-start feature (enabled by default)

3. **Memory Bank Operations**
   - Use UMB command (Ctrl+Shift+U / Cmd+Shift+U)
   - Use Memory Explorer view
   - Use context menu commands

## Implementation Plan

1. Update MCP client implementation:
   ```typescript
   // Update proto file path in mcp-client.ts
   this.protoPath = path.join(__dirname, '../../../proto/smart_memory.proto');

   // Update service namespace
   this.grpcService = protoDescriptor.smart_memory?.SmartMemoryMcp;
   ```

2. Update server discovery:
   - Implement proper server binary discovery
   - Add configuration management
   - Set up environment variables

3. Implement proper error handling and reconnection logic

## Next Steps

1. Switch to Code mode to implement the changes
2. Test the integration
3. Update documentation with any changes
