# Smart Memory MCP Server Management Architecture

This document describes the architecture of the server management system in the Smart Memory MCP extension.

## Overview

The server management system consists of several components:

1. **ServerDiscovery**: Responsible for finding and configuring the server binary
2. **ServerManager**: Responsible for starting, stopping, and monitoring the server
3. **SetupWizard**: Provides a user-friendly interface for setting up the server
4. **StatusBarManager**: Displays the server status in the VS Code status bar

These components work together to provide a seamless experience for managing the Smart Memory MCP server.

## ServerDiscovery

The `ServerDiscovery` class is responsible for:

- Finding the server binary
- Extracting the server binary if needed
- Configuring the MCP settings
- Managing the data directory

### Key Methods

- `getServerPath()`: Returns the path to the server binary
- `ensureServerBinary()`: Ensures the server binary exists and is executable
- `configureMcpSettings()`: Configures the MCP settings for VS Code and Claude desktop
- `getDataDirectory()`: Returns the path to the data directory
- `getConfigPath()`: Returns the path to the config file

### Platform Support

The `ServerDiscovery` class supports multiple platforms:

- Windows: Uses `.exe` extension for binaries
- macOS: Uses executable files without extension
- Linux: Uses executable files without extension

## ServerManager

The `ServerManager` class is responsible for:

- Starting the server
- Stopping the server
- Checking if the server is running
- Monitoring the server status

### Key Methods

- `startServer()`: Starts the server
- `stopServer()`: Stops the server
- `restartServer()`: Restarts the server
- `checkServerStatus()`: Checks if the server is running

### Process Management

The `ServerManager` class uses Node.js child processes to manage the server:

- `spawn()`: Creates a new process
- `kill()`: Terminates a process
- `on('exit')`: Handles process exit events
- `on('error')`: Handles process error events

## SetupWizard

The `SetupWizard` class provides a user-friendly interface for setting up the server. It guides the user through the following steps:

1. Finding or downloading the server binary
2. Configuring the data directory
3. Configuring MCP settings
4. Configuring auto-start
5. Starting the server

### Key Methods

- `run()`: Runs the setup wizard
- `ensureServerBinary()`: Ensures the server binary exists
- `configureDataDirectory()`: Configures the data directory
- `configureMcpSettings()`: Configures the MCP settings
- `configureAutoStart()`: Configures auto-start
- `startServer()`: Starts the server

## StatusBarManager

The `StatusBarManager` class displays the server status in the VS Code status bar. It shows:

- Whether the server is running
- Whether the server is stopped
- Whether there was an error starting or connecting to the server

### Key Methods

- `updateServerStatus()`: Updates the server status
- `updateMode()`: Updates the current mode
- `dispose()`: Disposes of the status bar item

## Configuration

The server management system uses the following configuration settings:

- `smartMemory.serverAddress`: The address of the server
- `smartMemory.autoStartServer`: Whether to auto-start the server
- `smartMemory.checkServerInterval`: How often to check if the server is running
- `smartMemory.customBinaryPath`: Path to a custom server binary
- `smartMemory.customDataPath`: Path to a custom data directory

These settings can be configured in the VS Code settings editor.

## Error Handling

The server management system includes robust error handling:

- Graceful handling of server crashes
- Retry mechanisms for server connections
- User-friendly error messages
- Detailed logging for troubleshooting

## Future Improvements

Potential future improvements to the server management system include:

- Support for remote servers
- Cluster mode for high availability
- Performance monitoring and metrics
- Automatic updates for server binaries
- Configuration validation and schema checking