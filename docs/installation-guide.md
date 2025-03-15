# Smart Memory MCP Installation Guide

This guide provides step-by-step instructions for installing and setting up the Smart Memory MCP system on a new computer.

## Prerequisites

- **Operating System**: Linux, macOS, or Windows
- **Required Software**:
  - [VS Code](https://code.visualstudio.com/)
  - [Node.js](https://nodejs.org/) (v14 or later)
  - [Rust](https://www.rust-lang.org/tools/install) (for building from source)

## Installation Options

There are two ways to install Smart Memory MCP:

1. **VS Code Extension** (Recommended): Install the pre-built extension from the VS Code marketplace
2. **Build from Source**: Clone the repository and build the components yourself

## Option 1: VS Code Extension Installation

Since the extension is not yet available on the VS Code marketplace, you need to install it manually:

1. **Install the Extension**:
   - **Download the VSIX file**:
     - Download the extension VSIX file from the project repository or releases page
     - If you don't have the VSIX file, you'll need to build it from source (see Option 2 below)
   
   - **Install from VSIX**:
     - Open VS Code
     - Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X on macOS)
     - Click the "..." menu (top-right of Extensions view)
     - Select "Install from VSIX..."
     - Navigate to the downloaded VSIX file and select it

2. **First-Time Setup**:
   - After installation, the extension will automatically run a setup wizard
   - If it doesn't, run the command "Smart Memory: Run Setup Wizard" from the command palette (Ctrl+Shift+P or Cmd+Shift+P on macOS)
   - Follow the on-screen instructions to complete the setup

3. **Configure MCP Settings**:
   - The extension will create a configuration file at:
     - Windows: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
     - macOS: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
     - Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
   - Ensure the `smart-memory` server is enabled in this file

## Option 2: Build from Source

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-org/smart-memory-mcp.git
   cd smart-memory-mcp
   ```

2. **Run the Installation Script**:
   - On Linux/macOS:
     ```bash
     ./scripts/install.sh
     ```
   - On Windows:
     ```powershell
     .\scripts\install.ps1
     ```

3. **Build the Components**:
   ```bash
   # Build the core server
   cd core
   cargo build --release
   
   # Build the client
   cd ../client
   cargo build --release
   
   # Build the VS Code extension
   cd ../extension
   npm install
   npm run build
   ```

4. **Install the VS Code Extension**:
   ```bash
   cd extension
   vsce package
   code --install-extension smart-memory-mcp-*.vsix
   ```

## Project-Specific Configuration

For each project where you want to use Smart Memory MCP:

1. **Create a Configuration Directory**:
   ```bash
   mkdir -p .smart-memory
   ```

2. **Create a Configuration File**:
   Create a file at `.smart-memory/config.json` with the following content:
   ```json
   {
     "memory_bank": {
       "categories": {
         "context": { "max_tokens": 10000, "priority": "high" },
         "decision": { "max_tokens": 5000, "priority": "medium" },
         "progress": { "max_tokens": 8000, "priority": "high" },
         "product": { "max_tokens": 10000, "priority": "medium" },
         "pattern": { "max_tokens": 5000, "priority": "low" }
       },
       "update_triggers": {
         "auto_update": true,
         "umb_command": true
       },
       "token_budget": {
         "total": 50000,
         "per_category": true
       },
       "relevance": {
         "threshold": 0.7,
         "boost_recent": true
       }
     }
   }
   ```

## Using Smart Memory MCP

### Starting the Server

1. **Automatic Start**:
   - The server will start automatically when you open VS Code if auto-start is enabled
   - You can enable auto-start in VS Code settings under "Smart Memory > Auto Start Server"

2. **Manual Start**:
   - Open the command palette (Ctrl+Shift+P or Cmd+Shift+P on macOS)
   - Run the command "Smart Memory: Start Server"

### Using Memory Bank Features

1. **Update Memory Bank**:
   - Type `UMB` in a conversation with Roo to update the memory bank
   - This will store the current context in the memory bank

2. **Memory Explorer**:
   - Open the Memory Explorer view in VS Code to browse stored memories
   - Filter memories by category, date, or content

3. **Memory Metrics**:
   - View memory usage statistics in the Memory Metrics dashboard
   - Monitor token usage and optimize memory storage

### Troubleshooting

If you encounter issues:

1. **Server Not Starting**:
   - Check the VS Code output panel for "Smart Memory MCP" logs
   - Verify that the port (default: 50051) is not in use by another application
   - Try running "Smart Memory: Stop Server" and then "Smart Memory: Start Server"

2. **Port Already in Use**:
   - If you get an error that the port is already in use, try:
     - Running "Smart Memory: Stop Server" to stop any existing server
     - Restarting VS Code
     - If the issue persists, manually kill any process using port 50051

3. **Extension Not Working**:
   - Ensure the extension is properly installed and enabled
   - Check the VS Code extensions panel for any error messages
   - Try reinstalling the extension

## Advanced Configuration

### MCP Settings File

The MCP settings file (`cline_mcp_settings.json`) contains the configuration for the Smart Memory MCP server:

```json
{
  "mcpServers": {
    "smart-memory": {
      "command": "node",
      "args": ["/path/to/smart-memory-mcp/core/target/release/smart-memory-mcp-core"],
      "env": {
        "RUST_LOG": "info",
        "DB_PATH": "{workspace}/.smart-memory/memories.db",
        "CONFIG_PATH": "{workspace}/.smart-memory/config.json"
      },
      "disabled": false,
      "timeout": 60,
      "alwaysAllow": ["UMB"]
    }
  }
}
```

### Environment Variables

The Smart Memory MCP server supports the following environment variables:

- `RUST_LOG`: Log level (info, debug, trace)
- `DB_PATH`: Path to the database file
- `CONFIG_PATH`: Path to the configuration file
- `PORT`: Server port (default: 50051)
- `HOST`: Server host (default: 127.0.0.1)

## Uninstallation

To uninstall Smart Memory MCP:

1. **Uninstall the VS Code Extension**:
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X on macOS)
   - Find "Smart Memory MCP"
   - Click "Uninstall"

2. **Remove Configuration Files**:
   - Delete the `.smart-memory` directory in your project
   - Delete the global configuration directory:
     - Windows: `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`
     - macOS: `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
     - Linux: `~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`