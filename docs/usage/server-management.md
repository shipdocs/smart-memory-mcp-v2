# Smart Memory MCP Server Management

This document describes how to manage the Smart Memory MCP server using the VS Code extension.

## Server Management Commands

The Smart Memory MCP extension provides several commands for managing the server:

- **Smart Memory: Start Server** - Starts the Smart Memory MCP server
- **Smart Memory: Stop Server** - Stops the Smart Memory MCP server
- **Smart Memory: Restart Server** - Restarts the Smart Memory MCP server
- **Smart Memory: Run Setup** - Runs the setup wizard to configure the Smart Memory MCP server

## Setup Wizard

The Smart Memory MCP extension includes a setup wizard that guides you through the process of setting up the server. The wizard helps you:

1. Find or download the server binary
2. Configure the data directory
3. Configure MCP settings
4. Configure auto-start
5. Start the server

To run the setup wizard, use the **Smart Memory: Run Setup** command from the VS Code command palette.

## Server Configuration

The Smart Memory MCP server can be configured using the following settings:

- **Smart Memory: Server Address** - The address of the Smart Memory MCP server (default: `localhost:50051`)
- **Smart Memory: Auto Start Server** - Whether to automatically start the server when VS Code starts (default: `true`)
- **Smart Memory: Check Server Interval** - How often to check if the server is running, in milliseconds (default: `30000`)
- **Smart Memory: Custom Binary Path** - Path to a custom server binary
- **Smart Memory: Custom Data Path** - Path to a custom data directory

These settings can be configured in the VS Code settings editor.

## Server Status

The server status is displayed in the VS Code status bar. The status can be one of the following:

- **Smart Memory: Running** - The server is running
- **Smart Memory: Stopped** - The server is stopped
- **Smart Memory: Error** - There was an error starting or connecting to the server

Clicking on the status bar item will show a menu with options to start, stop, or restart the server.

## Troubleshooting

If you encounter issues with the server, try the following:

1. Check the VS Code output panel for error messages (View > Output, then select "Smart Memory MCP" from the dropdown)
2. Restart the server using the **Smart Memory: Restart Server** command
3. Run the setup wizard using the **Smart Memory: Run Setup** command
4. Check if the server binary exists and is executable
5. Check if the data directory exists and is writable
6. Check if the port is already in use by another process

## Advanced Configuration

For advanced configuration, you can edit the configuration file directly. The configuration file is located at:

- Windows: `%USERPROFILE%\.smart-memory\config.json`
- macOS: `$HOME/.smart-memory/config.json`
- Linux: `$HOME/.smart-memory/config.json`

The configuration file contains settings for the memory bank, server, and client.